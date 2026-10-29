-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "ImportEntityType" AS ENUM ('CAMPGROUND', 'CLIMBING_AREA');

-- CreateEnum
CREATE TYPE "ImportRunStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportCandidateStatus" AS ENUM ('PENDING', 'ACCEPTED', 'LINKED', 'IGNORED', 'NEEDS_RESEARCH');

-- CreateEnum
CREATE TYPE "ImportSyncStatus" AS ENUM ('NEW', 'UNCHANGED', 'CHANGED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "SourceSyncProfileStatus" AS ENUM ('IDLE', 'RUNNING', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    CONSTRAINT "Authenticator_pkey" PRIMARY KEY ("userId","credentialID")
);

-- CreateTable
CREATE TABLE "DestinationHub" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "seasonNotes" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationHub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "docsUrl" TEXT,
    "termsUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceSyncProfile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runner" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "params" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "refreshIntervalDays" INTEGER NOT NULL DEFAULT 60,
    "status" "SourceSyncProfileStatus" NOT NULL DEFAULT 'IDLE',
    "lastStartedAt" TIMESTAMP(3),
    "lastFinishedAt" TIMESTAMP(3),
    "lastDurationMs" INTEGER,
    "lastFetchedCount" INTEGER,
    "lastCandidateCount" INTEGER,
    "lastSkippedCount" INTEGER,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourceSyncProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "status" "ImportRunStatus" NOT NULL DEFAULT 'RUNNING',
    "params" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "fetchedCount" INTEGER NOT NULL DEFAULT 0,
    "candidateCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportCandidate" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "importRunId" TEXT,
    "entityType" "ImportEntityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "region" TEXT,
    "sourceUrl" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "rawPayload" JSONB NOT NULL,
    "mappedPayload" JSONB NOT NULL,
    "previousRawPayload" JSONB,
    "previousMappedPayload" JSONB,
    "syncStatus" "ImportSyncStatus" NOT NULL DEFAULT 'NEW',
    "syncChangedFields" JSONB,
    "syncReason" TEXT,
    "syncDecisionMethod" TEXT,
    "syncConfidence" DOUBLE PRECISION,
    "lastSyncedAt" TIMESTAMP(3),
    "status" "ImportCandidateStatus" NOT NULL DEFAULT 'PENDING',
    "matchedCampgroundId" TEXT,
    "matchedAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalReference" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "entityType" "ImportEntityType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "campgroundId" TEXT,
    "climbingAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimbingArea" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "bestFor" TEXT NOT NULL,
    "approach" TEXT NOT NULL,
    "approachMinutes" INTEGER,
    "parking" TEXT NOT NULL,
    "roadDifficulty" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'curated',
    "reviewStatus" TEXT NOT NULL DEFAULT 'reviewed',
    "lastReviewedAt" TIMESTAMP(3),
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "parentAreaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimbingArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campground" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "amenities" TEXT NOT NULL,
    "campingFit" TEXT NOT NULL,
    "reservationUrl" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'curated',
    "reviewStatus" TEXT NOT NULL DEFAULT 'reviewed',
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campground_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaCampgroundLink" (
    "id" TEXT NOT NULL,
    "climbingAreaId" TEXT NOT NULL,
    "campgroundId" TEXT NOT NULL,
    "miles" DOUBLE PRECISION NOT NULL,
    "driveMinutes" INTEGER NOT NULL,
    "logisticsNote" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "sourceType" TEXT NOT NULL DEFAULT 'curated',
    "reviewStatus" TEXT NOT NULL DEFAULT 'reviewed',
    "lastReviewedAt" TIMESTAMP(3),

    CONSTRAINT "AreaCampgroundLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HubClimbingArea" (
    "hubId" TEXT NOT NULL,
    "climbingAreaId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HubClimbingArea_pkey" PRIMARY KEY ("hubId","climbingAreaId")
);

-- CreateTable
CREATE TABLE "HubCampground" (
    "hubId" TEXT NOT NULL,
    "campgroundId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "HubCampground_pkey" PRIMARY KEY ("hubId","campgroundId")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripStop" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "climbingAreaId" TEXT NOT NULL,
    "selectedCampgroundId" TEXT,
    "order" INTEGER NOT NULL,
    "notes" TEXT,
    "plannedDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "DestinationHub_slug_key" ON "DestinationHub"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_key_key" ON "DataSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SourceSyncProfile_key_key" ON "SourceSyncProfile"("key");

-- CreateIndex
CREATE INDEX "SourceSyncProfile_enabled_status_lastFinishedAt_idx" ON "SourceSyncProfile"("enabled", "status", "lastFinishedAt");

-- CreateIndex
CREATE INDEX "ImportRun_sourceId_idx" ON "ImportRun"("sourceId");

-- CreateIndex
CREATE INDEX "ImportRun_entityType_idx" ON "ImportRun"("entityType");

-- CreateIndex
CREATE INDEX "ImportRun_status_idx" ON "ImportRun"("status");

-- CreateIndex
CREATE INDEX "ImportCandidate_importRunId_idx" ON "ImportCandidate"("importRunId");

-- CreateIndex
CREATE INDEX "ImportCandidate_entityType_idx" ON "ImportCandidate"("entityType");

-- CreateIndex
CREATE INDEX "ImportCandidate_status_idx" ON "ImportCandidate"("status");

-- CreateIndex
CREATE INDEX "ImportCandidate_matchedCampgroundId_idx" ON "ImportCandidate"("matchedCampgroundId");

-- CreateIndex
CREATE INDEX "ImportCandidate_matchedAreaId_idx" ON "ImportCandidate"("matchedAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "ImportCandidate_sourceId_entityType_externalId_key" ON "ImportCandidate"("sourceId", "entityType", "externalId");

-- CreateIndex
CREATE INDEX "ExternalReference_campgroundId_idx" ON "ExternalReference"("campgroundId");

-- CreateIndex
CREATE INDEX "ExternalReference_climbingAreaId_idx" ON "ExternalReference"("climbingAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalReference_sourceId_entityType_externalId_key" ON "ExternalReference"("sourceId", "entityType", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "ClimbingArea_slug_key" ON "ClimbingArea"("slug");

-- CreateIndex
CREATE INDEX "ClimbingArea_parentAreaId_idx" ON "ClimbingArea"("parentAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "Campground_slug_key" ON "Campground"("slug");

-- CreateIndex
CREATE INDEX "AreaCampgroundLink_campgroundId_idx" ON "AreaCampgroundLink"("campgroundId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaCampgroundLink_climbingAreaId_campgroundId_key" ON "AreaCampgroundLink"("climbingAreaId", "campgroundId");

-- CreateIndex
CREATE INDEX "HubClimbingArea_climbingAreaId_idx" ON "HubClimbingArea"("climbingAreaId");

-- CreateIndex
CREATE INDEX "HubCampground_campgroundId_idx" ON "HubCampground"("campgroundId");

-- CreateIndex
CREATE INDEX "Trip_userId_idx" ON "Trip"("userId");

-- CreateIndex
CREATE INDEX "TripStop_tripId_idx" ON "TripStop"("tripId");

-- CreateIndex
CREATE INDEX "TripStop_climbingAreaId_idx" ON "TripStop"("climbingAreaId");

-- CreateIndex
CREATE INDEX "TripStop_selectedCampgroundId_idx" ON "TripStop"("selectedCampgroundId");

-- CreateIndex
CREATE INDEX "Feedback_status_createdAt_idx" ON "Feedback"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_userId_createdAt_idx" ON "Feedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Authenticator" ADD CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCandidate" ADD CONSTRAINT "ImportCandidate_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCandidate" ADD CONSTRAINT "ImportCandidate_importRunId_fkey" FOREIGN KEY ("importRunId") REFERENCES "ImportRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCandidate" ADD CONSTRAINT "ImportCandidate_matchedCampgroundId_fkey" FOREIGN KEY ("matchedCampgroundId") REFERENCES "Campground"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportCandidate" ADD CONSTRAINT "ImportCandidate_matchedAreaId_fkey" FOREIGN KEY ("matchedAreaId") REFERENCES "ClimbingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_campgroundId_fkey" FOREIGN KEY ("campgroundId") REFERENCES "Campground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReference" ADD CONSTRAINT "ExternalReference_climbingAreaId_fkey" FOREIGN KEY ("climbingAreaId") REFERENCES "ClimbingArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClimbingArea" ADD CONSTRAINT "ClimbingArea_parentAreaId_fkey" FOREIGN KEY ("parentAreaId") REFERENCES "ClimbingArea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaCampgroundLink" ADD CONSTRAINT "AreaCampgroundLink_climbingAreaId_fkey" FOREIGN KEY ("climbingAreaId") REFERENCES "ClimbingArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AreaCampgroundLink" ADD CONSTRAINT "AreaCampgroundLink_campgroundId_fkey" FOREIGN KEY ("campgroundId") REFERENCES "Campground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubClimbingArea" ADD CONSTRAINT "HubClimbingArea_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "DestinationHub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubClimbingArea" ADD CONSTRAINT "HubClimbingArea_climbingAreaId_fkey" FOREIGN KEY ("climbingAreaId") REFERENCES "ClimbingArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubCampground" ADD CONSTRAINT "HubCampground_hubId_fkey" FOREIGN KEY ("hubId") REFERENCES "DestinationHub"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubCampground" ADD CONSTRAINT "HubCampground_campgroundId_fkey" FOREIGN KEY ("campgroundId") REFERENCES "Campground"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_climbingAreaId_fkey" FOREIGN KEY ("climbingAreaId") REFERENCES "ClimbingArea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_selectedCampgroundId_fkey" FOREIGN KEY ("selectedCampgroundId") REFERENCES "Campground"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


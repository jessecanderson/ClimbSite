# Database changes

Use `pnpm db:migrate` for deployment and `pnpm db:migrate:dev --name description`
against a development database when creating a change. Commit the generated SQL.
The Prisma CLI reads DATABASE_URL (or DIRECT_DATABASE_URL for migrations) from the
shell. Load the intended environment explicitly; never point development migrations
at production. Next.js loads .env.local independently.

## Existing installations: baseline once

The `0_init` migration represents the schema already installed before October 29,
including Feedback. Do not execute its CREATE statements against an existing database.

1. Take a database backup/snapshot and confirm it can be restored.
2. Confirm Feedback exists. Older installations must first apply the legacy additive
   `prisma/add-feedback.sql` once, as described in the previous README instructions.
3. With the target environment loaded, compare the baseline to the database:
   `pnpm exec prisma migrate diff --from-config-datasource --to-migrations prisma/migrations --script`
   (requires a development shadow database if Prisma requests one). Review all differences;
   the only intended new object is AuthRateLimit. Investigate other drift before proceeding.
4. Mark the existing schema applied: `pnpm exec prisma migrate resolve --applied 0_init`.
5. Run `pnpm db:migrate` to install subsequent additive migrations, before deploying code.
6. Check `pnpm exec prisma migrate status`.

For a new empty database, simply run `pnpm db:migrate` then `pnpm db:seed`.
CI tests this complete path against disposable PostgreSQL on every run.

Production migrations are a separate release step, never an automatic application
startup action. A code rollback does not reverse data changes; prefer additive schema
changes compatible with the preceding app version. Test backup restoration separately.

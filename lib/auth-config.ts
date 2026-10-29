export function authAvailability(env: NodeJS.ProcessEnv = process.env) {
  const magicLinkEnabled = Boolean(env.AUTH_RESEND_KEY && env.AUTH_EMAIL_FROM);
  const emailFallbackEnabled = env.NODE_ENV === "development" && env.AUTH_EMAIL_FALLBACK === "true";
  const googleEnabled = Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET);
  const appleEnabled = Boolean(env.AUTH_APPLE_ID && env.AUTH_APPLE_SECRET);
  return { magicLinkEnabled, emailFallbackEnabled, googleEnabled, appleEnabled,
    emailEnabled: magicLinkEnabled || emailFallbackEnabled,
    hasProvider: magicLinkEnabled || emailFallbackEnabled || googleEnabled || appleEnabled };
}

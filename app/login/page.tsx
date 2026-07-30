import { Mail, ShieldCheck } from "lucide-react";
import { loginAction, oauthLoginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function safeCallbackUrl(value?: string) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/trips";
}

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeCallbackUrl(callbackUrl);
  const magicLinkEnabled = Boolean(process.env.AUTH_RESEND_KEY && process.env.AUTH_EMAIL_FROM);
  const emailFallbackEnabled =
    process.env.AUTH_EMAIL_FALLBACK === "true" ||
    (process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_FALLBACK !== "false");
  const emailEnabled = magicLinkEnabled || emailFallbackEnabled;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
  const appleEnabled = Boolean(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET);
  const hasProvider = emailEnabled || googleEnabled || appleEnabled;

  if (user) {
    redirect(redirectTo);
  }

  return (
    <main className="page">
      <section className="two-col">
        <div>
          <p className="eyebrow">Saved Trips</p>
          <h1>Sign in to ClimbSite.</h1>
          <p className="lead">
            Use a secure sign-in method to save trips, reopen old plans, and keep the account ready
            for future subscription billing.
          </p>
        </div>
        <div className="card auth-card">
          {error === "OAuthAccountNotLinked" ? (
            <p className="form-message form-message-error" role="alert">
              This email already uses a different sign-in method. Use the method you originally
              chose; secure account linking is not available yet.
            </p>
          ) : error ? (
            <p className="form-message form-message-error" role="alert">
              Sign-in could not be completed. Please try again.
            </p>
          ) : null}
          {emailEnabled ? (
            <form className="form" action={loginAction}>
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <label className="field">
                <span>Email</span>
                <input className="input" required type="email" name="email" placeholder="you@example.com" />
              </label>
              <button className="button" type="submit">
                <Mail size={17} />
                {magicLinkEnabled ? "Email me a sign-in link" : "Continue with email"}
              </button>
            </form>
          ) : null}

          {googleEnabled ? (
            <form action={oauthLoginAction}>
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button className="ghost-button" type="submit">
                <ShieldCheck size={17} />
                Continue with Google
              </button>
            </form>
          ) : null}

          {appleEnabled ? (
            <form action={oauthLoginAction}>
              <input type="hidden" name="provider" value="apple" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <button className="ghost-button" type="submit">
                <ShieldCheck size={17} />
                Continue with Apple
              </button>
            </form>
          ) : null}

          {!hasProvider ? (
            <div className="empty">
              Configure `AUTH_RESEND_KEY` and `AUTH_EMAIL_FROM`, or add Google/Apple auth
              credentials, to enable sign in.
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

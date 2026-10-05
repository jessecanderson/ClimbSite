import { LoginPanel } from "@/components/LoginRecovery";
import { SubmitButton } from "@/components/SubmitButton";
import { safeLocalPath } from "@/lib/navigation";
import { Mail, ShieldCheck } from "lucide-react";
import { loginAction, oauthLoginAction } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";


export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  const { callbackUrl, error } = await searchParams;
  const redirectTo = safeLocalPath(callbackUrl);
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
            Save your trips, reopen your plans, and keep your climbing and camping notes together.
          </p>
        </div>
        <LoginPanel returnTo={redirectTo}>
          {error === "OAuthAccountNotLinked" ? (
            <p className="form-message form-message-error" role="alert">
              This email already uses a different sign-in method. Use the method you originally
              chose; secure account linking is not available yet.
            </p>
          ) : error === "Verification" ? (
            <p className="form-message form-message-error" role="alert">That sign-in link has expired or was already used. Request a new link below; your planning destination is preserved.</p>
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
              <SubmitButton pendingLabel={magicLinkEnabled ? "Sending link…" : "Signing in…"}>
                <Mail size={17} />
                {magicLinkEnabled ? "Email me a sign-in link" : "Continue with email"}
              </SubmitButton>
            </form>
          ) : null}

          {googleEnabled ? (
            <form action={oauthLoginAction}>
              <input type="hidden" name="provider" value="google" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <SubmitButton className="ghost-button" pendingLabel="Opening sign-in…">
                <ShieldCheck size={17} />
                Continue with Google
              </SubmitButton>
            </form>
          ) : null}

          {appleEnabled ? (
            <form action={oauthLoginAction}>
              <input type="hidden" name="provider" value="apple" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <SubmitButton className="ghost-button" pendingLabel="Opening sign-in…">
                <ShieldCheck size={17} />
                Continue with Apple
              </SubmitButton>
            </form>
          ) : null}

          {!hasProvider ? (
            <div className="empty">
              Sign-in is temporarily unavailable. Please try again later. You can still browse destinations and compare camping.
            </div>
          ) : null}
        </LoginPanel>
      </section>
    </main>
  );
}

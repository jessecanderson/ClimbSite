"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeLocalPath } from "@/lib/navigation";
import { authAvailability } from "@/lib/auth-config";
const emailSchema = z.string().trim().toLowerCase().email();
const authProviderSchema = z.enum(["google", "apple"]);
export async function loginAction(formData: FormData) {
  const email = emailSchema.parse(formData.get("email"));
  const redirectTo = safeLocalPath(formData.get("redirectTo"));
  const { magicLinkEnabled, emailFallbackEnabled } = authAvailability();

  if (!magicLinkEnabled && !emailFallbackEnabled) {
    redirect("/login");
  }

  const provider =
    magicLinkEnabled ? "resend" : "email-fallback";

  await signIn(provider, { email, redirectTo });
}

export async function oauthLoginAction(formData: FormData) {
  const provider = authProviderSchema.parse(formData.get("provider"));
  const redirectTo = safeLocalPath(formData.get("redirectTo"));
  await signIn(provider, { redirectTo });
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}


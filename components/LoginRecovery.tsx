"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { loginPath, safeLocalPath } from "@/lib/navigation";

const storageKey = "climbsite-login-return";

export function LoginPanel({ returnTo, children }: { returnTo: string; children: ReactNode }) {
  return <div className="card auth-card" onSubmitCapture={() => {
    try { sessionStorage.setItem(storageKey, JSON.stringify({ path: safeLocalPath(returnTo), at: Date.now() })); } catch { /* Sign-in still works when browser storage is unavailable. */ }
  }}>{children}</div>;
}

export function CheckEmailReturnLink() {
  const [returnTo, setReturnTo] = useState("/trips");
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "null");
      if (saved && typeof saved.at === "number" && Date.now() - saved.at < 30 * 60_000) setReturnTo(safeLocalPath(saved.path));
    } catch { /* Use the trips page if no recent planning intent was saved. */ }
  }, []);
  return <Link className="ghost-button" href={loginPath(returnTo)}>Request another sign-in link</Link>;
}

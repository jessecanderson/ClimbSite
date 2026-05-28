import type { Metadata } from "next";
import Link from "next/link";
import { Compass, LogOut, Map, Mountain, Route, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClimbSite",
  description: "Plan climbing road trips around crags, camping, approaches, and drive logistics."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        <div className="shell">
          <nav className="nav">
            <Link className="brand" href="/">
              <span className="brand-mark">
                <Mountain size={20} />
              </span>
              <span>ClimbSite</span>
            </Link>
            <div className="nav-links">
              <Link className="nav-link" href="/hubs">
                <Compass size={17} />
                Hubs
              </Link>
              <Link className="nav-link" href="/areas">
                <Map size={17} />
                Areas
              </Link>
              <Link className="nav-link" href="/trips">
                <Route size={17} />
                Trips
              </Link>
              {user ? (
                <form action={logoutAction}>
                  <button className="ghost-button" type="submit" title={user.email}>
                    <LogOut size={17} />
                    Sign out
                  </button>
                </form>
              ) : (
                <Link className="button" href="/login">
                  <User size={17} />
                  Sign in
                </Link>
              )}
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}

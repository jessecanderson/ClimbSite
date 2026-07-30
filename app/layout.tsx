import type { Metadata } from "next";
import Link from "next/link";
import { CircleUser, Compass, Database, ExternalLink, LogOut, Mail, Mountain, Route, User } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClimbSite",
  description: "Plan climbing road trips around crags, camping, approaches, and drive logistics."
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  const currentYear = new Date().getFullYear();

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
                Explore
              </Link>
              <Link className="nav-link" href="/trips">
                <Route size={17} />
                My Trips
              </Link>
              {user ? (
                <>
                  {user.role === "ADMIN" ? (
                    <Link className="nav-link" href="/admin/content">
                      <Database size={17} />
                      Admin
                    </Link>
                  ) : null}
                  <Link className="nav-link" href="/account" title={user.email ?? "Account"}>
                    <CircleUser size={17} />
                    Account
                  </Link>
                  <form action={logoutAction}>
                    <button className="ghost-button" type="submit" title={user.email ?? "Sign out"}>
                      <LogOut size={17} />
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link className="button" href="/login">
                  <User size={17} />
                  Sign in
                </Link>
              )}
            </div>
          </nav>
          {children}
          <footer className="site-footer">
            <div className="footer-grid">
              <div>
                <Link className="brand footer-brand" href="/">
                  <span className="brand-mark">
                    <Mountain size={20} />
                  </span>
                  <span>ClimbSite</span>
                </Link>
                <p>
                  ClimbSite is a project by{" "}
                  <span className="inline-company">
                    <span className="michi-mark" aria-hidden="true">
                      道
                    </span>
                    Michi Works
                  </span>
                  , a small software studio focused on tools that support exploration, learning,
                  and adventure. Route, access, permit, closure, and booking details should be
                  verified with the linked sources.
                </p>
              </div>

              <div>
                <h3>Contact</h3>
                <a className="footer-link" href="mailto:hello@climbsite.app">
                  <Mail size={16} />
                  hello@climbsite.app
                </a>
              </div>

              <div>
                <h3>Data Credit</h3>
                <a className="footer-link" href="https://ridb.recreation.gov/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} />
                  ridb.recreation.gov
                </a>
                <a className="footer-link" href="https://openbeta.io/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} />
                  openbeta.io
                </a>
                <a className="footer-link" href="https://www.nps.gov/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={16} />
                  National Park Service
                </a>
              </div>
            </div>
            <div className="footer-bottom">
              <span className="footer-company">
                <span className="michi-mark" aria-hidden="true">
                  道
                </span>
                &copy; {currentYear} Michi Works. All rights reserved.
              </span>
              <span>Planning summaries only; source sites remain the authority.</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

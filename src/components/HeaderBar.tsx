"use client";

import { SITE_SUBTITLE, SITE_TITLE } from "@/constants/site";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "../features/auth/ui/UserMenu";
import { ActivityFeed } from "../features/activity/ui/ActivityFeed";

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`relative rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-un-blue/8 text-un-blue"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {children}
    </Link>
  );
}

interface Props {
  user?: { email: string; entity?: string | null } | null;
  isAdmin?: boolean;
  userRole?: string | null;
  children?: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
}

export function Header({
  user,
  isAdmin,
  userRole,
  children,
  maxWidth = "7xl",
}: Props) {
  const pathname = usePathname();
  const isLoggedIn = !!user;
  const isLoginPage = pathname === "/login";
  const isAdminMilestonePage =
    pathname?.startsWith("/milestones") &&
    !pathname?.startsWith("/milestones/public");
  const widthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-7xl";

  return (
    <header className="border-b border-gray-200 bg-white px-6 [border-top:3px_solid_#009edb]">
      <div
        className={`mx-auto flex ${widthClass} items-center justify-between py-3`}
      >
        <Link
          href="/actions"
          className="flex items-center gap-3 hover:opacity-90"
        >
          <Image
            src="/images/un-logo-stacked-colour-english.svg"
            alt="UN Logo"
            width={50}
            height={50}
            priority
            className="h-11 w-auto select-none"
            draggable={false}
          />
          <div>
            <h1 className="text-[15px] font-bold tracking-tight text-gray-900">
              {SITE_TITLE}
            </h1>
            <p className="text-[11px] font-medium tracking-wider text-gray-400 uppercase">
              {SITE_SUBTITLE}
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <nav className="flex items-center gap-1">
                {isAdmin && (
                  <NavLink href="/milestones" active={isAdminMilestonePage}>
                    Milestones
                  </NavLink>
                )}
                <NavLink href="/actions" active={pathname === "/actions"}>
                  Actions
                </NavLink>
              </nav>
              <div className="h-5 w-px bg-gray-200" />
              <ActivityFeed />
              <UserMenu
                email={user.email}
                entity={user.entity}
                isAdmin={isAdmin}
                userRole={userRole}
              />
            </>
          ) : !isLoginPage ? (
            <Link
              href="/login"
              className="rounded-lg bg-un-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-un-blue/90"
            >
              Sign In
            </Link>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}

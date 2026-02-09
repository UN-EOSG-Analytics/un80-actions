"use client";

import { SITE_SUBTITLE, SITE_TITLE } from "@/constants/site";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "../features/auth/ui/UserMenu";
import { ActivityFeed } from "../features/activity/ui/ActivityFeed";

interface Props {
  user?: { email: string; entity?: string | null } | null;
  isAdmin?: boolean;
  children?: React.ReactNode;
  maxWidth?: "6xl" | "7xl";
}

export function Header({ user, isAdmin, children, maxWidth = "7xl" }: Props) {
  const pathname = usePathname();
  const isLoggedIn = !!user;
  const isLoginPage = pathname === "/login";
  const isMilestonePage = pathname?.startsWith("/milestones");
  const widthClass = maxWidth === "6xl" ? "max-w-6xl" : "max-w-7xl";

  return (
    <header className="border-b border-gray-200 bg-white px-6">
      <div
        className={`mx-auto flex ${widthClass} items-center justify-between py-4`}
      >
        <Link href="/" className="flex items-center gap-3 hover:opacity-90">
          <Image
            src="/images/un-logo-stacked-colour-english.svg"
            alt="UN Logo"
            width={50}
            height={50}
            priority
            className="h-12 w-auto select-none"
            draggable={false}
          />
          <div>
            <h1 className="text-xl font-bold text-gray-900">{SITE_TITLE}</h1>
            <p className="text-xs text-gray-500">{SITE_SUBTITLE}</p>
          </div>
        </Link>
        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              {isAdmin && (
                <Link
                  href="/milestones"
                  className={`text-sm font-medium transition-colors ${
                    isMilestonePage
                      ? "text-un-blue"
                      : "text-gray-600 hover:text-un-blue"
                  }`}
                >
                  Milestones
                </Link>
              )}
              <ActivityFeed />
              <UserMenu email={user.email} entity={user.entity} isAdmin={isAdmin} />
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

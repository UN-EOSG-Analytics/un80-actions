"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import lastUpdatedData from "../../public/data/last-updated.json";

interface HeaderProps {
  onReset?: () => void;
  showLogin?: boolean;
}

// https://www.un.org/dgacm/en/content/editorial-manual/numbers-dates-time#dates
function formatLastUpdated(iso: string): string {
  try {
    const d = new Date(iso);
    const formatted = d.toLocaleString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });

    // Get timezone abbreviation separately
    const tzName = d
      .toLocaleString("en-US", {
        timeZone: "America/New_York",
        timeZoneName: "short",
      })
      .split(" ")
      .pop();

    // Convert AM/PM to lowercase a.m./p.m. per UN style
    return (
      formatted.replace(/\sAM/, " a.m.").replace(/\sPM/, " p.m.") + ` ${tzName}`
    );
  } catch {
    return "";
  }
}

export function Header({ onReset }: HeaderProps) {
  const router = useRouter();

  // Imported at build time - no flash/delay
  const lastUpdated = lastUpdatedData.lastUpdated
    ? formatLastUpdated(lastUpdatedData.lastUpdated)
    : null;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onReset) {
      onReset();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    router.push("/");
  };

  return (
    <>
      <header className="w-full border-b bg-background">
        <div className="mx-auto w-full max-w-4xl px-4 py-2 sm:px-8 md:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            {/* Title Section */}
            <Link href="/" onClick={handleClick} className="group">
              <div className="flex flex-row items-center gap-x-2 lg:gap-x-3">
                <div className="shrink-0">
                  <Image
                    src="/images/un-logo-stacked-colour-english.svg"
                    alt="UN Logo"
                    width={90}
                    height={90}
                    priority
                    className="h-7 w-auto sm:h-8 lg:h-9"
                  />
                </div>
                <div className="flex flex-row items-baseline gap-x-1 sm:gap-x-2">
                  <h1 className="cursor-pointer text-lg leading-tight tracking-tight text-foreground group-hover:text-un-blue sm:text-2xl lg:text-4xl">
                    <span className="leading-none font-bold">
                      UN80 Initiative
                    </span>
                  </h1>

                  <h1 className="cursor-pointer text-base leading-tight font-normal text-foreground group-hover:text-un-blue sm:text-xl lg:text-4xl">
                    Actions
                  </h1>
                </div>
              </div>
            </Link>

            {/* Last updated – top right on desktop, below title on mobile */}
            {lastUpdated && (
              <p className="shrink-0 text-left text-[11px] text-slate-500 sm:text-right sm:text-sm">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

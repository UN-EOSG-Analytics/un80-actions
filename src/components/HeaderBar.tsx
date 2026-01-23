"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onReset?: () => void;
  showLogin?: boolean;
}

export function Header({ onReset }: HeaderProps) {
  const router = useRouter();

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
          <div className="flex items-center justify-between gap-3">
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
                  <h1 className="cursor-pointer text-xl leading-tight tracking-tight text-foreground group-hover:text-un-blue sm:text-2xl lg:text-4xl">
                    <span className="leading-none font-bold">
                      UN80 Initiative
                    </span>
                  </h1>

                  <h1 className="cursor-pointer text-lg leading-tight font-normal text-foreground group-hover:text-un-blue sm:text-xl lg:text-4xl">
                    Actions
                  </h1>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

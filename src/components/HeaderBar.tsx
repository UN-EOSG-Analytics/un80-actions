"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onReset?: () => void;
  showLogin?: boolean;
}

export function Header({ onReset, showLogin = true }: HeaderProps) {
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
      <header className="sm:fixed sm:top-0 sm:right-0 sm:left-0 sm:z-50 w-full border-b bg-background backdrop-blur-sm">
        <div className="mx-auto w-full max-w-4xl px-8 pt-3 pb-2 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
          <div className="flex items-start justify-between gap-4">
            {/* Title Section */}
            <Link href="/" onClick={handleClick} className="group">
              <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-x-2">
                <h1 className="cursor-pointer text-4xl leading-tight tracking-tight text-foreground group-hover:text-un-blue">
                  <span className="leading-none font-bold">UN80 Initiative</span>
                </h1>

                <div className="flex items-baseline gap-x-1">
                  <h1 className="cursor-pointer text-3xl leading-tight font-normal text-foreground group-hover:text-un-blue lg:text-4xl">
                    Actions
                  </h1>

                  {/* Beta Badge - visible on all screen sizes, inline with Actions */}
                  <div className="self-start">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="inline-flex h-auto cursor-pointer items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-700"
                        >
                          beta
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-64">
                        <p className="text-sm text-gray-600 leading-relaxed">
                          This dashboard is currently in its beta version and will
                          be updated on a regular basis.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </Link>

            {/* Login Button */}
            {showLogin && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  asChild
                  className="flex items-center gap-2"
                >
                  <a href="/internal">
                    <LogIn className="h-4 w-4" />
                    <span>Login</span>
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

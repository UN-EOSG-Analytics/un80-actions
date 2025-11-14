"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HeaderProps {
  onReset?: () => void;
}

export function Header({ onReset }: HeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 0);
          ticking = false;
        });
        ticking = true;
      }
    };
    // Check initial scroll position
    setIsScrolled(window.scrollY > 0);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (onReset) {
      onReset();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shouldReduceSize = isMobile && isScrolled;

  return (
    <header className="fixed top-0 right-0 left-0 z-50 w-full border-b bg-background backdrop-blur-sm">
      <div className="mx-auto w-full max-w-4xl px-8 pt-3 pb-2 sm:px-12 lg:max-w-6xl lg:px-16 xl:max-w-7xl">
        {/* Title Section */}
        <Link href="/" onClick={handleClick} className="group">
          <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-x-2">
            <h1 className={`cursor-pointer leading-tight tracking-tight text-foreground transition-[font-size,line-height] duration-500 ease-in-out will-change-[font-size,line-height] group-hover:text-un-blue ${
              shouldReduceSize ? 'text-2xl' : 'text-4xl'
            }`}>
              <span className="leading-none font-bold">UN80 Initiative</span>
            </h1>

            <div className="flex items-baseline gap-x-1">
              <h1 className={`cursor-pointer leading-tight font-normal text-foreground transition-[font-size,line-height] duration-500 ease-in-out will-change-[font-size,line-height] group-hover:text-un-blue lg:text-4xl ${
                shouldReduceSize ? 'text-xl' : 'text-3xl'
              }`}>
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
                  <TooltipContent side="bottom" className="max-w-56">
                    <p className="text-sm">
                      This dashboard is currently in its beta version and will
                      be updated on a regular basis.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}

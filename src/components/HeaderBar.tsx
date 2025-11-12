"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface HeaderProps {
    onReset?: () => void;
}

export function Header({ onReset }: HeaderProps) {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        if (onReset) {
            onReset();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background backdrop-blur-sm border-b">
            <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-3 pb-2">
                {/* Title Section */}
                <Link href="/" onClick={handleClick} className="group">
                    <div className="flex flex-col lg:flex-row lg:items-baseline lg:gap-x-2">
                        <h1 className="text-4xl tracking-tight text-foreground leading-tight transition-colors group-hover:text-un-blue cursor-pointer">
                            <span className="font-bold leading-none">UN80 Initiative</span>
                        </h1>
                        
                        <div className="flex items-baseline gap-x-1">
                            <h1 className="text-3xl lg:text-4xl font-normal text-foreground leading-tight transition-colors group-hover:text-un-blue cursor-pointer">
                                Actions
                            </h1>

                            {/* Beta Badge - visible on all screen sizes, inline with Actions */}
                            <div className="self-start">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600  hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer h-auto"
                                        >
                                            beta
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="max-w-56">
                                        <p className="text-sm">
                                            This dashboard is currently in its beta version and will be updated on a regular basis.
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

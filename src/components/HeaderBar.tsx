import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Link from "next/link";

export function Header() {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full bg-background backdrop-blur-sm border-b">
            <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 pt-3 pb-2">
                {/* Title Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                    <Link href="/" className="group">
                        <h1 className="text-4xl tracking-tight text-foreground leading-tight mt-1 transition-colors group-hover:text-un-blue cursor-pointer">
                            <span className="font-bold leading-none">UN80 Initiative</span>
                        </h1>
                    </Link>
                    
                    <div className="flex items-center gap-x-2">
                        <Link href="/" className="group">
                            <h1 className="text-3xl lg:text-4xl font-normal text-foreground leading-tight transition-colors group-hover:text-un-blue cursor-pointer">
                                Actions
                            </h1>
                        </Link>

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
            </div>
        </header>
    );
}

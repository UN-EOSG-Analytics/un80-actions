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
                    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                        <Link href="/" className="group">
                            <h1 className="text-4xl tracking-tight text-foreground leading-tight mt-1 transition-colors group-hover:text-un-blue cursor-pointer">
                                <div className="leading-none">
                                    <span className="font-bold">UN80 Initiative</span>
                                    <span className="text-3xl font-normal block lg:inline lg:ml-1 lg:pl-1 lg:text-4xl">
                                        Actions
                                    </span>
                                </div>
                            </h1>
                        </Link>

                        {/* Beta Badge - hidden on mobile, visible on desktop */}
                        <div className="hidden lg:block mt-1 self-start lg:self-auto">
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
                                        This dashboard is in beta and may be updated frequently.
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

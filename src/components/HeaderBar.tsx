import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

export function Header() {
    return (
        <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 border-b">
            <div className="w-full max-w-4xl lg:max-w-6xl xl:max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-2 pb-4">
                {/* Title Section */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:gap-x-2">
                        <h1 className="text-4xl tracking-tight text-foreground leading-tight mt-1">
                            <div className="leading-none">
                                <span className="font-bold">UN80 Initiative</span>
                                <span className="text-3xl font-normal block lg:inline lg:ml-1 lg:pl-1 lg:text-4xl">
                                    Actions
                                </span>
                            </div>
                        </h1>
                        {/* Beta Badge - hidden on mobile, visible on desktop */}
                        <div className="hidden lg:block mt-1 self-start lg:self-auto">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer h-auto"
                                    >
                                        beta version
                                        <Info className="h-3 w-3" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-56">
                                    <p className="text-sm">
                                        This dashboard is in beta and may be updated frequently
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

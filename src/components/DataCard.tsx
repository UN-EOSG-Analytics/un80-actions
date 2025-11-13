import React from "react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  isLoading?: boolean;
}

export function DataCard({
  title,
  value,
  icon: Icon,
  className,
  isLoading = false,
}: DataCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn("relative h-[110px] w-full sm:h-[140px]", className)}
        >
          <div className="absolute inset-0 rounded-lg bg-white"></div>
          <Card className="relative flex h-full w-full cursor-pointer flex-col items-start justify-start gap-0 rounded-lg border-0 bg-un-blue/10 px-4 py-4 pl-[26px] shadow-none transition-all hover:scale-[1.02] sm:py-6">
            <div className="mb-2 flex w-full items-center justify-between gap-2 sm:mb-3">
              <p className="text-left text-[17px] leading-[21px] font-normal text-un-blue sm:text-[18px] sm:leading-[23px] md:text-[19px] md:leading-[25px]">
                {title}
              </p>
              <div className="mr-2.5 shrink-0">
                <Icon className="h-5 w-5 text-un-blue" />
              </div>
            </div>
            <p className="text-left text-[37px] leading-[45px] font-bold text-[#2E3440] tabular-nums sm:text-[43px] sm:leading-[51px] md:text-[49px] md:leading-[57px]">
              {isLoading ? "" : value}
            </p>
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>
          Number of {title}: {isLoading ? "Loading..." : value}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

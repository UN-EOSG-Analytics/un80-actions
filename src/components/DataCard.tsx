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
  showProgress?: boolean;
  completed?: number;
  showFiltered?: boolean;
  filteredCount?: number;
}

export function DataCard({
  title,
  value,
  icon: Icon,
  className,
  showProgress = false,
  completed = 0,
  showFiltered = false,
  filteredCount,
}: DataCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn("relative h-22.5 w-full sm:h-27.5 md:h-35", className)}
        >
          <div className="absolute inset-0 rounded-lg bg-white"></div>
          <Card className="relative flex h-full w-full cursor-pointer flex-col items-start justify-start gap-0 rounded-lg border-0 bg-un-blue/10 px-3 py-3 pl-4 shadow-none transition-all hover:scale-[1.02] sm:px-4 sm:py-4 sm:pl-6.5 md:py-6">
            <div className="mb-1.5 flex w-full items-center justify-between gap-1.5 sm:mb-2 sm:gap-2 md:mb-3">
              <p className="min-w-0 flex-1 truncate text-left text-[12px] leading-4 font-normal text-un-blue sm:text-[15px] sm:leading-4.75 md:text-[18px] md:leading-5.75 lg:text-[19px] lg:leading-6.25">
                {title}
              </p>
              <div className="mr-1 shrink-0 sm:mr-2.5">
                <Icon className="h-4 w-4 text-un-blue sm:h-5 sm:w-5" />
              </div>
            </div>
            {showFiltered && filteredCount !== undefined ? (
              <p className="text-left text-[24px] leading-7.5 font-bold text-[#2E3440] tabular-nums sm:text-[37px] sm:leading-11.25 md:text-[43px] md:leading-12.75 lg:text-[49px] lg:leading-14.25">
                {filteredCount}
                <span className="text-[16px] font-normal text-[#2E3440] sm:text-[22px] md:text-[26px] lg:text-[30px]">
                  /{value}
                </span>
              </p>
            ) : showProgress ? (
              <p
                className={cn(
                  "text-left font-bold text-[#2E3440] tabular-nums",
                  "text-[18px] leading-6 sm:text-[24px] sm:leading-7.5 md:text-[28px] md:leading-8.5 lg:text-[32px] lg:leading-9.5",
                )}
              >
                {completed}/{value}{" "}
                <span className="text-[10px] font-normal text-un-blue sm:text-[12px] md:text-[14px] lg:text-[16px]">
                  completed
                </span>
              </p>
            ) : (
              <p className="text-left text-[24px] leading-7.5 font-bold text-[#2E3440] tabular-nums sm:text-[37px] sm:leading-11.25 md:text-[43px] md:leading-12.75 lg:text-[49px] lg:leading-14.25">
                {value}
              </p>
            )}
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-gray-600">
          {title}:{" "}
          <span className="font-semibold text-un-blue">
            {showFiltered && filteredCount !== undefined
              ? `${filteredCount} of ${value}`
              : showProgress
                ? `${completed}/${value} completed`
                : value}
          </span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

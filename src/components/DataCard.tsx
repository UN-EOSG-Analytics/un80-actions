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
  isLoading = false,
  showProgress = false,
  completed = 0,
  showFiltered = false,
  filteredCount,
}: DataCardProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative h-[90px] w-full sm:h-[110px] md:h-[140px]",
            className,
          )}
        >
          <div className="absolute inset-0 rounded-lg bg-white"></div>
          <Card className="relative flex h-full w-full cursor-pointer flex-col items-start justify-start gap-0 rounded-lg border-0 bg-un-blue/10 px-3 py-3 pl-4 shadow-none transition-all hover:scale-[1.02] sm:px-4 sm:py-4 sm:pl-[26px] md:py-6">
            <div className="mb-1.5 flex w-full items-center justify-between gap-1.5 sm:mb-2 sm:gap-2 md:mb-3">
              <p className="min-w-0 flex-1 truncate text-left text-[12px] leading-[16px] font-normal text-un-blue sm:text-[15px] sm:leading-[19px] md:text-[18px] md:leading-[23px] lg:text-[19px] lg:leading-[25px]">
                {title}
              </p>
              <div className="mr-1 shrink-0 sm:mr-2.5">
                <Icon className="h-4 w-4 text-un-blue sm:h-5 sm:w-5" />
              </div>
            </div>
            {isLoading ? (
              <p className="text-left text-[24px] leading-[30px] font-bold text-[#2E3440] tabular-nums sm:text-[37px] sm:leading-[45px] md:text-[43px] md:leading-[51px] lg:text-[49px] lg:leading-[57px]"></p>
            ) : showFiltered && filteredCount !== undefined ? (
              <p className="text-left text-[24px] leading-[30px] font-bold text-[#2E3440] tabular-nums sm:text-[37px] sm:leading-[45px] md:text-[43px] md:leading-[51px] lg:text-[49px] lg:leading-[57px]">
                {filteredCount}
                <span className="text-[16px] font-normal text-[#2E3440] sm:text-[22px] md:text-[26px] lg:text-[30px]">
                  /{value}
                </span>
              </p>
            ) : showProgress ? (
              <p
                className={cn(
                  "text-left font-bold text-[#2E3440] tabular-nums",
                  "text-[18px] leading-[24px] sm:text-[24px] sm:leading-[30px] md:text-[28px] md:leading-[34px] lg:text-[32px] lg:leading-[38px]",
                )}
              >
                {completed}/{value}{" "}
                <span className="text-[10px] font-normal text-un-blue sm:text-[12px] md:text-[14px] lg:text-[16px]">
                  completed
                </span>
              </p>
            ) : (
              <p className="text-left text-[24px] leading-[30px] font-bold text-[#2E3440] tabular-nums sm:text-[37px] sm:leading-[45px] md:text-[43px] md:leading-[51px] lg:text-[49px] lg:leading-[57px]">
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
            {isLoading
              ? "Loading..."
              : showFiltered && filteredCount !== undefined
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

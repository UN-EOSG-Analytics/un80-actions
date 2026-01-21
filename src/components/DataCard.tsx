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
          className={cn("relative h-[110px] w-full sm:h-[140px]", className)}
        >
          <div className="absolute inset-0 rounded-lg bg-white"></div>
          <Card className="relative flex h-full w-full cursor-pointer flex-col items-start justify-start gap-0 rounded-lg border-0 bg-un-blue/10 px-4 py-4 pl-[26px] shadow-none transition-all hover:scale-[1.02] sm:py-6">
            <div className="mb-2 flex w-full items-center justify-between gap-2 sm:mb-3">
              <p className="min-w-0 flex-1 truncate text-left text-[15px] leading-[19px] font-normal text-un-blue sm:text-[18px] sm:leading-[23px] md:text-[19px] md:leading-[25px]">
                {title}
              </p>
              <div className="mr-2.5 shrink-0">
                <Icon className="h-5 w-5 text-un-blue" />
              </div>
            </div>
            {isLoading ? (
              <p className="text-left text-[37px] leading-[45px] font-bold text-[#2E3440] tabular-nums sm:text-[43px] sm:leading-[51px] md:text-[49px] md:leading-[57px]"></p>
            ) : showFiltered && filteredCount !== undefined ? (
              <p className="text-left text-[37px] leading-[45px] font-bold text-[#2E3440] tabular-nums sm:text-[43px] sm:leading-[51px] md:text-[49px] md:leading-[57px]">
                {filteredCount}
                <span className="text-[22px] font-normal text-[#2E3440] sm:text-[26px] md:text-[30px]">
                  /{value}
                </span>
              </p>
            ) : showProgress ? (
              <p
                className={cn(
                  "text-left font-bold text-[#2E3440] tabular-nums",
                  "text-[24px] leading-[30px] sm:text-[28px] sm:leading-[34px] md:text-[32px] md:leading-[38px]",
                )}
              >
                {completed}/{value}{" "}
                <span className="text-[12px] font-normal text-un-blue sm:text-[14px] md:text-[16px]">
                  completed
                </span>
              </p>
            ) : (
              <p className="text-left text-[37px] leading-[45px] font-bold text-[#2E3440] tabular-nums sm:text-[43px] sm:leading-[51px] md:text-[49px] md:leading-[57px]">
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

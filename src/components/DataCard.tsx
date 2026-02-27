import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/Tooltip";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface DataCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  className?: string;
  /** Pass to show a filtered/total display */
  filteredCount?: number;
}

export function DataCard({
  title,
  value,
  icon: Icon,
  className,
  filteredCount,
}: DataCardProps) {
  const isFiltered = filteredCount !== undefined;

  const tooltipLabel = isFiltered ? `${filteredCount} of ${value}` : value;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("relative h-24 w-full", className)}>
          <div className="absolute inset-0 rounded-lg bg-white" />
          <Card className="relative flex h-full cursor-pointer flex-col justify-center gap-2 rounded-lg border-0 bg-un-blue/10 p-4 shadow-none transition-all hover:scale-[1.02]">
            <div className="flex items-center justify-between gap-2">
              <p className="line-clamp-2 min-w-0 flex-1 text-lg leading-tight text-un-blue">
                {title}
              </p>
              <Icon className="h-4.5 w-4.5 shrink-0 text-un-blue" />
            </div>
            <p className="text-4xl leading-none font-bold text-black tabular-nums">
              {isFiltered ? filteredCount : value}
              <span className={cn(!isFiltered && "invisible")}>
                <span className="text-2xl font-normal text-slate-700">/</span>
                <span className="text-lg font-normal text-slate-700 tabular-nums">
                  {value}
                </span>
              </span>
            </p>
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-gray-600">
          {title}:{" "}
          <span className="font-semibold text-un-blue">{tooltipLabel}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

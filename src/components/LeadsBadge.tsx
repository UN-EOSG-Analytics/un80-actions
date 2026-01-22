import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { abbreviationMap } from "@/constants/abbreviations";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadsBadgeProps {
  leads: string[];
  onSelectLead?: (lead: string[]) => void;
  variant?: "default" | "muted";
  showIcon?: boolean;
  color?: string;
  iconTooltip?: string;
}

export function LeadsBadge({
  leads,
  onSelectLead,
  variant = "default",
  showIcon = true,
  color: customColor,
  iconTooltip,
}: LeadsBadgeProps) {
  if (leads.length === 0) return null;

  const handleLeadClick = (lead: string) => {
    if (onSelectLead) {
      onSelectLead([lead]);
    }
  };

  const isMuted = variant === "muted";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showIcon && (
        iconTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Users
                className={cn(
                  "h-4 w-4 shrink-0 cursor-help",
                  customColor || (isMuted ? "text-slate-500" : "text-un-blue"),
                )}
              />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm text-gray-600">{iconTooltip}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Users
            className={cn(
              "h-4 w-4 shrink-0",
              customColor || (isMuted ? "text-slate-500" : "text-un-blue"),
            )}
          />
        )
      )}
      {leads.map((lead, idx) => {
        const longForm = abbreviationMap[lead] || lead;
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "transition-all duration-150",
                  isMuted
                    ? "border-slate-200 bg-slate-100 text-slate-700 shadow-sm shadow-slate-200/50 ring-1 ring-inset ring-slate-200/50 hover:bg-slate-150 hover:shadow-md"
                    : "border-un-blue/20 bg-un-blue text-white shadow-sm shadow-un-blue/25 ring-1 ring-inset ring-white/10 hover:shadow-md hover:shadow-un-blue/30",
                  onSelectLead ? "cursor-pointer" : "cursor-help",
                  customColor && `text-[${customColor}]`,
                )}
                onClick={(e) => {
                  if (onSelectLead) {
                    e.stopPropagation();
                    handleLeadClick(lead);
                  }
                }}
              >
                {lead}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm text-gray-600">{longForm}</p>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}

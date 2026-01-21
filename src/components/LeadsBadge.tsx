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
}

export function LeadsBadge({
  leads,
  onSelectLead,
  variant = "default",
  showIcon = true,
  color: customColor,
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
        <Users
          className={cn(
            "h-4 w-4 shrink-0",
            customColor || (isMuted ? "text-slate-500" : "text-un-blue"),
          )}
        />
      )}
      {leads.map((lead, idx) => {
        const longForm = abbreviationMap[lead] || lead;
        return (
          <Tooltip key={idx}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  isMuted
                    ? "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border-un-blue/30 bg-un-blue text-white hover:bg-un-blue/90",
                  onSelectLead ? "" : "cursor-help",
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

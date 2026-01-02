import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { abbreviationMap } from "@/constants/abbreviations";
import { Users } from "lucide-react";

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

  const textColor = customColor || (variant === "muted" ? "text-slate-600" : "text-un-blue");
  const textSize = variant === "muted" ? "text-sm" : "";

  return (
    <div className="flex items-center gap-1.5">
      {showIcon && <Users className={`h-4 w-4 ${textColor} shrink-0`} />}
      <p
        className={`${textSize} ${textColor} text-left leading-tight wrap-break-word`}
      >
        {leads.map((lead, idx) => {
          const longForm = abbreviationMap[lead] || lead;
          return (
            <span key={idx}>
              {idx > 0 && "; "}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={
                      onSelectLead
                        ? "cursor-pointer hover:underline"
                        : "cursor-help"
                    }
                    onClick={(e) => {
                      if (onSelectLead) {
                        e.stopPropagation();
                        handleLeadClick(lead);
                      }
                    }}
                  >
                    {lead}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm text-gray-600">{longForm}</p>
                </TooltipContent>
              </Tooltip>
            </span>
          );
        })}
      </p>
    </div>
  );
}

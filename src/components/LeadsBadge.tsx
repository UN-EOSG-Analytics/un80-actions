import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { abbreviationMap } from "@/constants/abbreviations";
import { Users } from "lucide-react";

interface LeadsBadgeProps {
    leads: string[];
}

export function LeadsBadge({ leads }: LeadsBadgeProps) {
    if (leads.length === 0) return null;

    return (
        <div className="flex items-start gap-1 sm:gap-2">
            <Users className="w-4 h-4 text-un-blue shrink-0 mt-0.5" />
            <p className="text-base text-un-blue leading-5 text-left wrap-break-word">
                {leads.map((lead, idx) => {
                    const longForm = abbreviationMap[lead] || lead;
                    return (
                        <span key={idx}>
                            {idx > 0 && "; "}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="cursor-help">
                                        {lead}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{longForm}</p>
                                </TooltipContent>
                            </Tooltip>
                        </span>
                    );
                })}
            </p>
        </div>
    );
}

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { abbreviationMap } from "@/constants/abbreviations";
import { Users } from "lucide-react";

interface LeadsBadgeProps {
    leads: string[];
}

export function LeadsBadge({ leads }: LeadsBadgeProps) {
    if (leads.length === 0) return null;

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="flex items-start gap-1 sm:gap-2 cursor-help">
                    <Users className="w-4 h-4 text-un-blue shrink-0 mt-0.5" />
                    <p className="text-base text-un-blue leading-5 text-left wrap-break-word">
                        {leads.map((lead, idx) => {
                            const longForm = abbreviationMap[lead] || lead;
                            return (
                                <span key={idx}>
                                    {idx > 0 && ", "}
                                    <span
                                        title={
                                            longForm !== lead ? longForm : undefined
                                        }
                                    >
                                        {lead}
                                    </span>
                                </span>
                            );
                        })}
                    </p>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>
                    {leads.map((lead, idx) => {
                        const longForm = abbreviationMap[lead] || lead;
                        return (
                            <span key={idx}>
                                {idx > 0 && ", "}
                                {longForm}
                            </span>
                        );
                    })}
                </p>
            </TooltipContent>
        </Tooltip>
    );
}

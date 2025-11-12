import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Layers } from "lucide-react";

interface WorkstreamLabelsProps {
    report: string[];
    onSelectWorkstream?: (workstream: string[]) => void;
}

export function WorkstreamLabels({ report, onSelectWorkstream }: WorkstreamLabelsProps) {
    const workstreams = ["WS1", "WS2", "WS3"] as const;
    const workstreamNames = {
        WS1: "Workstream 1",
        WS2: "Workstream 2",
        WS3: "Workstream 3",
    } as const;

    const activeWorkstreams = workstreams.filter(ws => report.includes(ws));
    
    if (activeWorkstreams.length === 0) return null;

    const handleWorkstreamClick = (workstream: string) => {
        if (onSelectWorkstream) {
            onSelectWorkstream([workstream]);
        }
    };

    return (
        <div className="flex items-start gap-1 sm:gap-2">
            <Layers className="w-4 h-4 text-un-blue shrink-0 mt-0.5" />
            <p className="text-base text-un-blue leading-5 text-left wrap-break-word">
                {activeWorkstreams.map((ws, idx) => (
                    <span key={ws}>
                        {idx > 0 && "; "}
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className={onSelectWorkstream ? "cursor-pointer hover:underline" : "cursor-help"}
                                    onClick={(e) => {
                                        if (onSelectWorkstream) {
                                            e.stopPropagation();
                                            handleWorkstreamClick(ws);
                                        }
                                    }}
                                >
                                    {ws}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{workstreamNames[ws]}</p>
                            </TooltipContent>
                        </Tooltip>
                    </span>
                ))}
            </p>
        </div>
    );
}

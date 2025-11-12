import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Layers } from "lucide-react";

interface WorkstreamLabelsProps {
    report: string[];
}

export function WorkstreamLabels({ report }: WorkstreamLabelsProps) {
    const workstreams = ["WS1", "WS2", "WS3"] as const;
    const workstreamNames = {
        WS1: "Workstream 1",
        WS2: "Workstream 2",
        WS3: "Workstream 3",
    } as const;

    return (
        <>
            {workstreams.map((ws) => {
                if (!report.includes(ws)) return null;
                
                return (
                    <Tooltip key={ws}>
                        <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                <Layers className="w-4 h-4 text-un-blue" />
                                <p className="text-base text-un-blue leading-5">{ws}</p>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{workstreamNames[ws]}</p>
                        </TooltipContent>
                    </Tooltip>
                );
            })}
        </>
    );
}

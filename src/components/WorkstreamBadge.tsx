import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface WorkstreamLabelsProps {
  report: string[];
  onSelectWorkstream?: (workstream: string[]) => void;
}

export function WorkstreamLabels({
  report,
  onSelectWorkstream,
}: WorkstreamLabelsProps) {
  const workstreams = ["WS1", "WS2", "WS3"] as const;
  const workstreamNames = {
    WS1: "Workstream 1",
    WS2: "Workstream 2",
    WS3: "Workstream 3",
  } as const;

  const activeWorkstreams = workstreams.filter((ws) => report.includes(ws));

  if (activeWorkstreams.length === 0) return null;

  const handleWorkstreamClick = (workstream: string) => {
    if (onSelectWorkstream) {
      onSelectWorkstream([workstream]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {activeWorkstreams.map((ws) => (
        <Tooltip key={ws}>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={`border-slate-200 bg-slate-100 text-slate-700 shadow-sm ring-1 shadow-slate-200/50 ring-slate-200/50 transition-all duration-150 ring-inset hover:shadow-md ${
                onSelectWorkstream ? "cursor-pointer" : "cursor-help"
              }`}
              onClick={(e) => {
                if (onSelectWorkstream) {
                  e.stopPropagation();
                  handleWorkstreamClick(ws);
                }
              }}
            >
              {ws}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm text-gray-600">{workstreamNames[ws]}</p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

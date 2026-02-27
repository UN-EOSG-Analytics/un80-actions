import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/Tooltip";
import { HelpCircle } from "lucide-react";

/**
 * Reusable help tooltip component
 * Displays a small help icon that shows explanatory content on hover
 * Can be used throughout the application for contextual help
 */
export function HelpTooltip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Help"
          className="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:text-slate-700 sm:size-5 sm:text-slate-400 sm:hover:bg-slate-100 sm:hover:text-slate-600"
        >
          <HelpCircle className="size-4 sm:size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        <p className="text-gray-600">{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

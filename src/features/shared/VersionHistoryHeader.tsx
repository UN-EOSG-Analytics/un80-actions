"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, FileDown, Loader2 } from "lucide-react";

export interface VersionHistoryHeaderProps {
  title: string;
  onExport: (format: "word" | "pdf") => void;
  exporting: boolean;
}

export function VersionHistoryHeader({
  title,
  onExport,
  exporting,
}: VersionHistoryHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-slate-600"
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Export
            <ChevronDown className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => onExport("word")}
            disabled={exporting}
          >
            Word (.docx)
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onExport("pdf")}
            disabled={exporting}
          >
            PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { formatUNDateTime } from "@/lib/format-date";

interface ReviewStatusProps {
  status: "approved" | "needs_review";
  reviewedByEmail?: string | null;
  reviewedAt?: Date | string | null;
  onApprove?: () => Promise<void>;
  isAdmin?: boolean;
  approving?: boolean;
  className?: string;
}

export function ReviewStatus({
  status,
  reviewedByEmail,
  reviewedAt,
  onApprove,
  isAdmin = false,
  approving = false,
  className = "",
}: ReviewStatusProps) {
  if (status === "needs_review") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <Badge className="rounded-md bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200/80">
          Open
        </Badge>
        {isAdmin && onApprove && (
          <Button
            size="sm"
            variant="outline"
            onClick={onApprove}
            disabled={approving}
            className="h-7 rounded-md border-slate-300 text-xs font-medium hover:bg-slate-50"
          >
            {approving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1.5 h-3 w-3" />
                Close
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Badge className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200/80">
        Closed
      </Badge>
      {(reviewedByEmail || reviewedAt) && (
        <span className="text-xs text-slate-500">
          {reviewedByEmail && `by ${reviewedByEmail}`}
          {reviewedByEmail && reviewedAt && " "}
          {reviewedAt && `on ${formatUNDateTime(reviewedAt)}`}
        </span>
      )}
    </div>
  );
}

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
        <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">
          Needs review
        </Badge>
        {isAdmin && onApprove && (
          <Button
            size="sm"
            variant="outline"
            onClick={onApprove}
            disabled={approving}
            className="h-7 text-xs"
          >
            {approving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3 w-3" />
                Approve
              </>
            )}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <Badge className="bg-green-100 text-green-800 border border-green-200">
        Approved
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

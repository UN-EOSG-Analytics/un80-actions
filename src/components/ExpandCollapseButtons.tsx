import { ChevronsDown, ChevronsUp } from "lucide-react";

interface ExpandCollapseToggleProps {
  onExpandAll: () => void;
  onCollapseAll: () => void;
  totalCount: number;
  expandedCount: number;
  /** Mobile size variant */
  mobile?: boolean;
}

export function ExpandCollapseToggle({
  onExpandAll,
  onCollapseAll,
  totalCount,
  expandedCount,
  mobile = false,
}: ExpandCollapseToggleProps) {
  const allExpanded = expandedCount === totalCount && totalCount > 0;

  const handleClick = () => {
    if (allExpanded) {
      onCollapseAll();
    } else {
      onExpandAll();
    }
  };

  if (mobile) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex h-10 touch-manipulation items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 transition-colors hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
      >
        {allExpanded ? (
          <ChevronsUp className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronsDown className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate">{allExpanded ? "Collapse All" : "Expand All"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex h-9 touch-manipulation items-center gap-3 rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 transition-colors hover:border-un-blue hover:bg-un-blue/10 hover:text-un-blue"
    >
      {allExpanded ? (
        <ChevronsUp className="h-4 w-4 shrink-0" />
      ) : (
        <ChevronsDown className="h-4 w-4 shrink-0" />
      )}
      <span className="truncate">{allExpanded ? "Collapse All" : "Expand All"}</span>
    </button>
  );
}

import { RotateCcw } from "lucide-react";

interface ResetButtonProps {
  onClick: () => void;
  className?: string;
}

export default function ResetButton({
  onClick,
  className = "",
}: ResetButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 flex-shrink-0 items-center justify-center gap-2 rounded-md border border-gray-300 bg-gray-200 px-3 text-sm font-normal text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-300 hover:text-gray-800 ${className} `}
      aria-label="Clear filters and search"
      title="Clear filters and search"
    >
      <RotateCcw className="h-4 w-4" />
      <span>Reset</span>
    </button>
  );
}

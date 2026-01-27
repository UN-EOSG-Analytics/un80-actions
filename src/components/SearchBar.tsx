import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(searchQuery);

  // Sync local state when external searchQuery changes (e.g., reset button)
  useEffect(() => {
    setLocalValue(searchQuery);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSearchChange(localValue);
    }
  };

  return (
    <div className="relative h-10 w-full sm:w-[calc(50%-0.375rem)]">
      <Search className="pointer-events-none absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform text-un-blue" />
      <Input
        type="text"
        placeholder="Search for keywords, press Enter..."
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="h-full w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 pl-10 text-sm text-gray-900 shadow-none transition-colors placeholder:text-gray-500 hover:border-un-blue hover:bg-un-blue/10 focus:border-un-blue focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-base"
      />
    </div>
  );
}

import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="relative w-full sm:w-102.25">
      <Search className="pointer-events-none absolute top-1/2 left-0 z-10 h-5 w-5 -translate-y-1/2 transform text-un-blue" />
      <Input
        type="text"
        placeholder="Search for keywords"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="h-11 w-full rounded-none border-0 border-b border-slate-300 bg-white py-2.5 pr-4 pl-6 text-[16px] text-slate-700 shadow-none transition-all focus:shadow-none focus:ring-0 focus:ring-offset-0 focus:outline-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
    </div>
  );
}

import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchBarProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

export function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
    return (
        <div className="relative w-full sm:w-[409px]">
            <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-un-blue pointer-events-none z-10" />
            <Input
                type="text"
                placeholder="Search for Keywords"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full h-11 text-[16px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-2.5 text-slate-700 bg-white transition-all focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
        </div>
    );
}

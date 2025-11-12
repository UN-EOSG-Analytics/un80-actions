import React from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DataCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    className?: string;
}

export function DataCard({ title, value, icon: Icon, className }: DataCardProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn('relative w-full sm:w-[280px] h-[140px]', className)}>
                    <div className="absolute inset-0 bg-white rounded-lg"></div>
                    <Card className="relative flex flex-col items-start justify-start w-full h-full bg-un-blue/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px] shadow-none gap-0">
                        <div className="flex items-center gap-2 mb-3 w-full justify-between">
                            <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-un-blue text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                {title}
                            </p>
                            <div className="shrink-0 mr-2.5">
                                <Icon className="w-5 h-5 text-un-blue" />
                            </div>
                        </div>
                        <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px] tabular-nums">
                            {value}
                        </p>
                    </Card>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>Number of {title.toLowerCase()}: {value}</p>
            </TooltipContent>
        </Tooltip>
    );
}

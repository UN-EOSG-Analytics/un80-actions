import React from 'react';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DataCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    tooltipText: string;
    className?: string;
}

export function DataCard({ title, value, icon, tooltipText, className }: DataCardProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn('relative w-full sm:w-[280px] h-[140px]', className)}>
                    <div className="absolute inset-0 bg-white rounded-lg"></div>
                    <Card className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px] shadow-none gap-0">
                        <div className="flex items-center gap-2 mb-3 w-full justify-between">
                            <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-[#009EDB] text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                {title}
                            </p>
                            <div className="shrink-0 mr-2.5">{icon}</div>
                        </div>
                        <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px]">
                            {value}
                        </p>
                    </Card>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltipText}</p>
            </TooltipContent>
        </Tooltip>
    );
}

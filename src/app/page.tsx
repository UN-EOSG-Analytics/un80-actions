"use client";

import { Button } from "@/components/ui/button";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchActions } from "@/lib/actions";
import { parseDate, formatDate, formatGoalText } from "@/lib/utils";
import { abbreviationMap } from "@/constants/abbreviations";
import type { Actions, WorkPackageStats, NextMilestone } from "@/types";
import { Briefcase, Briefcase as BriefcaseIcon, ChevronDown, FileText, Filter, Info, Layers, ListTodo, Search, Trophy, User, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export default function WorkPackagesPage() {
    const [actions, setActions] = useState<Actions>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
    const [selectedLead, setSelectedLead] = useState<string>("");
    const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
    const [selectedBigTicket, setSelectedBigTicket] = useState<string>("");
    const [chartSearchQuery, setChartSearchQuery] = useState<string>("");
    const [workstreamChartSearchQuery, setWorkstreamChartSearchQuery] = useState<string>("");
    const [workpackageChartSearchQuery, setWorkpackageChartSearchQuery] = useState<string>("");
    const [sortOption, setSortOption] = useState<string>("");
    const [showAllLeads, setShowAllLeads] = useState<boolean>(false);
    const [showAllWorkstreams, setShowAllWorkstreams] = useState<boolean>(false);
    const [showAllWorkpackages, setShowAllWorkpackages] = useState<boolean>(false);
    const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(new Set());
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
    const [openFilterCollapsibles, setOpenFilterCollapsibles] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState<WorkPackageStats>({
        total: 0,
        completed: 0,
        totalActions: 0,
        completedActions: 0,
    });
    const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null);
    const [progressPercentage, setProgressPercentage] = useState<number>(0);

    useEffect(() => {
        setIsLoading(true);
        fetchActions()
            .then((data) => {
                setActions(data);
                setIsLoading(false);
                // Calculate stats from data
                const uniqueWPs = new Set(
                    data.map((a) => `${a.report}-${a.work_package_number}`)
                );
                setStats({
                    total: uniqueWPs.size,
                    completed: 2, // This would come from actual completion data
                    totalActions: data.length,
                    completedActions: 0, // This would come from actual completion data
                });

                // Calculate next upcoming milestone
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Normalize to start of day for consistent comparison
                const milestones = data
                    .filter(a => a.first_milestone && a.indicative_activity)
                    .map(a => {
                        const milestoneDate = parseDate(a.first_milestone);
                        return milestoneDate ? {
                            date: milestoneDate,
                            indicativeActivity: a.indicative_activity,
                        } : null;
                    })
                    .filter((m): m is { date: Date; indicativeActivity: string } => {
                        if (!m) return false;
                        m.date.setHours(0, 0, 0, 0); // Normalize to start of day
                        return m.date >= today;
                    })
                    .sort((a, b) => a.date.getTime() - b.date.getTime());

                if (milestones.length > 0) {
                    const next = milestones[0];
                    setNextMilestone({
                        date: formatDate(next.date),
                        indicativeActivity: next.indicativeActivity,
                    });
                }

                // Calculate progress bar percentage
                const startDate = new Date(2025, 9, 31); // October 31, 2025 (month is 0-indexed)
                const endDate = new Date(2027, 11, 31); // December 31, 2027
                const now = new Date();

                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsedDuration = now.getTime() - startDate.getTime();

                // Calculate percentage, clamped between 0 and 100
                let percentage = (elapsedDuration / totalDuration) * 100;
                percentage = Math.max(0, Math.min(100, percentage));

                setProgressPercentage(percentage);
            })
            .catch((error) => {
                console.error("Failed to fetch actions:", error);
                setIsLoading(false);
            });
    }, []);

    // Group actions by work package (combine across reports)
    const workPackages = useMemo(() => {
        const wpMap = new Map<
            string,
            {
                report: string[];
                number: string;
                name: string;
                leads: string[];
                goal: string | null;
                bigTicket: boolean;
                actions: Array<{
                    text: string;
                    documentParagraph: string;
                    leads: string[];
                    report: string;
                    docText: string | null;
                }>;
            }
        >();

        actions.forEach((action) => {
            // Use work_package_number as key to combine across reports
            const key = action.work_package_number || 'empty';
            if (!wpMap.has(key)) {
                // work_package_leads is already an array
                const leads = Array.isArray(action.work_package_leads)
                    ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                    : [];

                wpMap.set(key, {
                    report: [action.report],
                    number: action.work_package_number || '',
                    name: action.work_package_name,
                    leads: leads,
                    goal: action.work_package_goal || null,
                    bigTicket: action.big_ticket || false,
                    actions: [],
                });
            }
            const wp = wpMap.get(key)!;

            // Add report if not already included
            if (!wp.report.includes(action.report)) {
                wp.report.push(action.report);
            }

            // Merge leads from all reports
            const newLeads = Array.isArray(action.work_package_leads)
                ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                : [];
            newLeads.forEach(lead => {
                if (!wp.leads.includes(lead)) {
                    wp.leads.push(lead);
                }
            });

            // Update goal if not set or if this action has a goal
            if (action.work_package_goal && !wp.goal) {
                wp.goal = action.work_package_goal;
            }

            // Update big_ticket status - if any action is big_ticket, mark the work package as big_ticket
            if (action.big_ticket) {
                wp.bigTicket = true;
            }

            // Add indicative activity if not already included
            if (action.indicative_activity) {
                const existingAction = wp.actions.find(a => a.text === action.indicative_activity && a.report === action.report);
                if (!existingAction) {
                    // work_package_leads is already an array
                    const actionLeads = Array.isArray(action.work_package_leads)
                        ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                        : [];

                    wp.actions.push({
                        text: action.indicative_activity,
                        documentParagraph: action.document_paragraph || '',
                        leads: actionLeads,
                        report: action.report,
                        docText: action.doc_text || null,
                    });
                } else {
                    // Merge leads if action already exists
                    const actionLeads = Array.isArray(action.work_package_leads)
                        ? action.work_package_leads.filter(lead => lead && lead.trim().length > 0)
                        : [];
                    actionLeads.forEach(lead => {
                        if (!existingAction.leads.includes(lead)) {
                            existingAction.leads.push(lead);
                        }
                    });
                    // Update doc_text if not already set
                    if (action.doc_text && !existingAction.docText) {
                        existingAction.docText = action.doc_text;
                    }
                }
            }
        });

        return Array.from(wpMap.values()).sort((a, b) => {
            // Handle empty numbers - put them at the end
            if (!a.number && !b.number) return a.name.localeCompare(b.name);
            if (!a.number) return 1;
            if (!b.number) return -1;

            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            if (numA !== numB) return numA - numB;

            // If numbers are equal, sort by name
            return a.name.localeCompare(b.name);
        });
    }, [actions]);


    // Helper function to filter work packages based on selected filters (excluding the filter being computed)
    const getFilteredWorkPackagesForOptions = useMemo(() => {
        let filtered = workPackages;

        // Apply lead filter (if selected) when computing work packages and workstreams
        if (selectedLead) {
            filtered = filtered.filter((wp) => wp.leads.includes(selectedLead));
        }

        // Apply workstream filter (if selected) when computing work packages and leads
        if (selectedWorkstream) {
            filtered = filtered.filter((wp) => wp.report.includes(selectedWorkstream));
        }

        // Apply work package filter (if selected) when computing leads and workstreams
        if (selectedWorkPackage) {
            const wpMatch = selectedWorkPackage.match(/^(\d+):/);
            if (wpMatch) {
                const wpNumber = wpMatch[1];
                filtered = filtered.filter((wp) => wp.number === wpNumber);
            } else {
                filtered = filtered.filter((wp) => !wp.number && wp.name === selectedWorkPackage);
            }
        }

        return filtered;
    }, [workPackages, selectedLead, selectedWorkstream, selectedWorkPackage]);

    // Get unique values for filters (filtered based on other selections)
    const uniqueWorkPackages = useMemo(() => {
        return Array.from(new Set(getFilteredWorkPackagesForOptions.map(wp =>
            wp.number ? `${wp.number}: ${wp.name}` : wp.name
        ))).sort();
    }, [getFilteredWorkPackagesForOptions]);

    const uniqueLeads = useMemo(() => {
        const leads = new Set<string>();
        getFilteredWorkPackagesForOptions.forEach(wp => {
            wp.leads.forEach(lead => leads.add(lead));
        });
        return Array.from(leads).sort();
    }, [getFilteredWorkPackagesForOptions]);

    const uniqueWorkstreams = useMemo(() => {
        const workstreams = new Set<string>();
        getFilteredWorkPackagesForOptions.forEach(wp => {
            wp.report.forEach(ws => workstreams.add(ws));
        });
        return Array.from(workstreams).sort();
    }, [getFilteredWorkPackagesForOptions]);

    // Calculate chart data: count work packages per lead
    const chartData = useMemo(() => {
        const leadCounts = new Map<string, number>();

        workPackages.forEach(wp => {
            wp.leads.forEach(lead => {
                // Filter by chart search query if provided
                if (chartSearchQuery.trim()) {
                    const query = chartSearchQuery.toLowerCase();
                    if (!lead.toLowerCase().includes(query)) {
                        return;
                    }
                }
                const currentCount = leadCounts.get(lead) || 0;
                leadCounts.set(lead, currentCount + 1);
            });
        });

        return Array.from(leadCounts.entries())
            .map(([lead, count]) => ({
                lead,
                count,
            }))
            .sort((a, b) => b.count - a.count); // Sort by count descending
    }, [workPackages, chartSearchQuery]);

    // Calculate chart data: count actions per workstream
    const workstreamChartData = useMemo(() => {
        const workstreamCounts = new Map<string, number>();

        actions.forEach(action => {
            // Filter by chart search query if provided
            if (workstreamChartSearchQuery.trim()) {
                const query = workstreamChartSearchQuery.toLowerCase();
                if (!action.report.toLowerCase().includes(query)) {
                    return;
                }
            }
            const currentCount = workstreamCounts.get(action.report) || 0;
            workstreamCounts.set(action.report, currentCount + 1);
        });

        return Array.from(workstreamCounts.entries())
            .map(([workstream, count]) => ({
                workstream,
                count,
            }))
            .sort((a, b) => {
                // Sort WS1, WS2, WS3
                const order = ['WS1', 'WS2', 'WS3'];
                const aIndex = order.indexOf(a.workstream);
                const bIndex = order.indexOf(b.workstream);
                if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                return a.workstream.localeCompare(b.workstream);
            });
    }, [actions, workstreamChartSearchQuery]);

    // Calculate chart data: count actions per workpackage
    const workpackageChartData = useMemo(() => {
        const workpackageCounts = new Map<string, number>();

        actions.forEach(action => {
            const wpKey = action.work_package_number ? `${action.work_package_number}: ${action.work_package_name}` : action.work_package_name;
            // Filter by chart search query if provided
            if (workpackageChartSearchQuery.trim()) {
                const query = workpackageChartSearchQuery.toLowerCase();
                if (!wpKey.toLowerCase().includes(query)) {
                    return;
                }
            }
            const currentCount = workpackageCounts.get(wpKey) || 0;
            workpackageCounts.set(wpKey, currentCount + 1);
        });

        return Array.from(workpackageCounts.entries())
            .map(([workpackage, count]) => ({
                workpackage,
                count,
            }))
            .sort((a, b) => {
                // Sort by workpackage number if available
                const aMatch = a.workpackage.match(/^(\d+):/);
                const bMatch = b.workpackage.match(/^(\d+):/);
                if (aMatch && bMatch) {
                    return parseInt(aMatch[1]) - parseInt(bMatch[1]);
                }
                if (aMatch) return -1;
                if (bMatch) return 1;
                return a.workpackage.localeCompare(b.workpackage);
            });
    }, [actions, workpackageChartSearchQuery]);

    // Filter work packages based on search and filters
    const filteredWorkPackages = useMemo(() => {
        let filtered = workPackages;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (wp) =>
                    wp.name.toLowerCase().includes(query) ||
                    wp.number.includes(query) ||
                    wp.leads.some((lead) => lead.toLowerCase().includes(query)) ||
                    wp.actions.some((action) => action.text.toLowerCase().includes(query))
            );
        }

        // Work Package filter
        if (selectedWorkPackage) {
            const wpMatch = selectedWorkPackage.match(/^(\d+):/);
            if (wpMatch) {
                const wpNumber = wpMatch[1];
                filtered = filtered.filter((wp) => wp.number === wpNumber);
            } else {
                // Handle work packages without numbers
                filtered = filtered.filter((wp) => !wp.number && wp.name === selectedWorkPackage);
            }
        }

        // Lead filter
        if (selectedLead) {
            filtered = filtered.filter((wp) => wp.leads.includes(selectedLead));
        }

        // Workstream filter
        if (selectedWorkstream) {
            filtered = filtered.filter((wp) => wp.report.includes(selectedWorkstream));
        }

        // Big Ticket filter
        if (selectedBigTicket === "big-ticket") {
            filtered = filtered.filter((wp) => wp.bigTicket === true);
        } else if (selectedBigTicket === "other") {
            filtered = filtered.filter((wp) => wp.bigTicket === false);
        }

        // Sort filtered work packages
        if (sortOption) {
            filtered = [...filtered].sort((a, b) => {
                switch (sortOption) {
                    case "name-asc":
                        return a.name.localeCompare(b.name);
                    case "name-desc":
                        return b.name.localeCompare(a.name);
                    case "number-asc":
                        const numA = parseInt(a.number) || 0;
                        const numB = parseInt(b.number) || 0;
                        if (numA !== numB) return numA - numB;
                        return a.name.localeCompare(b.name);
                    case "number-desc":
                        const numA2 = parseInt(a.number) || 0;
                        const numB2 = parseInt(b.number) || 0;
                        if (numA2 !== numB2) return numB2 - numA2;
                        return a.name.localeCompare(b.name);
                    default:
                        return 0;
                }
            });
        }

        return filtered;
    }, [workPackages, searchQuery, selectedWorkPackage, selectedLead, selectedWorkstream, selectedBigTicket, sortOption]);

    // Calculate statistics based on filtered data
    const statsData = useMemo(() => {
        const uniqueWorkstreams = new Set<string>();
        const uniqueLeadsSet = new Set<string>();

        // Filter actions based on current filters
        let filteredActions = actions;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filteredActions = filteredActions.filter(
                (action) =>
                    action.work_package_name.toLowerCase().includes(query) ||
                    action.work_package_number.includes(query) ||
                    (Array.isArray(action.work_package_leads) && action.work_package_leads.some((lead) => lead.toLowerCase().includes(query))) ||
                    action.indicative_activity.toLowerCase().includes(query)
            );
        }

        // Work Package filter
        if (selectedWorkPackage) {
            const wpMatch = selectedWorkPackage.match(/^(\d+):/);
            if (wpMatch) {
                const wpNumber = wpMatch[1];
                filteredActions = filteredActions.filter((action) => action.work_package_number === wpNumber);
            } else {
                filteredActions = filteredActions.filter((action) => !action.work_package_number && action.work_package_name === selectedWorkPackage);
            }
        }

        // Lead filter
        if (selectedLead) {
            filteredActions = filteredActions.filter((action) =>
                Array.isArray(action.work_package_leads) && action.work_package_leads.includes(selectedLead)
            );
        }

        // Workstream filter
        if (selectedWorkstream) {
            filteredActions = filteredActions.filter((action) => action.report === selectedWorkstream);
        }

        filteredActions.forEach(action => {
            if (action.report) {
                uniqueWorkstreams.add(action.report);
            }
            if (Array.isArray(action.work_package_leads)) {
                action.work_package_leads.forEach(lead => {
                    const trimmed = lead?.trim();
                    if (trimmed && trimmed.length > 0) {
                        uniqueLeadsSet.add(trimmed);
                    }
                });
            }
        });

        return {
            workstreams: uniqueWorkstreams.size,
            workpackages: filteredWorkPackages.length,
            actions: filteredActions.length,
            leads: uniqueLeadsSet.size,
        };
    }, [actions, searchQuery, selectedWorkPackage, selectedLead, selectedWorkstream, filteredWorkPackages]);

    // Clear filters if selected value is no longer available
    useEffect(() => {
        if (selectedWorkPackage && !uniqueWorkPackages.includes(selectedWorkPackage)) {
            setSelectedWorkPackage("");
        }
    }, [selectedWorkPackage, uniqueWorkPackages]);

    useEffect(() => {
        if (selectedLead && !uniqueLeads.includes(selectedLead)) {
            setSelectedLead("");
        }
    }, [selectedLead, uniqueLeads]);

    useEffect(() => {
        if (selectedWorkstream && !uniqueWorkstreams.includes(selectedWorkstream)) {
            setSelectedWorkstream("");
        }
    }, [selectedWorkstream, uniqueWorkstreams]);

    const handleResetFilters = () => {
        setSearchQuery("");
        setSelectedWorkPackage("");
        setSelectedLead("");
        setSelectedWorkstream("");
        setSelectedBigTicket("");
    };

    const toggleCollapsible = (key: string) => {
        setOpenCollapsibles((prev) => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="min-h-screen bg-white">
                {/* Main Container - Left-aligned with consistent padding */}
                <div className="max-w-[1421px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[101px] pt-1 sm:pt-2 md:pt-3 pb-4 sm:pb-6 md:pb-8">
                    {/* Header Section */}
                    <header className="mb-4 relative">
                        <div className="mb-6 mt-1 sm:mt-2 md:mt-3 relative">
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-[33px] sm:text-[41px] md:text-[49px] lg:text-[57px] text-gray-800 leading-[41px] sm:leading-[49px] md:leading-[57px] lg:leading-[65px] tracking-[-0.02em] relative inline-block">
                                    <span className="relative z-10 bg-clip-text">
                                        <span className="font-bold">UN80 Initiative</span>
                                        <span className="font-normal"> Actions</span>
                                    </span>
                                </h1>
                                <button className="flex items-center gap-1.5 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-full text-[13px] font-medium transition-colors h-[28px]">
                                    <Info className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                                    <span>Beta version</span>
                                </button>
                            </div>
                            <div className="absolute -left-4 sm:-left-6 md:-left-8 lg:-left-[101px] -right-4 sm:-right-6 md:-right-8 lg:-right-[101px] top-full mt-2 h-[1px] bg-gradient-to-r from-gray-400 via-gray-400/70 to-transparent opacity-80"></div>
                        </div>
                        <div className="text-[16px] text-gray-600 leading-[27px] max-w-[1093px] mt-2">
                            <p>
                                This Dashboard is an annex to the <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-[#009EDB] hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative Action Plan</a>. It presents the detailed work packages across the three <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-[#009EDB] hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative</a> workstreams in a single reference. This Dashboard also lists designated leads for each work package, as well as their individual action items (derived from paragraphs in the SG's reports on <a href="https://www.un.org/un80-initiative/en" target="_blank" rel="noopener noreferrer" className="text-[#009EDB] hover:text-[#0076A4] hover:underline transition-colors">UN80 Initiative</a>).
                            </p>
                        </div>
                    </header>

                    {/* Progress Section */}
                    <section className="mb-0">
                        <div className="flex flex-col sm:flex-row gap-4 items-start flex-wrap sm:flex-nowrap">
                            {/* Card 1 - Number of Workstreams */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative w-full sm:w-[280px] h-[140px]">
                                        <div className="absolute inset-0 bg-white rounded-lg"></div>
                                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px]">
                                            <div className="flex items-center gap-2 mb-3 w-full justify-between">
                                                <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-[#009EDB] text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                                    Workstreams
                                                </p>
                                                <Layers className="w-5 h-5 text-[#009EDB] flex-shrink-0 mr-[10px]" />
                                            </div>
                                            <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px]">
                                                {statsData.workstreams}
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Number of workstreams: {statsData.workstreams}</p>
                                </TooltipContent>
                            </Tooltip>

                            {/* Card 2 - Number of Workpackages */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative w-full sm:w-[280px] h-[140px]">
                                        <div className="absolute inset-0 bg-white rounded-lg"></div>
                                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px]">
                                            <div className="flex items-center gap-2 mb-3 w-full justify-between">
                                                <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-[#009EDB] text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                                    Work packages
                                                </p>
                                                <BriefcaseIcon className="w-5 h-5 text-[#009EDB] flex-shrink-0 mr-[10px]" />
                                            </div>
                                            <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px]">
                                                {statsData.workpackages}
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Number of work packages: {statsData.workpackages}</p>
                                </TooltipContent>
                            </Tooltip>

                            {/* Card 3 - Number of actions */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative w-full sm:w-[280px] h-[140px]">
                                        <div className="absolute inset-0 bg-white rounded-lg"></div>
                                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px]">
                                            <div className="flex items-center gap-2 mb-3 w-full justify-between">
                                                <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-[#009EDB] text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                                    Actions
                                                </p>
                                                <ListTodo className="w-5 h-5 text-[#009EDB] flex-shrink-0 mr-[10px]" />
                                            </div>
                                            <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px]">
                                                {statsData.actions}
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Number of actions: {statsData.actions}</p>
                                </TooltipContent>
                            </Tooltip>

                            {/* Card 4 - Number of leads */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="relative w-full sm:w-[280px] h-[140px]">
                                        <div className="absolute inset-0 bg-white rounded-lg"></div>
                                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0 pl-[26px]">
                                            <div className="flex items-center gap-2 mb-3 w-full justify-between">
                                                <p className="text-[17px] sm:text-[18px] md:text-[19px] font-normal text-[#009EDB] text-left leading-[21px] sm:leading-[23px] md:leading-[25px]">
                                                    UN system leaders
                                                </p>
                                                <Users className="w-5 h-5 text-[#009EDB] flex-shrink-0 mr-[10px]" />
                                            </div>
                                            <p className="text-[37px] sm:text-[43px] md:text-[49px] font-bold text-[#2E3440] text-left leading-[45px] sm:leading-[51px] md:leading-[57px]">
                                                {statsData.leads}
                                            </p>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Number of leads: {statsData.leads}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    </section>

                    {/* Work Packages Breakdown Section */}
                    <section className="mb-4 mt-6">
                        {/* Work Packages and Chart Section */}
                        <section className="flex flex-col lg:flex-row gap-6 items-start">
                            {/* Work Packages Collapsible */}
                            <div className="flex-1 w-full lg:max-w-[818px]">
                                <div className="flex items-center justify-between mb-3 flex-wrap gap-4">
                                    <h2 className="text-[22px] sm:text-[24px] md:text-[26px] font-bold text-black leading-[25px] flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-[#009EDB]" />
                                        Work packages
                                    </h2>

                                    {/* Advanced Filtering and Sort */}
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {/* Advanced Filtering Collapsible */}
                                        <Collapsible open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
                                            <CollapsibleTrigger className="flex items-center gap-1.5 text-[15px] font-medium text-slate-700 hover:text-[#009EDB] transition-colors px-2 py-1 rounded-[6px] hover:bg-slate-50">
                                                <span>Show advanced filters</span>
                                                <ChevronDown
                                                    className={`w-3 h-3 text-slate-600 transition-transform ${isAdvancedFilterOpen ? "transform rotate-180" : ""
                                                        }`}
                                                />
                                            </CollapsibleTrigger>
                                        </Collapsible>

                                        {/* Sort Option */}
                                        <div className="flex items-center">
                                            <Select value={sortOption} onValueChange={setSortOption}>
                                                <SelectTrigger className="w-[160px] h-[36px] text-[14px] border-0 rounded-[6px] bg-transparent transition-all hover:text-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:border-0">
                                                    <SelectValue placeholder="Sort" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-[8px] border-slate-200 shadow-lg bg-white p-1 min-w-[160px]">
                                                    <SelectItem
                                                        value="name-asc"
                                                        className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                                                    >
                                                        Name (A-Z)
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="name-desc"
                                                        className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                                                    >
                                                        Name (Z-A)
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="number-asc"
                                                        className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                                                    >
                                                        Number (1-31)
                                                    </SelectItem>
                                                    <SelectItem
                                                        value="number-desc"
                                                        className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                                                    >
                                                        Number (31-1)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Advanced Filters Content - Expands Below */}
                                {isAdvancedFilterOpen && (
                                    <div className="w-full mt-3 mb-3 bg-white border border-slate-200 rounded-[8px] p-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Work Package Filter */}
                                            <div className="flex flex-col gap-2">
                                                <Collapsible
                                                    open={openFilterCollapsibles.has('workPackage')}
                                                    onOpenChange={(open) => {
                                                        setOpenFilterCollapsibles(prev => {
                                                            const next = new Set(prev);
                                                            if (open) next.add('workPackage');
                                                            else next.delete('workPackage');
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <CollapsibleTrigger className="w-full flex items-center justify-between h-[40px] px-3 text-[15px] border border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Briefcase className="w-4 h-4 text-[#009EDB]" />
                                                            <span className="text-slate-700">{selectedWorkPackage || "Select work package"}</span>
                                                        </div>
                                                        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('workPackage') ? 'transform rotate-180' : ''}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-1 border border-slate-200 rounded-[8px] bg-white shadow-lg">
                                                        <div className="p-1 max-h-[200px] overflow-y-auto">
                                                            {uniqueWorkPackages.map((wp) => (
                                                                <div
                                                                    key={wp}
                                                                    onClick={() => {
                                                                        setSelectedWorkPackage(wp === selectedWorkPackage ? "" : wp);
                                                                        setOpenFilterCollapsibles(prev => {
                                                                            const next = new Set(prev);
                                                                            next.delete('workPackage');
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedWorkPackage === wp ? 'bg-[#E0F5FF] font-medium' : ''
                                                                        }`}
                                                                >
                                                                    {wp}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>

                                            {/* Work Package Leads Filter */}
                                            <div className="flex flex-col gap-2">
                                                <Collapsible
                                                    open={openFilterCollapsibles.has('lead')}
                                                    onOpenChange={(open) => {
                                                        setOpenFilterCollapsibles(prev => {
                                                            const next = new Set(prev);
                                                            if (open) next.add('lead');
                                                            else next.delete('lead');
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <CollapsibleTrigger className="w-full flex items-center justify-between h-[40px] px-3 text-[15px] border border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <User className="w-4 h-4 text-[#009EDB]" />
                                                            <span className="text-slate-700">{selectedLead || "Select work package lead"}</span>
                                                        </div>
                                                        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('lead') ? 'transform rotate-180' : ''}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-1 border border-slate-200 rounded-[8px] bg-white shadow-lg">
                                                        <div className="p-1 max-h-[200px] overflow-y-auto">
                                                            {uniqueLeads.map((lead) => (
                                                                <div
                                                                    key={lead}
                                                                    onClick={() => {
                                                                        setSelectedLead(lead === selectedLead ? "" : lead);
                                                                        setOpenFilterCollapsibles(prev => {
                                                                            const next = new Set(prev);
                                                                            next.delete('lead');
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedLead === lead ? 'bg-[#E0F5FF] font-medium' : ''
                                                                        }`}
                                                                >
                                                                    {lead}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>

                                            {/* Workstream Filter */}
                                            <div className="flex flex-col gap-2">
                                                <Collapsible
                                                    open={openFilterCollapsibles.has('workstream')}
                                                    onOpenChange={(open) => {
                                                        setOpenFilterCollapsibles(prev => {
                                                            const next = new Set(prev);
                                                            if (open) next.add('workstream');
                                                            else next.delete('workstream');
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <CollapsibleTrigger className="w-full flex items-center justify-between h-[40px] px-3 text-[15px] border border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Layers className="w-4 h-4 text-[#009EDB]" />
                                                            <span className="text-slate-700">{selectedWorkstream || "Select workstream"}</span>
                                                        </div>
                                                        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('workstream') ? 'transform rotate-180' : ''}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-1 border border-slate-200 rounded-[8px] bg-white shadow-lg">
                                                        <div className="p-1 max-h-[200px] overflow-y-auto">
                                                            {uniqueWorkstreams.map((ws) => (
                                                                <div
                                                                    key={ws}
                                                                    onClick={() => {
                                                                        setSelectedWorkstream(ws === selectedWorkstream ? "" : ws);
                                                                        setOpenFilterCollapsibles(prev => {
                                                                            const next = new Set(prev);
                                                                            next.delete('workstream');
                                                                            return next;
                                                                        });
                                                                    }}
                                                                    className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedWorkstream === ws ? 'bg-[#E0F5FF] font-medium' : ''
                                                                        }`}
                                                                >
                                                                    {ws}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>

                                            {/* Type Filter */}
                                            <div className="flex flex-col gap-2">
                                                <Collapsible
                                                    open={openFilterCollapsibles.has('type')}
                                                    onOpenChange={(open) => {
                                                        setOpenFilterCollapsibles(prev => {
                                                            const next = new Set(prev);
                                                            if (open) next.add('type');
                                                            else next.delete('type');
                                                            return next;
                                                        });
                                                    }}
                                                >
                                                    <CollapsibleTrigger className="w-full flex items-center justify-between h-[40px] px-3 text-[15px] border border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <Filter className="w-4 h-4 text-[#009EDB]" />
                                                            <span className="text-slate-700">
                                                                {selectedBigTicket === "big-ticket" ? '"Big Ticket" Work packages' :
                                                                    selectedBigTicket === "other" ? "Other Work packages" :
                                                                        "Select type"}
                                                            </span>
                                                        </div>
                                                        <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${openFilterCollapsibles.has('type') ? 'transform rotate-180' : ''}`} />
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent className="mt-1 border border-slate-200 rounded-[8px] bg-white shadow-lg">
                                                        <div className="p-1">
                                                            <div
                                                                onClick={() => {
                                                                    setSelectedBigTicket(selectedBigTicket === "big-ticket" ? "" : "big-ticket");
                                                                    setOpenFilterCollapsibles(prev => {
                                                                        const next = new Set(prev);
                                                                        next.delete('type');
                                                                        return next;
                                                                    });
                                                                }}
                                                                className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedBigTicket === "big-ticket" ? 'bg-[#E0F5FF] font-medium' : ''
                                                                    }`}
                                                            >
                                                                "Big Ticket" Work packages
                                                            </div>
                                                            <div
                                                                onClick={() => {
                                                                    setSelectedBigTicket(selectedBigTicket === "other" ? "" : "other");
                                                                    setOpenFilterCollapsibles(prev => {
                                                                        const next = new Set(prev);
                                                                        next.delete('type');
                                                                        return next;
                                                                    });
                                                                }}
                                                                className={`rounded-[6px] px-3 py-2 text-[15px] cursor-pointer hover:bg-[#E0F5FF] transition-colors ${selectedBigTicket === "other" ? 'bg-[#E0F5FF] font-medium' : ''
                                                                    }`}
                                                            >
                                                                Other Work packages
                                                            </div>
                                                        </div>
                                                    </CollapsibleContent>
                                                </Collapsible>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Search Bar */}
                                <div className="w-full mb-4">
                                    <div className="relative w-full sm:w-[770px] mb-2">
                                        <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#009EDB] pointer-events-none z-10" />
                                        <Input
                                            type="text"
                                            placeholder="Search for work package"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full h-[44px] text-[16px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[10px] text-slate-700 bg-white transition-all hover:border-b-[#009EDB]/60 focus:border-b-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                                        />
                                    </div>
                                    {(searchQuery || selectedWorkPackage || selectedLead || selectedWorkstream || selectedBigTicket) && (
                                        <div className="w-full sm:w-[770px]">
                                            <Button
                                                onClick={handleResetFilters}
                                                className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-1.5 h-[36px] rounded-[8px] text-[14px] font-semibold transition-all shadow-sm hover:shadow-md"
                                            >
                                                Reset
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full space-y-4">
                                    {filteredWorkPackages.map((wp, index) => {
                                        const collapsibleKey = `${wp.report.join('-')}-${wp.number || 'empty'}-${index}`;
                                        const isOpen = openCollapsibles.has(collapsibleKey);

                                        return (
                                            <Collapsible
                                                key={collapsibleKey}
                                                open={isOpen}
                                                onOpenChange={() => toggleCollapsible(collapsibleKey)}
                                            >
                                                <div className={`mb-20 last:mb-0 relative ${isOpen ? 'border-l-4 border-l-[#009EDB] border border-slate-200 rounded-[6px] bg-slate-50/50' : ''}`}>
                                                    <CollapsibleTrigger className={`w-full flex flex-col items-start px-0 py-0 hover:no-underline rounded-[6px] px-6 py-4 transition-all hover:bg-[#E0F5FF] border-0 ${isOpen ? 'rounded-b-none bg-slate-50/50' : 'bg-gray-50'}`}>
                                                        <div className="text-left min-w-0 mb-1 pr-20 sm:pr-8">
                                                            {wp.number ? (
                                                                <>
                                                                    <span className="text-[17px] font-medium text-gray-400 leading-[24px]">
                                                                        Work package {wp.number}:
                                                                    </span>
                                                                    <span className="text-[17px] font-medium text-slate-900 leading-[24px] ml-1">
                                                                        {wp.name}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="text-[17px] font-medium text-slate-900 leading-[24px]">
                                                                    {wp.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Goal from work package data */}
                                                        {wp.goal && (
                                                            <div className="mt-0.5 pr-8 text-left pl-0 py-2 mb-2">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Trophy className="w-4 h-4 text-[#009EDB]" />
                                                                    <p className="text-[14px] font-semibold text-[#009EDB] uppercase tracking-wide text-left">
                                                                        Goal
                                                                    </p>
                                                                </div>
                                                                <p className="text-[15px] text-slate-800 leading-[23px] mt-2 text-left normal-case">
                                                                    {formatGoalText(wp.goal)}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {/* Report Labels and Work Package Leads */}
                                                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                                                            {/* Workstream Labels */}
                                                            {wp.report.includes('WS1') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS1
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 1</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {wp.report.includes('WS2') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS2
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 2</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {wp.report.includes('WS3') && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <Layers className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                WS3
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Workstream 3</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                            {/* Work Package Leads */}
                                                            {wp.leads.length > 0 && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                            <User className="w-4 h-4 text-gray-600" />
                                                                            <p className="text-[15px] text-gray-600 leading-[20px]">
                                                                                {wp.leads.map((lead, idx) => {
                                                                                    const longForm = abbreviationMap[lead] || lead;
                                                                                    return (
                                                                                        <span key={idx}>
                                                                                            {idx > 0 && ', '}
                                                                                            <span title={longForm !== lead ? longForm : undefined}>
                                                                                                {lead}
                                                                                            </span>
                                                                                        </span>
                                                                                    );
                                                                                })}
                                                                            </p>
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            {wp.leads.map((lead, idx) => {
                                                                                const longForm = abbreviationMap[lead] || lead;
                                                                                return (
                                                                                    <span key={idx}>
                                                                                        {idx > 0 && ', '}
                                                                                        {longForm}
                                                                                    </span>
                                                                                );
                                                                            })}
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
                                                    </CollapsibleTrigger>
                                                    {/* Details Button */}
                                                    <button
                                                        type="button"
                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-[6px] text-[14px] font-medium transition-colors absolute top-4 right-2 sm:right-4"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleCollapsible(collapsibleKey);
                                                        }}
                                                    >
                                                        <Info className="w-3.5 h-3.5 text-gray-600" />
                                                        <span>Details</span>
                                                    </button>
                                                    <CollapsibleContent className={`px-0 pb-4 pt-4 pl-6 ${isOpen ? 'px-6' : ''}`}>
                                                        {wp.actions.length > 0 ? (
                                                            <div className="flex flex-col gap-4">
                                                                {/* Header */}
                                                                <div className="flex flex-col gap-2 mb-2">
                                                                    <h3 className="text-[17px] font-semibold text-slate-700 tracking-wider text-left">
                                                                        Indicative actions
                                                                    </h3>
                                                                </div>
                                                                {/* Display each indicative_activity in its own box */}
                                                                {wp.actions.map((action, idx) => (
                                                                    <div
                                                                        key={idx}
                                                                        className="bg-white border border-slate-200 rounded-[6px] p-5 transition-all hover:shadow-sm"
                                                                    >
                                                                        {/* Activity Number and Text */}
                                                                        <div className="flex items-start gap-3 mb-4">
                                                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#009EDB]/10 flex items-center justify-center mt-0.5">
                                                                                <span className="text-[13px] font-semibold text-[#009EDB]">
                                                                                    {idx + 1}
                                                                                </span>
                                                                            </div>
                                                                            <p className="text-[16px] font-medium text-slate-900 leading-[25px] flex-1">
                                                                                {action.text}
                                                                            </p>
                                                                        </div>

                                                                        {/* Work Package Leads - Icon + Text */}
                                                                        {action.leads.length > 0 && (
                                                                            <div className="ml-9 pt-3 border-t border-slate-100">
                                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                                    <Tooltip>
                                                                                        <TooltipTrigger asChild>
                                                                                            <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                                                                                <User className="w-4 h-4 text-gray-500" />
                                                                                                <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                                    {action.leads.map((lead, idx) => {
                                                                                                        const longForm = abbreviationMap[lead] || lead;
                                                                                                        return (
                                                                                                            <span key={idx}>
                                                                                                                {idx > 0 && ', '}
                                                                                                                <span title={longForm !== lead ? longForm : undefined}>
                                                                                                                    {lead}
                                                                                                                </span>
                                                                                                            </span>
                                                                                                        );
                                                                                                    })}
                                                                                                </p>
                                                                                            </div>
                                                                                        </TooltipTrigger>
                                                                                        <TooltipContent>
                                                                                            <p>
                                                                                                {action.leads.map((lead, idx) => {
                                                                                                    const longForm = abbreviationMap[lead] || lead;
                                                                                                    return (
                                                                                                        <span key={idx}>
                                                                                                            {idx > 0 && ', '}
                                                                                                            {longForm}
                                                                                                        </span>
                                                                                                    );
                                                                                                })}
                                                                                            </p>
                                                                                        </TooltipContent>
                                                                                    </Tooltip>
                                                                                    {action.documentParagraph && (
                                                                                        <div className="flex items-center gap-1.5">
                                                                                            <FileText className="w-3.5 h-3.5 text-gray-500" />
                                                                                            <span className="text-[14px] text-gray-600 leading-[21px]">
                                                                                                {wp.number === '31'
                                                                                                    ? `A/80/400`
                                                                                                    : action.report === 'WS3'
                                                                                                        ? `A/80/392 para. ${action.documentParagraph}`
                                                                                                        : action.report === 'WS2'
                                                                                                            ? `A/80/318 para. ${action.documentParagraph}`
                                                                                                            : action.report === 'WS1'
                                                                                                                ? `A/80/400`
                                                                                                                : `Para. ${action.documentParagraph}`}
                                                                                            </span>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                {/* Doc Text */}
                                                                                {action.docText && (
                                                                                    <div className="ml-[6px] pt-3 mt-3 border-t border-slate-100">
                                                                                        <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                            {action.docText}
                                                                                        </p>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        {/* Doc Text - when no leads */}
                                                                        {action.leads.length === 0 && action.docText && (
                                                                            <div className="ml-[6px] pt-3 border-t border-slate-100">
                                                                                <p className="text-[14px] text-gray-600 leading-[21px]">
                                                                                    {action.docText}
                                                                                </p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white border border-slate-200 rounded-[6px] p-[17px]">
                                                                <p className="text-[15px] font-normal text-slate-900 leading-[21px]">
                                                                    No actions available
                                                                </p>
                                                            </div>
                                                        )}
                                                    </CollapsibleContent>
                                                </div>
                                            </Collapsible>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Charts Container */}
                            <div className="w-full lg:w-[320px] flex-shrink-0 mt-6 lg:mt-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:ml-[calc((4*280px+3*16px)-818px-320px-24px)] flex flex-col gap-0">
                                {/* First Chart Section */}
                                <div className="bg-white p-4 sm:p-5 rounded-[8px]">
                                    <h3 className="text-[17px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Users className="w-5 h-5 text-[#009EDB]" />
                                        Work packages per lead
                                    </h3>
                                    <p className="text-[15px] text-slate-600 mb-3">
                                        Principals and number of related work packages
                                    </p>
                                    {/* Chart Search Bar */}
                                    <div className="relative w-full mb-4">
                                        <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#009EDB] pointer-events-none z-10" />
                                        <Input
                                            type="text"
                                            placeholder="Search entities"
                                            value={chartSearchQuery}
                                            onChange={(e) => setChartSearchQuery(e.target.value)}
                                            className="w-full h-[36px] text-[15px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[8px] text-slate-700 bg-white transition-all hover:border-b-[#009EDB]/60 focus:border-b-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                                        />
                                    </div>
                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto overflow-x-hidden">
                                        <table className="w-full">
                                            <tbody>
                                                {(showAllLeads ? chartData : chartData.slice(0, 3)).map((entry, index) => {
                                                    const maxCount = chartData.length > 0 ? Math.max(...chartData.map(d => d.count)) : 1;
                                                    const percentage = (entry.count / maxCount) * 100;
                                                    const isSelected = selectedLead === entry.lead;
                                                    const isFiltered = selectedLead && selectedLead !== entry.lead;
                                                    const displayedData = showAllLeads ? chartData : chartData.slice(0, 3);

                                                    return (
                                                        <tr
                                                            key={index}
                                                            onClick={() => {
                                                                // Toggle: if already selected, deselect; otherwise select
                                                                if (isSelected) {
                                                                    setSelectedLead("");
                                                                } else {
                                                                    setSelectedLead(entry.lead);
                                                                }
                                                            }}
                                                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${isFiltered ? 'opacity-30' : ''
                                                                } ${index < displayedData.length - 1 ? 'border-b border-slate-200' : ''}`}
                                                        >
                                                            <td className="py-3 pr-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="text-[14px] font-medium text-slate-900 flex-shrink-0 min-w-0">
                                                                        {entry.lead}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <span className={`text-[14px] font-semibold min-w-[20px] font-mono ${isSelected ? 'text-[#0076A4]' : 'text-[#009EDB]'
                                                                            }`}>
                                                                            {entry.count}
                                                                        </span>
                                                                        <div className="w-[120px] h-[8px] bg-slate-100 rounded-full overflow-hidden relative">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#0076A4]' : 'bg-[#009EDB]'
                                                                                    }`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {chartData.length > 3 && (
                                            <button
                                                onClick={() => setShowAllLeads(!showAllLeads)}
                                                className="w-full mt-3 py-2 text-[14px] text-left text-[#009EDB] hover:text-[#0076A4] transition-colors"
                                            >
                                                {showAllLeads ? 'Show less' : `Show more (${chartData.length - 3} more)`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Second Chart Section - Actions per Workstream */}
                                <div className="bg-white p-4 sm:p-5 rounded-[8px]">
                                    <h3 className="text-[17px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Layers className="w-5 h-5 text-[#009EDB]" />
                                        Actions per workstream
                                    </h3>
                                    <p className="text-[15px] text-slate-600 mb-3">
                                        Number of actions per workstream
                                    </p>
                                    {/* Chart Search Bar */}
                                    <div className="relative w-full mb-4">
                                        <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#009EDB] pointer-events-none z-10" />
                                        <Input
                                            type="text"
                                            placeholder="Search workstreams"
                                            value={workstreamChartSearchQuery}
                                            onChange={(e) => setWorkstreamChartSearchQuery(e.target.value)}
                                            className="w-full h-[36px] text-[15px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[8px] text-slate-700 bg-white transition-all hover:border-b-[#009EDB]/60 focus:border-b-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                                        />
                                    </div>
                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto overflow-x-hidden">
                                        <table className="w-full">
                                            <tbody>
                                                {(showAllWorkstreams ? workstreamChartData : workstreamChartData.slice(0, 3)).map((entry, index) => {
                                                    const maxCount = workstreamChartData.length > 0 ? Math.max(...workstreamChartData.map(d => d.count)) : 1;
                                                    const percentage = (entry.count / maxCount) * 100;
                                                    const isSelected = selectedWorkstream === entry.workstream;
                                                    const isFiltered = selectedWorkstream && selectedWorkstream !== entry.workstream;
                                                    const displayedData = showAllWorkstreams ? workstreamChartData : workstreamChartData.slice(0, 3);

                                                    return (
                                                        <tr
                                                            key={index}
                                                            onClick={() => {
                                                                // Toggle: if already selected, deselect; otherwise select
                                                                if (isSelected) {
                                                                    setSelectedWorkstream("");
                                                                } else {
                                                                    setSelectedWorkstream(entry.workstream);
                                                                }
                                                            }}
                                                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${isFiltered ? 'opacity-30' : ''
                                                                } ${index < displayedData.length - 1 ? 'border-b border-slate-200' : ''}`}
                                                        >
                                                            <td className="py-3 pr-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="text-[14px] font-medium text-slate-900 flex-shrink-0 min-w-0">
                                                                        {entry.workstream}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <span className={`text-[14px] font-semibold min-w-[20px] font-mono ${isSelected ? 'text-[#0076A4]' : 'text-[#009EDB]'
                                                                            }`}>
                                                                            {entry.count}
                                                                        </span>
                                                                        <div className="w-[120px] h-[8px] bg-slate-100 rounded-full overflow-hidden relative">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#0076A4]' : 'bg-[#009EDB]'
                                                                                    }`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {workstreamChartData.length > 3 && (
                                            <button
                                                onClick={() => setShowAllWorkstreams(!showAllWorkstreams)}
                                                className="w-full mt-3 py-2 text-[14px] text-left text-[#009EDB] hover:text-[#0076A4] transition-colors"
                                            >
                                                {showAllWorkstreams ? 'Show less' : `Show more (${workstreamChartData.length - 3} more)`}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Third Chart Section - Actions per Workpackage */}
                                <div className="bg-white p-4 sm:p-5 rounded-[8px]">
                                    <h3 className="text-[17px] font-semibold text-slate-900 mb-2 flex items-center gap-2">
                                        <Briefcase className="w-5 h-5 text-[#009EDB]" />
                                        Actions per work package
                                    </h3>
                                    <p className="text-[15px] text-slate-600 mb-3">
                                        Number of actions per work package
                                    </p>
                                    {/* Chart Search Bar */}
                                    <div className="relative w-full mb-4">
                                        <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#009EDB] pointer-events-none z-10" />
                                        <Input
                                            type="text"
                                            placeholder="Search work packages"
                                            value={workpackageChartSearchQuery}
                                            onChange={(e) => setWorkpackageChartSearchQuery(e.target.value)}
                                            className="w-full h-[36px] text-[15px] border-0 border-b border-slate-300 rounded-none pl-6 pr-4 py-[8px] text-slate-700 bg-white transition-all hover:border-b-[#009EDB]/60 focus:border-b-[#009EDB] focus:ring-0 focus:ring-offset-0 focus:shadow-none focus:outline-none shadow-none"
                                        />
                                    </div>
                                    <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto overflow-x-hidden">
                                        <table className="w-full">
                                            <tbody>
                                                {(showAllWorkpackages ? workpackageChartData : workpackageChartData.slice(0, 3)).map((entry, index) => {
                                                    const maxCount = workpackageChartData.length > 0 ? Math.max(...workpackageChartData.map(d => d.count)) : 1;
                                                    const percentage = (entry.count / maxCount) * 100;
                                                    const wpMatch = entry.workpackage.match(/^(\d+):/);
                                                    const wpNumber = wpMatch ? wpMatch[1] : null;
                                                    const wpName = wpMatch ? entry.workpackage.replace(/^\d+:\s*/, '') : entry.workpackage;
                                                    const wpOption = wpNumber ? `${wpNumber}: ${wpName}` : wpName;
                                                    const isSelected = selectedWorkPackage === wpOption;
                                                    const isFiltered = selectedWorkPackage && selectedWorkPackage !== wpOption;
                                                    const displayedData = showAllWorkpackages ? workpackageChartData : workpackageChartData.slice(0, 3);

                                                    return (
                                                        <tr
                                                            key={index}
                                                            onClick={() => {
                                                                // Toggle: if already selected, deselect; otherwise select
                                                                if (isSelected) {
                                                                    setSelectedWorkPackage("");
                                                                } else {
                                                                    setSelectedWorkPackage(wpOption);
                                                                }
                                                            }}
                                                            className={`cursor-pointer transition-colors hover:bg-slate-50 ${isFiltered ? 'opacity-30' : ''
                                                                } ${index < displayedData.length - 1 ? 'border-b border-slate-200' : ''}`}
                                                        >
                                                            <td className="py-3 pr-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    {wpNumber ? (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <span className="text-[14px] font-medium text-slate-900 flex-shrink-0 min-w-0 cursor-help">
                                                                                    WP: {wpNumber}
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>{wpName}</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <span className="text-[14px] font-medium text-slate-900 flex-shrink-0 min-w-0">
                                                                            Work package
                                                                        </span>
                                                                    )}
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <span className={`text-[14px] font-semibold min-w-[20px] font-mono ${isSelected ? 'text-[#0076A4]' : 'text-[#009EDB]'
                                                                            }`}>
                                                                            {entry.count}
                                                                        </span>
                                                                        <div className="w-[120px] h-[8px] bg-slate-100 rounded-full overflow-hidden relative">
                                                                            <div
                                                                                className={`h-full rounded-full transition-all ${isSelected ? 'bg-[#0076A4]' : 'bg-[#009EDB]'
                                                                                    }`}
                                                                                style={{ width: `${percentage}%` }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {workpackageChartData.length > 3 && (
                                            <button
                                                onClick={() => setShowAllWorkpackages(!showAllWorkpackages)}
                                                className="w-full mt-3 py-2 text-[14px] text-left text-[#009EDB] hover:text-[#0076A4] transition-colors"
                                            >
                                                {showAllWorkpackages ? 'Show less' : `Show more (${workpackageChartData.length - 3} more)`}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </section>
                </div>
            </div>
        </TooltipProvider>
    );
}


"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetchActions } from "@/lib/actions";
import type { Actions } from "@/types/action";
import { useEffect } from "react";
import { Package, CheckCircle, ListChecks, ClipboardCheck, ChevronDown, Users, FileText, User, Folder, Briefcase, Search, Layers, Briefcase as BriefcaseIcon, ListTodo } from "lucide-react";
import Image from "next/image";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Mapping of abbreviations to their long forms
const abbreviationMap: Record<string, string> = {
  'USG DPPA': 'Under-Secretary-General for Political and Peacebuilding Affairs',
  'USG DPO': 'Under-Secretary-General for Peace Operations',
  'USG OCHA': 'Under-Secretary-General for Humanitarian Affairs and Emergency Relief Coordinator',
  'USG': 'Under-Secretary-General',
  'DPPA': 'Department of Political and Peacebuilding Affairs',
  'DPO': 'Department of Peace Operations',
  'OCHA': 'Office for the Coordination of Humanitarian Affairs',
};

interface WorkPackageStats {
  total: number;
  completed: number;
  totalActions: number;
  completedActions: number;
}

interface NextMilestone {
  date: string;
  indicativeActivity: string;
}

export default function WorkPackagesPage() {
  const [actions, setActions] = useState<Actions>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
  const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(new Set());
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<WorkPackageStats>({
    total: 0,
    completed: 0,
    totalActions: 0,
    completedActions: 0,
  });
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  // Convert date string (ISO format or Excel serial) to Date object
  const parseDate = (dateStr: string | null): Date | null => {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Try parsing as ISO date string first (e.g., "2026-02-28")
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Try parsing as Excel serial number
    const serialNum = parseInt(dateStr);
    if (!isNaN(serialNum) && serialNum > 0) {
      const excelEpoch = new Date(1900, 0, 1);
      const days = serialNum - (serialNum > 59 ? 1 : 0) - 1;
      return new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    }
    
    return null;
  };

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
        actions: Array<{
          text: string;
          documentParagraph: string;
          leads: string[];
          report: string;
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

  // Calculate statistics
  const statsData = useMemo(() => {
    const uniqueWorkstreams = new Set<string>();
    const uniqueLeadsSet = new Set<string>();
    
    actions.forEach(action => {
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
      workpackages: workPackages.length,
      actions: actions.length,
      leads: uniqueLeadsSet.size,
    };
  }, [actions, workPackages]);

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
      const wpMatch = selectedWorkPackage.match(/^WP:\s*(\d+):/);
      if (wpMatch) {
        const wpNumber = wpMatch[1];
        filtered = filtered.filter((wp) => wp.number === wpNumber);
      } else {
        filtered = filtered.filter((wp) => !wp.number && wp.name === selectedWorkPackage.replace(/^WP:\s*/, ''));
      }
    }

    return filtered;
  }, [workPackages, selectedLead, selectedWorkstream, selectedWorkPackage]);

  // Get unique values for filters (filtered based on other selections)
  const uniqueWorkPackages = useMemo(() => {
    return Array.from(new Set(getFilteredWorkPackagesForOptions.map(wp => 
      wp.number ? `WP: ${wp.number}: ${wp.name}` : `WP: ${wp.name}`
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
        const currentCount = leadCounts.get(lead) || 0;
        leadCounts.set(lead, currentCount + 1);
      });
    });

    return Array.from(leadCounts.entries())
      .map(([lead, count]) => ({
        lead,
        count,
      }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
      .slice(0, 15); // Show top 15 leads
  }, [workPackages]);

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
      const wpMatch = selectedWorkPackage.match(/^WP:\s*(\d+):/);
      if (wpMatch) {
        const wpNumber = wpMatch[1];
        filtered = filtered.filter((wp) => wp.number === wpNumber);
      } else {
        // Handle work packages without numbers
        filtered = filtered.filter((wp) => !wp.number && wp.name === selectedWorkPackage.replace(/^WP:\s*/, ''));
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

    return filtered;
  }, [workPackages, searchQuery, selectedWorkPackage, selectedLead, selectedWorkstream]);

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
    <div className="min-h-screen bg-white">
      {/* Main Container - Left-aligned with consistent padding */}
      <div className="max-w-[1421px] mx-auto px-[101px] pt-8 pb-8">
        {/* Header Section */}
        <header className="mb-4 relative">
          <div className="absolute -top-8 right-0">
            <Image
              src={`${basePath}/images/UN_Logo_Horizontal_Black_English.svg`}
              alt="United Nations Logo"
              width={200}
              height={60}
              className="h-auto"
              priority
            />
          </div>
          <h1 className="text-[48px] font-bold text-black leading-[24px] mb-6 mt-12">
            UN80 Initiative
          </h1>
          <div className="text-[14px] text-black leading-[24px] max-w-[1093px]">
            <p className="mb-0">
              This Dashboard is an annex to the UN80 Initiative Action Plan: presents the detailed work packages across the three UN80 workstreams in a single reference.
            </p>
            <p className="mb-0">
              Furthermore, it is a consolidated work package document that lists all work packages and their designated leads, as well as their individual action items (derived from paragraphs in the SG's reports on UN80).
            </p>
          </div>
        </header>

        {/* Progress Section */}
        <section className="mb-0">
          <div className="flex gap-4 items-start flex-nowrap">
                {/* Card 1 - Number of Workstreams */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] font-bold text-[#009EDB] text-left leading-[24px]">
                            Number of Workstreams
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-black text-left leading-[56px]">
                          {statsData.workstreams}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of Workstreams: {statsData.workstreams}</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 2 - Number of Workpackages */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <BriefcaseIcon className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] font-bold text-[#009EDB] text-left leading-[24px]">
                            Number of Workpackages
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-black text-left leading-[56px]">
                          {statsData.workpackages}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of Workpackages: {statsData.workpackages}</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 3 - Number of actions */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <ListTodo className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] font-bold text-[#009EDB] text-left leading-[24px]">
                            Number of actions
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-black text-left leading-[56px]">
                          {statsData.actions}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of actions: {statsData.actions}</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 4 - Number of leads */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] font-bold text-[#009EDB] text-left leading-[24px]">
                            Number of leads
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-black text-left leading-[56px]">
                          {statsData.leads}
                        </p>
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
          <h2 className="text-[24px] font-bold text-black leading-[24px] mb-3 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-black" />
            Work Packages breakdown
          </h2>
          
          {/* Search Bar */}
          <div className="w-full max-w-[818px]">
            <div className="flex gap-3 items-start mb-4 flex-nowrap">
              <div className="flex gap-3 items-start">
                <div className="relative w-[600px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#009EDB] pointer-events-none z-10" />
                  <Input
                    type="text"
                    placeholder="Search for work package"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[44px] text-[15px] border border-slate-300 rounded-[8px] pl-[40px] pr-4 py-[10px] text-slate-700 bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20 focus:ring-offset-0"
                  />
                </div>
                <Button
                  onClick={handleResetFilters}
                  className="bg-gray-700 hover:bg-gray-800 text-white px-5 py-2 h-[44px] rounded-[8px] text-[14px] font-semibold shrink-0 transition-all shadow-sm hover:shadow-md flex items-center gap-2"
                >
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filtering Collapsible */}
          <div className="mb-4 w-[600px]">
            <Collapsible open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger className="flex items-center gap-2 text-[14px] font-medium text-slate-700 hover:text-[#009EDB] transition-colors px-2 py-1 rounded-[6px] hover:bg-slate-50">
                  <span>Advanced filtering</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-600 transition-transform ${
                      isAdvancedFilterOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-3">
                <div className="flex gap-3 items-center flex-nowrap">
                  <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
                    <SelectTrigger className="w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                      <SelectValue placeholder="Select Work Package" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[8px] border-slate-200 shadow-lg bg-white p-1 min-w-[190px]">
                      {uniqueWorkPackages.map((wp) => (
                        <SelectItem 
                          key={wp} 
                          value={wp}
                          className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                        >
                          {wp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedLead} onValueChange={setSelectedLead}>
                    <SelectTrigger className="w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                      <SelectValue placeholder="Select Work Package Lead" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[8px] border-slate-200 shadow-lg bg-white p-1 min-w-[190px]">
                      {uniqueLeads.map((lead) => (
                        <SelectItem 
                          key={lead} 
                          value={lead}
                          className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                        >
                          {lead}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedWorkstream} onValueChange={setSelectedWorkstream}>
                    <SelectTrigger className="w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                      <SelectValue placeholder="Select Workstream" />
                    </SelectTrigger>
                    <SelectContent className="rounded-[8px] border-slate-200 shadow-lg bg-white p-1 min-w-[190px]">
                      {uniqueWorkstreams.map((ws) => (
                        <SelectItem 
                          key={ws} 
                          value={ws}
                          className="rounded-[6px] px-3 py-2 text-[14px] cursor-pointer hover:bg-[#E0F5FF] focus:bg-[#E0F5FF] data-[highlighted]:bg-[#E0F5FF] transition-colors"
                        >
                          {ws}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </section>

        {/* Work Packages and Chart Section */}
        <section className="flex gap-6 items-start">
          {/* Work Packages Collapsible */}
          <div className="flex-1 max-w-[818px]">
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
                  <div className={`mb-20 last:mb-0 ${isOpen ? 'border-l-4 border-l-[#009EDB] border border-slate-200 rounded-[6px] bg-slate-50/50' : ''}`}>
                    <CollapsibleTrigger className={`w-full flex flex-col items-start px-0 py-0 hover:no-underline bg-slate-50 rounded-[6px] px-6 py-4 transition-all hover:bg-[#E0F5FF] border-0 relative ${isOpen ? 'rounded-b-none' : ''}`}>
                      {/* Workstream Labels - Top Right */}
                      <div className="absolute top-4 right-12 flex flex-row gap-2">
                        {wp.report.includes('WS2') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <Folder className="w-4 h-4 text-gray-600" />
                                <p className="text-[14px] text-gray-600 leading-[20px]">
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
                              <div className="flex items-center gap-2 cursor-help">
                                <Folder className="w-4 h-4 text-gray-600" />
                                <p className="text-[14px] text-gray-600 leading-[20px]">
                                  WS3
                                </p>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Workstream 3</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <div className="text-left min-w-0 mb-2 pr-8">
                        {wp.number ? (
                          <>
                            <span className="text-[16px] font-medium text-gray-400 leading-[24px]">
                              WP {wp.number}:
                            </span>
                            <span className="text-[16px] font-medium text-slate-900 leading-[24px] ml-1">
                              {wp.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[16px] font-medium text-gray-400 leading-[24px]">
                              WP:
                            </span>
                            <span className="text-[16px] font-medium text-slate-900 leading-[24px] ml-1">
                              {wp.name}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Work Package Leads - Underneath the text */}
                      {wp.leads.length > 0 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 cursor-help mb-2">
                              <User className="w-4 h-4 text-gray-600" />
                              <p className="text-[14px] text-gray-600 leading-[20px]">
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
                      {/* Goal from work package data */}
                      {wp.goal && (
                        <div className="mt-4 pr-8 text-left pl-0 py-2">
                          <p className="text-[13px] font-semibold text-[#009EDB] uppercase tracking-wide mb-1 text-left">
                            Goal
                          </p>
                          <p className="text-[14px] text-slate-800 leading-[22px] mt-2 italic text-left">
                            {wp.goal}
                          </p>
                        </div>
                      )}
                      <ChevronDown
                        className={`w-5 h-5 text-slate-600 transition-transform shrink-0 absolute top-4 right-4 ${
                          isOpen ? "transform rotate-180" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className={`px-0 pb-4 pt-4 pl-6 ${isOpen ? 'px-6' : ''}`}>
                      {wp.actions.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {/* Header */}
                          <div className="flex flex-col gap-2 mb-2">
                            <h3 className="text-[16px] font-semibold text-slate-700 uppercase tracking-wider text-left">
                              Indicative activities
                            </h3>
                            <div className="h-px w-full bg-gradient-to-r from-slate-300 via-slate-300 to-transparent"></div>
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
                                  <span className="text-[12px] font-semibold text-[#009EDB]">
                                    {idx + 1}
                                  </span>
                                </div>
                                <p className="text-[15px] font-medium text-slate-900 leading-[24px] flex-1">
                                  {action.text}
                                </p>
                              </div>
                              
                              {/* Work Package Leads - Icon + Text */}
                              {action.leads.length > 0 && (
                                <div className="ml-9 pt-3 border-t border-slate-100">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="flex items-center gap-2 cursor-help">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <p className="text-[13px] text-gray-600 leading-[20px]">
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
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white border border-slate-200 rounded-[6px] p-[17px]">
                          <p className="text-[14px] font-normal text-slate-900 leading-[20px]">
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

          {/* Chart Section */}
          <div className="w-[320px] flex-shrink-0 mt-0 border-l border-slate-200 pl-6" style={{ marginLeft: 'calc((4 * 280px + 3 * 16px) - 818px - 320px - 24px)' }}>
            <div className="bg-white p-5">
              <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#009EDB]" />
                Work Packages per Lead
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 30)}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    type="number" 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    type="category" 
                    dataKey="lead" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    width={120}
                  />
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [value, 'Work Packages']}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="#009EDB" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}


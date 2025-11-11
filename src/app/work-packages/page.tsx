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
import { Package, CheckCircle, ListChecks, ClipboardCheck, ChevronDown, Users, FileText, User, Briefcase, Search, Layers, Briefcase as BriefcaseIcon, ListTodo, Trophy } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, LabelList } from "recharts";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Mapping of abbreviations to their long forms
const abbreviationMap: Record<string, string> = {
  'USG DPPA': 'Under-Secretary-General for Political and Peacebuilding Affairs',
  'USG DPO': 'Under-Secretary-General for Peace Operations',
  'USG OCHA': 'Under-Secretary-General for Humanitarian Affairs and Emergency Relief Coordinator',
  'USG DESA': 'Under-Secretary-General for Economic and Social Affairs',
  'USG Policy': 'Under-Secretary-General for Policy',
  'USG UNODC': 'Under-Secretary-General for Drugs and Crime',
  'USG OCT': 'Under-Secretary-General for Counter-Terrorism',
  'USG UNEP': 'Under-Secretary-General for the UN Environment Programme',
  'USG UNU': 'Under-Secretary-General of the United Nations University',
  'USG DGACM': 'Under-Secretary-General for General Assembly and Conference Management',
  'USG ODA': 'Under-Secretary-General for Disarmament Affairs',
  'DSG': 'Deputy Secretary-General',
  'ASG DCO': 'Assistant Secretary-General for Development Coordination Office',
  'ASG UNITAR': 'Assistant Secretary-General for the UN Institute for Training and Research',
  'HC OHCHR': 'High Commissioner for Human Rights',
  'SG ITU': 'Secretary-General of the International Telecommunication Union',
  'Chair HLCM': 'Chair of the High-Level Committee on Management',
  'ED WFP': 'Executive Director of the World Food Programme',
  'ED UNOPS': 'Executive Director of the UN Office for Project Services',
  'ED UNFPA': 'Executive Director of the UN Population Fund',
  'ED UN Women': 'Executive Director of UN Women',
  'ED UNAIDS': 'Executive Director of UNAIDS',
  'ED UNICEF': 'Executive Director of UNICEF',
  'SA Reform': 'Special Adviser on Reform',
  'CDC': 'Chef de Cabinet',
  'Chair DTN': 'Chair of the Digital Transformation Network',
  'USG ECA': 'Under-Secretary-General of the Economic Commission for Africa',
  'SG': 'Secretary-General',
  'GA': 'General Assembly',
  'SC': 'Security Council',
  'ECOSOC': 'Economic and Social Council',
  'WS1': 'Workstream 1',
  'WS2': 'Workstream 2',
  'WS3': 'Workstream 3',
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
        bigTicket: boolean;
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
      .sort((a, b) => b.count - a.count); // Sort by count descending
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
      const wpMatch = selectedWorkPackage.match(/^WP:\s*(\d+):/);
      if (wpMatch) {
        const wpNumber = wpMatch[1];
        filteredActions = filteredActions.filter((action) => action.work_package_number === wpNumber);
      } else {
        filteredActions = filteredActions.filter((action) => !action.work_package_number && action.work_package_name === selectedWorkPackage.replace(/^WP:\s*/, ''));
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
        <div className="min-h-screen bg-gray-50">
      {/* Main Container - Left-aligned with consistent padding */}
      <div className="max-w-[1421px] mx-auto px-4 sm:px-6 md:px-8 lg:px-[101px] pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8">
        {/* Header Section */}
        <header className="mb-4 relative">
          <div className="mb-6 mt-8 sm:mt-10 md:mt-12">
            <h1 className="text-[32px] sm:text-[40px] md:text-[48px] lg:text-[56px] font-bold text-gray-800 leading-[40px] sm:leading-[48px] md:leading-[56px] lg:leading-[64px] tracking-[-0.02em] relative inline-block">
              <span className="relative z-10 bg-clip-text">UN80 Initiative</span>
              <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-gradient-to-r from-gray-400 via-gray-400/70 to-transparent rounded-full opacity-80"></span>
            </h1>
          </div>
          <div className="text-[15px] text-gray-600 leading-[26px] max-w-[1093px] mt-2">
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
                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] sm:text-[15px] md:text-[16px] font-bold text-[#009EDB] text-left leading-[20px] sm:leading-[22px] md:leading-[24px]">
                            Number of workstreams
                          </p>
                        </div>
                        <p className="text-[36px] sm:text-[42px] md:text-[48px] font-bold text-[#2E3440] text-left leading-[44px] sm:leading-[50px] md:leading-[56px]">
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
                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <BriefcaseIcon className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] sm:text-[15px] md:text-[16px] font-bold text-[#009EDB] text-left leading-[20px] sm:leading-[22px] md:leading-[24px]">
                            Number of workpackages
                          </p>
                        </div>
                        <p className="text-[36px] sm:text-[42px] md:text-[48px] font-bold text-[#2E3440] text-left leading-[44px] sm:leading-[50px] md:leading-[56px]">
                          {statsData.workpackages}
                        </p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of workpackages: {statsData.workpackages}</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 3 - Number of actions */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative w-full sm:w-[280px] h-[140px]">
                        <div className="absolute inset-0 bg-white rounded-lg"></div>
                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <ListTodo className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] sm:text-[15px] md:text-[16px] font-bold text-[#009EDB] text-left leading-[20px] sm:leading-[22px] md:leading-[24px]">
                            Number of actions
                          </p>
                        </div>
                        <p className="text-[36px] sm:text-[42px] md:text-[48px] font-bold text-[#2E3440] text-left leading-[44px] sm:leading-[50px] md:leading-[56px]">
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
                        <div className="relative flex flex-col items-start justify-start w-full h-full bg-[#009EDB]/10 rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-5 h-5 text-[#009EDB]" />
                          <p className="text-[14px] sm:text-[15px] md:text-[16px] font-bold text-[#009EDB] text-left leading-[20px] sm:leading-[22px] md:leading-[24px]">
                            Number of leads
                          </p>
                        </div>
                        <p className="text-[36px] sm:text-[42px] md:text-[48px] font-bold text-[#2E3440] text-left leading-[44px] sm:leading-[50px] md:leading-[56px]">
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
              <div className="w-full bg-white rounded-[8px] p-4 sm:p-5 md:p-6">
                <h2 className="text-[20px] sm:text-[22px] md:text-[24px] font-bold text-black leading-[24px] mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 sm:w-6 sm:h-6 text-black" />
                  Work packages
                </h2>
                
                {/* Search Bar */}
                <div className="w-full mb-4">
                  <div className="relative w-full sm:w-[770px] mb-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#009EDB] pointer-events-none z-10" />
                    <Input
                      type="text"
                      placeholder="Search for work package"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-[44px] text-[15px] border border-slate-300 rounded-[8px] pl-[40px] pr-4 py-[10px] text-slate-700 bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20 focus:ring-offset-0"
                    />
                  </div>
                  {(searchQuery || selectedWorkPackage || selectedLead || selectedWorkstream) && (
                    <div className="w-full sm:w-[770px]">
                      <Button
                        onClick={handleResetFilters}
                        className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-1.5 h-[36px] rounded-[8px] text-[13px] font-semibold transition-all shadow-sm hover:shadow-md"
                      >
                        Reset
                      </Button>
                    </div>
                  )}
                </div>

                {/* Advanced Filtering Collapsible */}
                <div className="mb-4 w-full sm:w-[600px]">
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
                      <div className="flex flex-col sm:flex-row gap-3 items-center flex-wrap">
                        <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
                          <SelectTrigger className="w-full sm:w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                            <SelectValue placeholder="Select work package" />
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
                          <SelectTrigger className="w-full sm:w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                            <SelectValue placeholder="Select work package lead" />
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
                          <SelectTrigger className="w-full sm:w-[190px] h-[40px] text-[14px] border-slate-300 rounded-[8px] bg-white transition-all hover:border-[#009EDB]/60 hover:shadow-sm focus:border-[#009EDB] focus:ring-2 focus:ring-[#009EDB]/20">
                            <SelectValue placeholder="Select workstream" />
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

                {/* Legend */}
                <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-gray-50 rounded-[6px]">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gray-50 border border-gray-300"></div>
                    <span className="text-[13px] text-slate-700 font-medium">"Big Ticket" Work packages</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300"></div>
                    <span className="text-[13px] text-slate-700 font-medium">Other Work packages</span>
                  </div>
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
                  <div className={`mb-20 last:mb-0 ${isOpen ? 'border-l-4 border-l-[#009EDB] border border-slate-200 rounded-[6px] bg-slate-50/50' : ''}`}>
                    <CollapsibleTrigger className={`w-full flex flex-col items-start px-0 py-0 hover:no-underline rounded-[6px] px-6 py-4 transition-all hover:bg-[#E0F5FF] border-0 relative ${isOpen ? 'rounded-b-none bg-slate-50/50' : wp.bigTicket ? 'bg-gray-50' : 'bg-gray-200'}`}>
                          {/* Workstream Labels - Top Right */}
                          <div className="absolute top-4 right-4 sm:right-12 flex flex-row gap-1 sm:gap-2">
                        {wp.report.includes('WS1') && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1 sm:gap-2 cursor-help">
                                <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                                <p className="text-[12px] sm:text-[14px] text-gray-600 leading-[20px]">
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
                                <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                                <p className="text-[12px] sm:text-[14px] text-gray-600 leading-[20px]">
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
                                <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                                <p className="text-[12px] sm:text-[14px] text-gray-600 leading-[20px]">
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
                      <div className="text-left min-w-0 mb-2 pr-20 sm:pr-8">
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
                        <div className="mt-2 pr-8 text-left pl-0 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-[#009EDB]" />
                            <p className="text-[13px] font-semibold text-[#009EDB] uppercase tracking-wide text-left">
                              Goal
                            </p>
                          </div>
                          <p className="text-[14px] text-slate-800 leading-[22px] mt-2 italic text-left">
                            {wp.goal}
                          </p>
                        </div>
                      )}
                          <ChevronDown
                            className={`w-4 h-4 sm:w-5 sm:h-5 text-slate-600 transition-transform shrink-0 absolute top-4 right-2 sm:right-4 ${
                              isOpen ? "transform rotate-180" : ""
                            }`}
                          />
                    </CollapsibleTrigger>
                    <CollapsibleContent className={`px-0 pb-4 pt-4 pl-6 ${isOpen ? 'px-6' : ''}`}>
                      {wp.actions.length > 0 ? (
                        <div className="flex flex-col gap-4">
                          {/* Header */}
                          <div className="flex flex-col gap-2 mb-2">
                            <h3 className="text-[16px] font-semibold text-slate-700 tracking-wider text-left">
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
          </div>

          {/* Chart Section */}
          <div className="w-full lg:w-[320px] flex-shrink-0 mt-6 lg:mt-0 lg:border-l lg:border-slate-200 lg:pl-6 lg:ml-[calc((4*280px+3*16px)-818px-320px-24px)]">
            <div className="bg-white p-4 sm:p-5 rounded-[8px]">
              <h3 className="text-[16px] font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#009EDB]" />
                Work packages per lead
              </h3>
              <div className="h-[300px] sm:h-[350px] md:h-[400px] overflow-y-auto overflow-x-hidden">
                <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 25)}>
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} vertical={true} />
                    <XAxis 
                      type="number" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      stroke="#cbd5e1"
                    />
                    <YAxis 
                      type="category" 
                      dataKey="lead" 
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickLine={false}
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
                    <Bar 
                      dataKey="count" 
                      radius={[0, 4, 4, 0]} 
                      barSize={20}
                      onClick={(data: any) => {
                        if (data && data.lead) {
                          const clickedLead = data.lead;
                          // Toggle: if already selected, deselect; otherwise select
                          if (selectedLead === clickedLead) {
                            setSelectedLead("");
                          } else {
                            setSelectedLead(clickedLead);
                          }
                        }
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <LabelList 
                        dataKey="count" 
                        position="right" 
                        style={{ fill: '#64748b', fontSize: '11px', fontWeight: '500' }}
                      />
                      {chartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={selectedLead === entry.lead ? "#0076A4" : "#009EDB"}
                          style={{ opacity: selectedLead && selectedLead !== entry.lead ? 0.3 : 1 }}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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


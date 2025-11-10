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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
  const [openCollapsibles, setOpenCollapsibles] = useState<Set<string>>(new Set());
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState<boolean>(false);
  const [stats, setStats] = useState<WorkPackageStats>({
    total: 30,
    completed: 2,
    totalActions: 0,
    completedActions: 0,
  });
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  // Convert Excel serial date to readable date format
  const excelDateToDate = (serial: string): Date | null => {
    if (!serial || serial.trim() === '') return null;
    const serialNum = parseInt(serial);
    if (isNaN(serialNum)) return null;
    // Excel epoch starts on January 1, 1900
    const excelEpoch = new Date(1900, 0, 1);
    // Excel incorrectly treats 1900 as a leap year, so subtract 1 day for dates after Feb 28, 1900
    const days = serialNum - (serialNum > 59 ? 1 : 0) - 1;
    const result = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
    return result;
  };

  // Format date to DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

      useEffect(() => {
        fetchActions()
          .then((data) => {
            setActions(data);
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
            const milestones = data
              .filter(a => a.first_milestone && a.first_milestone.trim() !== '' && a.indicative_activity)
              .map(a => {
                const milestoneDate = excelDateToDate(a.first_milestone);
                return milestoneDate ? {
                  date: milestoneDate,
                  indicativeActivity: a.indicative_activity,
                } : null;
              })
              .filter((m): m is { date: Date; indicativeActivity: string } => m !== null)
              .filter(m => m.date >= today)
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
        // Parse leads - they use semicolons or commas as separators
        const leads = action.work_package_leads
          ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
          : [];
        
        wpMap.set(key, {
          report: [action.report],
          number: action.work_package_number || '',
          name: action.work_package_name,
          leads: leads,
          actions: [],
        });
      }
      const wp = wpMap.get(key)!;
      
      // Add report if not already included
      if (!wp.report.includes(action.report)) {
        wp.report.push(action.report);
      }
      
      // Merge leads from all reports
      const newLeads = action.work_package_leads
        ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
        : [];
      newLeads.forEach(lead => {
        if (!wp.leads.includes(lead)) {
          wp.leads.push(lead);
        }
      });
      
      // Add indicative activity if not already included
      if (action.indicative_activity) {
        const existingAction = wp.actions.find(a => a.text === action.indicative_activity && a.report === action.report);
        if (!existingAction) {
          // Parse leads for this specific action
          const actionLeads = action.work_package_leads
            ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
            : [];
          
          wp.actions.push({
            text: action.indicative_activity,
            documentParagraph: action.document_paragraph || '',
            leads: actionLeads,
            report: action.report,
          });
        } else {
          // Merge leads if action already exists
          const actionLeads = action.work_package_leads
            ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
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

  // Get unique values for filters
  const uniqueWorkPackages = useMemo(() => {
    return Array.from(new Set(workPackages.map(wp => 
      wp.number ? `${wp.number}: ${wp.name}` : wp.name
    ))).sort();
  }, [workPackages]);

  const uniqueLeads = useMemo(() => {
    const leads = new Set<string>();
    workPackages.forEach(wp => {
      wp.leads.forEach(lead => leads.add(lead));
    });
    return Array.from(leads).sort();
  }, [workPackages]);

  const uniqueWorkstreams = useMemo(() => {
    const workstreams = new Set<string>();
    workPackages.forEach(wp => {
      wp.report.forEach(ws => workstreams.add(ws));
    });
    return Array.from(workstreams).sort();
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

    return filtered;
  }, [workPackages, searchQuery, selectedWorkPackage, selectedLead, selectedWorkstream]);

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
            UN80 Initiative Dashboard
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
                          <Layers className="w-5 h-5 text-[#0076A4]" />
                          <p className="text-[14px] font-bold text-[#0076A4] text-left leading-[24px]">
                            Number of Workstreams
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-[#0076A4] text-left leading-[56px]">
                          3
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of Workstreams: 3</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 2 - Number of Workpackages */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <BriefcaseIcon className="w-5 h-5 text-[#0076A4]" />
                          <p className="text-[14px] font-bold text-[#0076A4] text-left leading-[24px]">
                            Number of Workpackages
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-[#0076A4] text-left leading-[56px]">
                          31
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of Workpackages: 31</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 3 - Number of actions */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <ListTodo className="w-5 h-5 text-[#0076A4]" />
                          <p className="text-[14px] font-bold text-[#0076A4] text-left leading-[24px]">
                            Number of actions
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-[#0076A4] text-left leading-[56px]">
                          90
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of actions: 90</p>
                    </TooltipContent>
                  </Tooltip>

                {/* Card 4 - Number of leads */}
                <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative flex flex-col items-start justify-start w-[280px] h-[140px] bg-[#E0F5FF] rounded-lg px-4 py-6 transition-all hover:scale-[1.02] cursor-pointer border-0">
                        <div className="flex items-center gap-2 mb-3">
                          <Users className="w-5 h-5 text-[#0076A4]" />
                          <p className="text-[14px] font-bold text-[#0076A4] text-left leading-[24px]">
                            Number of leads
                          </p>
                        </div>
                        <p className="text-[48px] font-bold text-[#0076A4] text-left leading-[56px]">
                          tbd
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Number of leads: tbd</p>
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
          <div className="w-[818px]">
            <div className="flex gap-[8px] items-start mb-3 flex-wrap">
              <div className="flex gap-[8px] items-start flex-1">
                <div className="flex-1 relative">
                  <Search className="absolute left-0 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search for work package"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-[40px] text-[16px] border-0 border-b border-slate-300 rounded-none pl-[32px] pr-[56px] py-[8px] text-slate-400 bg-white transition-all hover:border-b-[#0076A4]/50 focus:border-b-[#0076A4] focus:ring-0"
                  />
                </div>
                <Button
                  onClick={handleResetFilters}
                  className="bg-[#0076A4] hover:bg-[#006a94] text-white px-4 py-2 h-[40px] rounded-[6px] text-[14px] font-medium shrink-0 transition-all"
                >
                  Reset
                </Button>
              </div>
            </div>
          </div>

          {/* Advanced Filtering Collapsible */}
          <div className="mb-3 w-[818px]">
            <Collapsible open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
              <div className="flex items-center gap-2">
                <CollapsibleTrigger className="flex items-center gap-2 text-[14px] text-slate-700 hover:text-slate-900 transition-colors">
                  <span>Advanced filtering</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-600 transition-transform ${
                      isAdvancedFilterOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="mt-3">
                <div className="flex gap-[8px] items-center flex-nowrap w-full">
                  <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
                    <SelectTrigger className="w-[267px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
                      <SelectValue placeholder="Select Work Package" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueWorkPackages.map((wp) => (
                        <SelectItem key={wp} value={wp}>
                          {wp}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedLead} onValueChange={setSelectedLead}>
                    <SelectTrigger className="w-[267px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
                      <SelectValue placeholder="Select Work Package Lead" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueLeads.map((lead) => (
                        <SelectItem key={lead} value={lead}>
                          {lead}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedWorkstream} onValueChange={setSelectedWorkstream}>
                    <SelectTrigger className="w-[267px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
                      <SelectValue placeholder="Select Workstream" />
                    </SelectTrigger>
                    <SelectContent>
                      {uniqueWorkstreams.map((ws) => (
                        <SelectItem key={ws} value={ws}>
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

        {/* Work Packages Collapsible */}
        <section className="w-[818px]">
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
                  <div className={`mb-20 last:mb-0 ${isOpen ? 'border border-slate-200 rounded-[6px] bg-slate-50/50' : ''}`}>
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
                      <div className="flex flex-row gap-3 flex-wrap mb-2">
                        {wp.leads.length > 0 && wp.leads.map((lead, leadIdx) => {
                          const longForm = abbreviationMap[lead] || lead;
                          return (
                            <Tooltip key={leadIdx}>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-help">
                                  <User className="w-4 h-4 text-gray-600" />
                                  <p className="text-[14px] text-gray-600 leading-[20px]">
                                    {lead}
                                  </p>
                                </div>
                              </TooltipTrigger>
                              {longForm !== lead && (
                                <TooltipContent>
                                  <p>{longForm}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          );
                        })}
                      </div>
                      {/* Goal for first Work Package */}
                      {index === 0 && (
                        <div className="mt-3 pr-8 text-left">
                          <p className="text-[14px] text-slate-700 leading-[20px] italic text-left">
                            We make peace operations leaner and more effective by assigning civilian tasks to the entities best equipped to deliver them, ensuring seamless transitions and lasting stability.
                          </p>
                        </div>
                      )}
                      {/* Goal for New Humanitarian Compact Work Package */}
                      {wp.name.toLowerCase().includes('humanitarian compact') && (
                        <div className="mt-3 pr-8 text-left">
                          <p className="text-[14px] text-slate-700 leading-[20px] italic text-left">
                            Rebuild trust in humanitarian action through faster, simpler, and more united response that reaches millions more people with the same resources.
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
                        <div className="flex flex-col gap-3">
                          {/* Header */}
                          <h3 className="text-[16px] font-bold text-slate-900 leading-[24px] mb-2">
                            Indicative activities
                          </h3>
                          {/* Display each indicative_activity in its own box */}
                          {wp.actions.map((action, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200 rounded-[6px] p-4 transition-all hover:border-[#0076A4]/30"
                            >
                              {/* Indicative Activity Text */}
                              <p className="text-[14px] font-medium text-slate-900 leading-[20px] mb-3">
                                {action.text}
                              </p>
                              
                              {/* Work Package Leads - Icon + Text */}
                              {action.leads.length > 0 && (
                                <div className="flex flex-row gap-3 flex-wrap">
                                  {action.leads.map((lead, leadIdx) => {
                                    const longForm = abbreviationMap[lead] || lead;
                                    return (
                                      <Tooltip key={leadIdx}>
                                        <TooltipTrigger asChild>
                                          <div className="flex items-center gap-2 cursor-help">
                                            <User className="w-4 h-4 text-gray-600" />
                                            <p className="text-[14px] text-gray-600 leading-[20px]">
                                              {lead}
                                            </p>
                                          </div>
                                        </TooltipTrigger>
                                        {longForm !== lead && (
                                          <TooltipContent>
                                            <p>{longForm}</p>
                                          </TooltipContent>
                                        )}
                                      </Tooltip>
                                    );
                                  })}
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
        </section>
      </div>
    </div>
  );
}


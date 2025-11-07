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
import { Package, CheckCircle, ListChecks, ClipboardCheck, ChevronDown, Users, FileText } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

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
  const [stats, setStats] = useState<WorkPackageStats>({
    total: 30,
    completed: 2,
    totalActions: 0,
    completedActions: 0,
  });
  const [nextMilestone, setNextMilestone] = useState<NextMilestone | null>(null);

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
        const existingAction = wp.actions.find(a => a.text === action.indicative_activity);
        if (!existingAction) {
          // Parse leads for this specific action
          const actionLeads = action.work_package_leads
            ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
            : [];
          
          wp.actions.push({
            text: action.indicative_activity,
            documentParagraph: action.document_paragraph || '',
            leads: actionLeads,
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
      <div className="max-w-[1421px] mx-auto px-[101px] py-8">
        {/* Header Section */}
        <header className="mb-4">
          <h1 className="text-[48px] font-bold text-black leading-[24px] mb-6">
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
          <h2 className="text-[14px] font-normal text-black leading-[24px] mb-3">
            Progress
          </h2>
          <div className="flex gap-4 items-start flex-nowrap">
            {/* Work packages completed */}
            <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6 shadow-sm border border-[#0076A4]/10 transition-all hover:shadow-lg hover:border-[#0076A4]/50 hover:scale-[1.02] cursor-pointer">
                    <Package className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
                    <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                      Work packages completed
                    </p>
                    <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                      {stats.completed}/{stats.total}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Work packages completed: {stats.completed}/{stats.total}</p>
                </TooltipContent>
              </Tooltip>

              {/* Actions completed */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6 shadow-sm border border-[#0076A4]/10 transition-all hover:shadow-lg hover:border-[#0076A4]/50 hover:scale-[1.02] cursor-pointer">
                    <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
                    <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                      Actions completed
                    </p>
                    <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                      {stats.completedActions}/{stats.totalActions}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actions completed: {stats.completedActions}/{stats.totalActions}</p>
                </TooltipContent>
              </Tooltip>

              {/* Actions leads assigned */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6 shadow-sm border border-[#0076A4]/10 transition-all hover:shadow-lg hover:border-[#0076A4]/50 hover:scale-[1.02] cursor-pointer">
                    <ListChecks className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
                    <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                      Actions leads assigned
                    </p>
                    <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                      0
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actions leads assigned: 0</p>
                </TooltipContent>
              </Tooltip>

              {/* Actions support assigned */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6 shadow-sm border border-[#0076A4]/10 transition-all hover:shadow-lg hover:border-[#0076A4]/50 hover:scale-[1.02] cursor-pointer">
                    <ClipboardCheck className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
                    <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                      Actions support assigned
                    </p>
                    <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                      0
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Actions support assigned: 0</p>
                </TooltipContent>
              </Tooltip>

              {/* Card 5 - Next Upcoming Milestone */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex flex-col justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6 shadow-sm border border-[#0076A4]/10 transition-all hover:shadow-lg hover:border-[#0076A4]/50 hover:scale-[1.02] cursor-pointer">
                    <Users className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
                    <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-3">
                      Next upcoming milestone:
                    </p>
                    {nextMilestone ? (
                      <div className="flex flex-col gap-2 items-center">
                        <p className="text-[16px] font-bold text-[#0076A4] text-center leading-[20px]">
                          {nextMilestone.date}
                        </p>
                        <p className="text-[12px] font-medium text-[#0076A4] text-center leading-[16px] line-clamp-3">
                          {nextMilestone.indicativeActivity}
                        </p>
                      </div>
                    ) : (
                      <p className="text-[16px] font-medium text-[#0076A4] text-center leading-[20px]">
                        No upcoming milestones
                      </p>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-bold mb-1">Next upcoming milestone:</p>
                  {nextMilestone ? (
                    <>
                      <p className="font-bold">{nextMilestone.date}</p>
                      <p className="text-sm">{nextMilestone.indicativeActivity}</p>
                    </>
                  ) : (
                    <p>No upcoming milestones</p>
                  )}
                </TooltipContent>
              </Tooltip>
          </div>
          
          {/* Card 6 - Progress Bar (Full Width) */}
          <div className="flex flex-col gap-3 w-full mt-4">
            <div className="flex justify-between items-center text-[12px] font-medium text-[#0076A4]">
              <span>31/10/2026</span>
              <span className="text-[14px] font-bold">Final milestone (31/12/2026)</span>
            </div>
            <div className="w-full h-6 bg-white rounded-full border border-[#0076A4]/30 overflow-hidden relative">
              <div 
                className="h-full bg-[#0076A4] rounded-full transition-all"
                style={{ width: '50%' }}
              />
            </div>
          </div>
        </section>

        {/* Work Packages Breakdown Section */}
        <section className="mb-4 mt-6">
          <h2 className="text-[24px] font-bold text-black leading-[24px] mb-3">
            Work Packages breakdown
          </h2>
          
          {/* Filters Row */}
          <div className="flex gap-[8px] items-center mb-3 flex-wrap">
            <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white shadow-xs transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
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
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white shadow-xs transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
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
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px] bg-white shadow-xs transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4]">
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

          {/* Search Bar */}
          <div className="flex gap-[8px] items-start w-[384px]">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search for work package"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[40px] text-[16px] border-slate-300 rounded-[6px] pl-[12px] pr-[56px] py-[8px] text-slate-400 bg-white shadow-xs transition-all hover:border-[#0076A4]/50 focus:border-[#0076A4] focus:ring-2 focus:ring-[#0076A4]/20"
              />
            </div>
            <Button
              onClick={handleResetFilters}
              className="bg-[#0076A4] hover:bg-[#006a94] text-white px-4 py-2 h-[40px] rounded-[6px] text-[14px] font-medium shrink-0 shadow-sm transition-all hover:shadow-md"
            >
              Reset
            </Button>
          </div>
        </section>

        {/* Work Packages Collapsible */}
        <section className="w-[818px]">
          <div className="w-full">
            {filteredWorkPackages.map((wp, index) => {
              const collapsibleKey = `${wp.report.join('-')}-${wp.number || 'empty'}-${index}`;
              const isOpen = openCollapsibles.has(collapsibleKey);
              
              return (
                <Collapsible
                  key={collapsibleKey}
                  open={isOpen}
                  onOpenChange={() => toggleCollapsible(collapsibleKey)}
                >
                  <div className="border border-slate-200 bg-slate-50 rounded-[6px] px-6 py-4 mb-4 last:mb-0 shadow-sm transition-all hover:shadow-md hover:border-[#0076A4]/30">
                    <CollapsibleTrigger className="w-full flex items-center justify-between px-0 py-0 hover:no-underline">
                      <div className="flex items-center gap-[18px] w-full pr-4 flex-wrap">
                        <p className="flex-1 text-[16px] font-medium text-slate-900 leading-[24px] text-left min-w-0">
                          {wp.number ? `Work Package ${wp.number}: ${wp.name}` : `Work Package: ${wp.name}`}
                        </p>
                        {/* Work Package Leads as Badges */}
                        {wp.leads.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {wp.leads.map((lead, leadIdx) => (
                              <Badge
                                key={leadIdx}
                                className="bg-[#0076a4] text-white px-3 py-1 h-auto rounded-[6px] text-[12px] font-medium border-0 shadow-sm transition-all hover:bg-[#006a94] hover:shadow-md"
                              >
                                {lead}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-slate-600 transition-transform shrink-0 ${
                          isOpen ? "transform rotate-180" : ""
                        }`}
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="px-0 pb-0 pt-4">
                      {wp.actions.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {/* Display each indicative_activity in its own box */}
                          {wp.actions.map((action, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-slate-200 rounded-[6px] p-4 shadow-sm transition-all hover:shadow-md hover:border-[#0076A4]/30"
                            >
                              {/* Indicative Activity Text */}
                              <p className="text-[14px] font-medium text-slate-900 leading-[20px] mb-3">
                                {action.text}
                              </p>
                              
                              {/* Work Package Leads as Badges */}
                              {action.leads.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {action.leads.map((lead, leadIdx) => (
                                    <Badge
                                      key={leadIdx}
                                      className="bg-[#0076a4] text-white px-3 py-1 h-auto rounded-[6px] text-[12px] font-medium border-0 shadow-sm transition-all hover:bg-[#006a94] hover:shadow-md"
                                    >
                                      {lead}
                                    </Badge>
                                  ))}
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


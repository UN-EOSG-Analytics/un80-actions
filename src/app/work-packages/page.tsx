"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { fetchActions } from "@/lib/actions";
import type { Actions } from "@/types/action";
import { useEffect } from "react";
import { Package, CheckCircle, ListChecks, ClipboardCheck } from "lucide-react";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

interface WorkPackageStats {
  total: number;
  completed: number;
  totalActions: number;
  completedActions: number;
}

export default function WorkPackagesPage() {
  const [actions, setActions] = useState<Actions>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
  const [stats, setStats] = useState<WorkPackageStats>({
    total: 30,
    completed: 2,
    totalActions: 0,
    completedActions: 0,
  });

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
      })
      .catch((error) => {
        console.error("Failed to fetch actions:", error);
      });
  }, []);

  // Group actions by work package
  const workPackages = useMemo(() => {
    const wpMap = new Map<
      string,
      {
        report: string;
        number: string;
        name: string;
        leads: string[];
        actions: Array<{
          text: string;
          documentParagraph: string;
        }>;
      }
    >();

    actions.forEach((action) => {
      const key = `${action.report}-${action.work_package_number || 'empty'}`;
      if (!wpMap.has(key)) {
        // Parse leads - they use semicolons or commas as separators
        const leads = action.work_package_leads
          ? action.work_package_leads.split(/[;,]/).map(lead => lead.trim()).filter(lead => lead.length > 0)
          : [];
        
        wpMap.set(key, {
          report: action.report,
          number: action.work_package_number || '',
          name: action.work_package_name,
          leads: leads,
          actions: [],
        });
      }
      const wp = wpMap.get(key)!;
      if (action.indicative_activity && !wp.actions.some(a => a.text === action.indicative_activity)) {
        wp.actions.push({
          text: action.indicative_activity,
          documentParagraph: action.document_paragraph || '',
        });
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
    return Array.from(new Set(workPackages.map(wp => wp.report))).sort();
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
      filtered = filtered.filter((wp) => wp.report === selectedWorkstream);
    }

    return filtered;
  }, [workPackages, searchQuery, selectedWorkPackage, selectedLead, selectedWorkstream]);

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedWorkPackage("");
    setSelectedLead("");
    setSelectedWorkstream("");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Main Container - Left-aligned with consistent padding */}
      <div className="max-w-[1421px] mx-auto px-[101px] py-8">
        {/* Header Section */}
        <header className="mb-4">
          <h1 className="text-[48px] font-bold text-black leading-[24px] mb-2">
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
        <section className="mb-4">
          <h2 className="text-[14px] font-normal text-black leading-[24px] mb-3">
            Progress
          </h2>
          <div className="flex gap-4 items-start flex-nowrap">
            {/* Work packages completed */}
            <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6">
              <Package className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
              <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                Work packages completed
              </p>
              <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                {stats.completed}/{stats.total}
              </p>
            </div>

            {/* Actions completed */}
            <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6">
              <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
              <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                Actions completed
              </p>
              <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                {stats.completedActions}/{stats.totalActions}
              </p>
            </div>

            {/* Number of actions completed */}
            <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6">
              <ListChecks className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
              <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                Number of actions completed
              </p>
              <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                {stats.completedActions}
              </p>
            </div>

            {/* Number of actions completed (duplicate) */}
            <div className="relative flex flex-col items-center justify-center w-[280px] h-[200px] bg-[#C5EFFF] rounded-lg px-4 py-6">
              <ClipboardCheck className="absolute top-3 right-3 w-5 h-5 text-[#0076A4]" />
              <p className="text-[14px] font-bold text-[#0076A4] text-center leading-[24px] mb-2">
                Number of actions completed
              </p>
              <p className="text-[32px] font-bold text-[#0076A4] text-center leading-[24px]">
                {stats.completedActions}
              </p>
            </div>

            {/* Chart placeholder */}
            <div className="flex flex-col items-center w-[196px] h-[500px] bg-gray-100 rounded justify-center">
              <p className="text-[14px] font-normal text-black text-center leading-[24px] w-[89px]">
                chart to show progress per wp
              </p>
            </div>
          </div>
        </section>

        {/* Work Packages Breakdown Section */}
        <section className="mb-4">
          <h2 className="text-[24px] font-bold text-black leading-[24px] mb-3">
            Work Packages breakdown
          </h2>
          
          {/* Filters Row */}
          <div className="flex gap-[8px] items-center mb-3 flex-wrap">
            <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px]">
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
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px]">
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
              <SelectTrigger className="w-[235px] h-[25px] text-[14px] border-slate-300 rounded-[6px]">
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
                className="w-full h-[40px] text-[16px] border-slate-300 rounded-[6px] pl-[12px] pr-[56px] py-[8px] text-slate-400"
              />
            </div>
            <Button
              onClick={handleResetFilters}
              className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 h-[40px] rounded-[6px] text-[14px] font-medium shrink-0"
            >
              Reset
            </Button>
          </div>
        </section>

        {/* Work Packages Accordion */}
        <section className="w-[818px]">
          <Accordion type="single" collapsible className="w-full">
            {filteredWorkPackages.map((wp, index) => (
              <AccordionItem
                key={`${wp.report}-${wp.number}`}
                value={`item-${index}`}
                className="border border-slate-200 bg-slate-50 rounded-[6px] px-6 py-4 mb-4 last:mb-0"
              >
                <AccordionTrigger className="px-0 py-0 hover:no-underline [&>svg]:ml-auto [&>svg]:shrink-0">
                  <div className="flex items-center gap-[18px] w-full pr-4">
                    <p className="flex-1 text-[16px] font-medium text-slate-900 leading-[24px] text-left min-w-0">
                      {wp.number ? `Work Package ${wp.number}: ${wp.name}` : `Work Package: ${wp.name}`}
                    </p>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-0 pb-0 pt-4">
                    {wp.actions.length > 0 ? (
                      wp.actions.map((action, idx) => (
                        <div
                          key={idx}
                          className="bg-white border border-slate-200 rounded-[6px] p-[17px] flex flex-col gap-[16px] mb-4 last:mb-0 w-[575px]"
                        >
                          {/* Indicative Action Text */}
                          <div className="flex flex-col gap-[8px]">
                            <p className="text-[14px] font-bold text-slate-900 leading-[20px]">
                              {action.text}
                            </p>
                          </div>

                          {/* Lead Badges */}
                          {wp.leads.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {wp.leads.map((lead, leadIdx) => (
                                <Badge
                                  key={leadIdx}
                                  className="bg-[#0076a4] text-white px-4 py-2 h-[37px] rounded-[6px] text-[14px] font-medium border-0"
                                >
                                  {lead}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Paragraph Reference Section */}
                          <div className="flex flex-col gap-[9px]">
                            {/* Paragraph Number Input */}
                            <div className="w-[184px]">
                              <Input
                                type="text"
                                value={action.documentParagraph ? `p. ${action.documentParagraph}` : 'p. 23'}
                                readOnly
                                className="w-full h-[36px] text-[14px] border-slate-300 rounded-[6px] pl-[12px] pr-[56px] py-[8px] text-slate-900"
                              />
                            </div>

                            {/* Paragraph Reference Text Extract */}
                            <div className="flex gap-[16px] items-start">
                              <p className="text-[14px] font-medium text-black leading-[20px] w-[84px] shrink-0">
                                Paragraph reference text (extract)
                              </p>
                              <textarea
                                value={action.text.length > 100 ? `${action.text.substring(0, 100)}...` : action.text}
                                readOnly
                                className="flex-1 h-[60px] text-[14px] border border-slate-300 rounded-[6px] pl-[12px] pr-[56px] py-[8px] text-slate-900 bg-white resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-[6px] p-[17px]">
                        <p className="text-[14px] font-normal text-slate-900 leading-[20px]">
                          No actions available
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
        </section>
      </div>
    </div>
  );
}


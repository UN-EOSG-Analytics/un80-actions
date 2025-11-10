"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchActions } from "@/lib/actions";
import type { Actions, Action } from "@/types/action";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Work package mapping based on Figma design
const WS2_WORK_PACKAGES = {
  "Mandate creation": [
    { number: "19", name: "Mandate creation support" },
    { number: "29", name: "Registries & tools" },
  ],
  "Mandate delivery": [
    { number: "20", name: "UN budget and programme management" },
    { number: "30", name: "SG reports" },
  ],
  "Mandate review": [
    { number: "21", name: "System-wide results management" },
  ],
};

const WS3_WORK_PACKAGES = {
  "Peace and security": [
    { number: "1", name: "Peace operations" },
    { number: "22", name: "Prevention, peacebuilding, peace support" },
    { number: "23", name: "Disarmament" },
    { number: "24", name: "Drugs, Crime, Counterterrorism" },
  ],
  "Humanitarian action": [
    { number: "2", name: "New Humanitarian Compact" },
  ],
  "Human rights": [
    { number: "9", name: "Human rights group" },
  ],
  "Sustainable development": [
    { number: "3", name: "UNDP / UNOPS" },
    { number: "4", name: "UNFPA / UN Women" },
    { number: "5", name: "UNCT reconfiguration" },
    { number: "6", name: "Regional reset" },
    { number: "7", name: "Joint knowledge hubs" },
    { number: "8", name: "Expert on-demand" },
    { number: "25", name: "UNAIDS" },
    { number: "26", name: "Other merger review" },
    { number: "27", name: "Environment" },
    { number: "28", name: "Other realignments" },
  ],
};

const WS1_WORK_PACKAGES: Record<string, Array<{ number: string; name: string }>> = {
  "Global": [
    { number: "12", name: "Regional integrated platforms" },
    { number: "13", name: "Shared platform initiative" },
  ],
  "Regional": [],
  "Country": [],
  "Technology": [
    { number: "15", name: "Technology accelerator platform" },
  ],
  "Data": [
    { number: "16", name: "System-wide data commons" },
  ],
  "Ops. support": [
    { number: "14", name: "Unified services roadmap" },
  ],
  "Training & research": [
    { number: "17", name: "Training & research two pillar model" },
  ],
  "Funding": [
    { number: "17", name: "Training & research two pillar model" },
  ],
  "Efficiencies & improvements": [
    { number: "31", name: "UN Secretariat efficiencies and improvements" },
  ],
};

// Additional work packages mentioned in design
const ADDITIONAL_WPS = {
  "Peace and security": [
    { number: "10", name: "Senior management coordination forums" },
    { number: "11", name: "Special envoy review" },
  ],
};

// Helper function to get work package key
function getWorkPackageKey(report: string, number: string): string {
  return `${report}-${number}`;
}

// Helper function to check if work package matches filter
function matchesFilter(
  report: string,
  wpNumber: string,
  selectedWorkPackage: string,
  selectedLead: string,
  selectedWorkstream: string,
  matchingWPKeys: Set<string>
): boolean {
  // If any filter is active, check if this WP matches
  if (selectedWorkPackage || selectedLead || selectedWorkstream) {
    if (selectedWorkPackage) {
      const [num] = selectedWorkPackage.split("-");
      if (wpNumber !== num) return false;
    }
    if (selectedWorkstream && report !== selectedWorkstream) return false;
    if (selectedLead && !matchingWPKeys.has(getWorkPackageKey(report, wpNumber))) return false;
    return true;
  }
  return true;
}

export default function Home() {
  const [actions, setActions] = useState<Actions>([]);
  const [selectedWorkPackage, setSelectedWorkPackage] = useState<string>("");
  const [selectedLead, setSelectedLead] = useState<string>("");
  const [selectedWorkstream, setSelectedWorkstream] = useState<string>("");
  const [selectedDetailWP, setSelectedDetailWP] = useState<{
    report: string;
    number: string;
    name: string;
  } | null>(null);

  // Fetch actions on mount
  useEffect(() => {
    fetchActions()
      .then(setActions)
      .catch((error) => {
        console.error("Failed to fetch actions:", error);
        setActions([]);
      });
  }, []);

  const uniqueWorkPackages = useMemo(() => {
    const wpMap = new Map<string, { number: string; name: string; report: string }>();
    actions.forEach((action) => {
      const key = getWorkPackageKey(action.report, action.work_package_number);
      if (!wpMap.has(key)) {
        wpMap.set(key, {
          number: action.work_package_number,
          name: action.work_package_name,
          report: action.report,
        });
      }
    });
    return Array.from(wpMap.values()).sort(
      (a, b) => parseInt(a.number) - parseInt(b.number)
    );
  }, [actions]);

  const uniqueLeads = useMemo(() => {
    const leads = new Set<string>();
    actions.forEach((action) => {
      if (Array.isArray(action.work_package_leads)) {
        action.work_package_leads.forEach((lead: string) => {
          if (lead && lead.trim()) {
            leads.add(lead.trim());
          }
        });
      }
    });
    return Array.from(leads).sort();
  }, [actions]);

  const uniqueWorkstreams = useMemo(() => {
    return Array.from(new Set(actions.map((a) => a.report))).sort();
  }, [actions]);

  // Get filtered actions for lead filtering
  const filteredActions = useMemo(() => {
    let filtered = actions;
    if (selectedLead) {
      filtered = filtered.filter((action) => 
        Array.isArray(action.work_package_leads) && 
        action.work_package_leads.includes(selectedLead)
      );
    }
    return filtered;
  }, [actions, selectedLead]);

  // Get work packages that match the selected lead
  const matchingWPKeys = useMemo(() => {
    if (!selectedLead) return new Set<string>();
    const wpSet = new Set<string>();
    filteredActions.forEach((action) => {
      wpSet.add(getWorkPackageKey(action.report, action.work_package_number));
    });
    return wpSet;
  }, [filteredActions, selectedLead]);

  // Get actions for selected work package detail
  const detailActions = useMemo(() => {
    if (!selectedDetailWP) return [];
    return actions.filter(
      (a) =>
        a.report === selectedDetailWP.report &&
        a.work_package_number === selectedDetailWP.number
    );
  }, [actions, selectedDetailWP]);

  // Get work package info for detail view
  const detailWPInfo = useMemo(() => {
    if (!selectedDetailWP || detailActions.length === 0) return null;
    const firstAction = detailActions[0];
    return {
      name: firstAction.work_package_name,
      leads: Array.isArray(firstAction.work_package_leads) 
        ? firstAction.work_package_leads 
        : [],
      workstream: firstAction.report,
      actions: detailActions,
    };
  }, [selectedDetailWP, detailActions]);

  const handleWPClick = (report: string, number: string, name: string) => {
    setSelectedDetailWP({ report, number, name });
  };

  const handleResetFilters = () => {
    setSelectedWorkPackage("");
    setSelectedLead("");
    setSelectedWorkstream("");
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1421px] mx-auto px-[101px] py-8">
        {/* Logo */}
        <div className="mb-8">
          <Image
            src={`${basePath}/images/UN_Logo_Horizontal_Colour_English.svg`}
            alt="UN Logo"
            width={200}
            height={48}
            className="h-10 sm:h-12 w-auto select-none"
            draggable={false}
          />
        </div>

        {/* Header */}
        <h1 className="text-[48px] font-black text-black leading-[24px] mb-4">
          UN80 Initiative Dashboard
        </h1>
        <p className="text-sm text-black leading-[24px] mb-8 max-w-[1093px]">
          This Dashboard is an annex to the UN80 Initiative Action Plan: presents the detailed work packages across the three UN80 workstreams in a single reference. Furthermore, it is a consolidated work package document that lists all work packages and their designated leads, as well as their individual action items (derived from paragraphs in the SG's reports on UN80).
        </p>

        {/* Filters */}
        <div className="flex gap-4 items-center mb-12">
          <Select value={selectedWorkPackage} onValueChange={setSelectedWorkPackage}>
            <SelectTrigger className="w-[235px] h-[25px] text-sm border-slate-300 rounded-[6px]">
              <SelectValue placeholder="Select Work Package" />
            </SelectTrigger>
            <SelectContent>
              {uniqueWorkPackages.map((wp) => (
                <SelectItem key={`${wp.report}-${wp.number}-${wp.name}`} value={`${wp.number}-${wp.name}`}>
                  WP#{wp.number} {wp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLead} onValueChange={setSelectedLead}>
            <SelectTrigger className="w-[235px] h-[25px] text-sm border-slate-300 rounded-[6px]">
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
            <SelectTrigger className="w-[235px] h-[25px] text-sm border-slate-300 rounded-[6px]">
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

          {(selectedWorkPackage || selectedLead || selectedWorkstream) && (
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="h-[25px] px-3 text-sm border-slate-300 rounded-[6px]"
            >
              Reset
            </Button>
          )}
        </div>

        {/* WS2 Section */}
        <div className="mb-16 relative">
          <div className="border-l-4 border-un-blue pl-4 mb-6">
            <h2 className="text-[13px] font-black text-un-blue leading-[16px] mb-1">
              WS2: Improvements in mandate lifecycle management
            </h2>
            <p className="text-[9px] font-light text-un-blue leading-[11px] tracking-[-0.21px]">
              Workstream 2, SG actions only
            </p>
          </div>

          {/* Flowchart Layout */}
          <div className="relative flex items-start gap-8 mb-8">
            {/* Mandate Creation - Trapezoidal box (top-left cut) */}
            <div className="flex-1 relative">
              {/* Trapezoidal header - top-left corner cut */}
              <div 
                className="bg-[#0076a4] text-white px-4 py-2 h-[62px] flex items-center"
                style={{
                  clipPath: 'polygon(22px 0%, 100% 0%, 100% 100%, 0% 100%)',
                  borderRadius: '0 6px 0 0'
                }}
              >
                <h3 className="text-[13px] font-bold text-white">
                  Mandate creation
                </h3>
              </div>
              
              {/* Work packages below */}
              <div className="space-y-2 bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS2_WORK_PACKAGES["Mandate creation"].map((wp) => {
                  const matches = matchesFilter("WS2", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS2", wp.number, wp.name)}
                      className={`w-full h-[37px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Forward arrow from creation to delivery (at top level) */}
              <div className="absolute top-[31px] right-[-32px] z-10">
                <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 8 L32 8 M28 4 L32 8 L28 12" stroke="#0076a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>

              {/* Return arrow from delivery to creation (below boxes) */}
              <div className="absolute top-[140px] right-[-32px] z-10">
                <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 8 L0 8 M4 4 L0 8 L4 12" stroke="#0076a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>

            {/* Mandate Delivery - Rectangular box */}
            <div className="flex-1 relative">
              {/* Rectangular header */}
              <h3 className="text-[13px] font-bold text-white bg-[#0076a4] px-4 py-2 h-[62px] flex items-center rounded-t-[6px] mb-0">
                Mandate delivery
              </h3>
              
              {/* Work packages below */}
              <div className="space-y-2 bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS2_WORK_PACKAGES["Mandate delivery"].map((wp) => {
                  const matches = matchesFilter("WS2", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS2", wp.number, wp.name)}
                      className={`w-full h-[37px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>

              {/* Forward arrow from delivery to review (at top level) */}
              <div className="absolute top-[31px] right-[-32px] z-10">
                <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 8 L32 8 M28 4 L32 8 L28 12" stroke="#0076a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>

              {/* Return arrow from review to delivery (below boxes) */}
              <div className="absolute top-[140px] right-[-32px] z-10">
                <svg width="40" height="16" viewBox="0 0 40 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M32 8 L0 8 M4 4 L0 8 L4 12" stroke="#0076a4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </div>
            </div>

            {/* Mandate Review - Trapezoidal box (top-right cut) */}
            <div className="flex-1 relative">
              {/* Trapezoidal header - top-right corner cut */}
              <div 
                className="bg-[#0076a4] text-white px-4 py-2 h-[62px] flex items-center"
                style={{
                  clipPath: 'polygon(0% 0%, calc(100% - 22px) 0%, 100% 100%, 0% 100%)',
                  borderRadius: '6px 0 0 0'
                }}
              >
                <h3 className="text-[13px] font-bold text-white">
                  Mandate review
                </h3>
              </div>
              
              {/* Work packages below */}
              <div className="space-y-2 bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS2_WORK_PACKAGES["Mandate review"].map((wp) => {
                  const matches = matchesFilter("WS2", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS2", wp.number, wp.name)}
                      className={`w-full h-[37px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* WS3 Section */}
        <div className="mb-16 relative">
          <div className="border-l-4 border-un-blue pl-4 mb-6">
            <h2 className="text-[13px] font-black text-un-blue leading-[16px]">
              WS3: Programmatic and structural shifts within pillars
            </h2>
          </div>

          <div className="flex gap-0">
            {/* Peace and security */}
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-un-blue leading-[16px] mb-2">
                Peace and security
              </h3>
              <div className="space-y-2">
                {WS3_WORK_PACKAGES["Peace and security"].map((wp) => {
                  const matches = matchesFilter("WS3", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS3", wp.number, wp.name)}
                      className={`w-full h-[37.7px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number}: </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-[1px] bg-gray-300 mx-2 self-stretch" />

            {/* Humanitarian action */}
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-un-blue leading-[16px] mb-2">
                Humanitarian action
              </h3>
              <div className="space-y-2">
                {WS3_WORK_PACKAGES["Humanitarian action"].map((wp) => {
                  const matches = matchesFilter("WS3", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS3", wp.number, wp.name)}
                      className={`w-full h-[37.7px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number}: </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-[1px] bg-gray-300 mx-2 self-stretch" />

            {/* Human rights */}
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-un-blue leading-[16px] mb-2">
                Human rights
              </h3>
              <div className="space-y-2">
                {WS3_WORK_PACKAGES["Human rights"].map((wp) => {
                  const matches = matchesFilter("WS3", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS3", wp.number, wp.name)}
                      className={`w-full h-[37.7px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Vertical divider */}
            <div className="w-[1px] bg-gray-300 mx-2 self-stretch" />

            {/* Sustainable development */}
            <div className="flex-1">
              <h3 className="text-[15px] font-bold text-un-blue leading-[16px] mb-2">
                Sustainable development
              </h3>
              <div className="space-y-2">
                {WS3_WORK_PACKAGES["Sustainable development"].map((wp) => {
                  const matches = matchesFilter("WS3", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS3", wp.number, wp.name)}
                      className={`w-full h-[37.7px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-4 rounded-[6px] border-0`}
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Additional Peace and security work packages */}
          <div className="mt-4 flex gap-4">
            {ADDITIONAL_WPS["Peace and security"].map((wp) => {
              const matches = matchesFilter("WS3", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
              const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
              return (
                <Button
                  key={wp.number}
                  onClick={() => handleWPClick("WS3", wp.number, wp.name)}
                  className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-smoky'} px-0 py-0 hover:underline bg-transparent`}
                  variant="ghost"
                >
                  WP#{wp.number} {wp.name}
                </Button>
              );
            })}
          </div>
        </div>

        {/* WS3: Shifts in cross-pillar approaches */}
        <div className="mb-16 relative">
          <div className="border-l-4 border-un-blue pl-4 mb-6">
            <h2 className="text-[13px] font-black text-smoky leading-[16px]">
              WS3: Shifts in cross- pillar approaches
            </h2>
          </div>
          
          {/* Horizontal bar separator */}
          <div className="h-[1px] bg-gray-300 mb-4 w-full" />
          
          {/* Horizontal bars with work packages */}
          <div className="space-y-1">
            {/* Global bar */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-[1px] h-[25px] bg-gray-300" />
              <div className="flex-1 bg-[#0076a4] px-3 py-2 rounded-[6px]">
                <p className="text-[15px] font-bold text-white leading-[16px] mb-1">Global</p>
                <div className="flex gap-2 flex-wrap">
                  {WS1_WORK_PACKAGES["Global"].map((wp) => {
                    const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                    const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                    return (
                      <Button
                        key={wp.number}
                        onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                        className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-white'} px-0 py-0 hover:underline bg-transparent`}
                        variant="ghost"
                      >
                        WP#{wp.number} {wp.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Regional bar */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-[1px] h-[25px] bg-gray-300" />
              <div className="flex-1 bg-[#0076a4] px-3 py-2 rounded-[6px]">
                <p className="text-[15px] font-bold text-white leading-[16px] mb-1">Regional</p>
                <div className="flex gap-2 flex-wrap">
                  {WS1_WORK_PACKAGES["Regional"].map((wp) => {
                    const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                    const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                    return (
                      <Button
                        key={wp.number}
                        onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                        className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-white'} px-0 py-0 hover:underline bg-transparent`}
                        variant="ghost"
                      >
                        WP#{wp.number} {wp.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Country bar */}
            <div className="flex items-center gap-4 py-2">
              <div className="w-[1px] h-[25px] bg-gray-300" />
              <div className="flex-1 bg-[#0076a4] px-3 py-2 rounded-[6px]">
                <p className="text-[15px] font-bold text-white leading-[16px] mb-1">Country</p>
                <div className="flex gap-2 flex-wrap">
                  {WS1_WORK_PACKAGES["Country"].map((wp) => {
                    const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                    const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                    return (
                      <Button
                        key={wp.number}
                        onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                        className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-white'} px-0 py-0 hover:underline bg-transparent`}
                        variant="ghost"
                      >
                        WP#{wp.number} {wp.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WS3: Shifts in UN system-wide enablers */}
        <div className="mb-16 relative">
          <div className="border-l-4 border-trout pl-4 mb-6">
            <h2 className="text-[13px] font-black text-trout leading-[16px]">
              WS3: Shifts in UN system-wide enablers
            </h2>
          </div>
          
          {/* Horizontal bar separator */}
          <div className="h-[1px] bg-gray-300 mb-4 w-full" />
          
          {/* Individual work package boxes */}
          <div className="flex gap-4 flex-wrap">
            {/* Ops. support - WP#14 */}
            <div className="flex-shrink-0">
              <Button
                onClick={() => handleWPClick("WS1", "14", "Unified services roadmap")}
                className={`w-[138px] h-[32px] ${matchesFilter("WS1", "14", selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys) || !(selectedWorkPackage || selectedLead || selectedWorkstream) ? 'bg-[#0076a4] hover:bg-[#006a94] text-white' : 'bg-gray-300 text-gray-500'} text-[12px] font-medium justify-start px-3 rounded-[6px] border-0`}
              >
                <span className="font-medium">WP#14 </span>
                <span className="font-light">Unified services roadmap</span>
              </Button>
            </div>

            {/* Technology - WP#15 */}
            <div className="flex-shrink-0">
              <Button
                onClick={() => handleWPClick("WS1", "15", "Technology accelerator platform")}
                className={`w-[133px] h-[32px] ${matchesFilter("WS1", "15", selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys) || !(selectedWorkPackage || selectedLead || selectedWorkstream) ? 'bg-[#0076a4] hover:bg-[#006a94] text-white' : 'bg-gray-300 text-gray-500'} text-[12px] font-medium justify-start px-3 rounded-[6px] border-0`}
              >
                <span className="font-medium">WP#15 </span>
                <span className="font-light">Technology accelerator platform</span>
              </Button>
            </div>

            {/* Data - WP#16 */}
            {WS1_WORK_PACKAGES["Data"].map((wp) => {
              const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
              const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
              return (
                <div key={wp.number} className="flex-shrink-0">
                  <Button
                    onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                    className={`w-[128px] h-[32px] ${isGrayed ? 'bg-gray-300 text-gray-500' : 'bg-[#0076a4] hover:bg-[#006a94] text-white'} text-[12px] font-medium justify-start px-3 rounded-[6px] border-0`}
                  >
                    <span className="font-medium">WP#{wp.number} </span>
                    <span className="font-light">{wp.name}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* WS1 Section */}
        <div>
          <div className="border-l-4 border-trout pl-4 mb-6">
            <h2 className="text-[13px] font-black text-trout leading-[16px]">
              WS1: UN enablers
            </h2>
          </div>

          <div className="space-y-4">
            {/* Global */}
            <div>
              <h3 className="text-[15px] font-bold text-smoky leading-[16px] mb-2">
                Global
              </h3>
              <div className="flex gap-2 flex-wrap">
                {WS1_WORK_PACKAGES["Global"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-smoky'} px-0 py-0 hover:underline bg-transparent`}
                      variant="ghost"
                    >
                      WP#{wp.number} {wp.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Regional */}
            <div>
              <h3 className="text-[15px] font-bold text-smoky leading-[16px] mb-2">
                Regional
              </h3>
              <div className="flex gap-2 flex-wrap">
                {WS1_WORK_PACKAGES["Regional"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-smoky'} px-0 py-0 hover:underline bg-transparent`}
                      variant="ghost"
                    >
                      WP#{wp.number} {wp.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Country */}
            <div>
              <h3 className="text-[15px] font-bold text-smoky leading-[16px] mb-2">
                Country
              </h3>
              <div className="flex gap-2 flex-wrap">
                {WS1_WORK_PACKAGES["Country"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`h-auto text-[12px] font-bold ${isGrayed ? 'text-gray-400' : 'text-smoky'} px-0 py-0 hover:underline bg-transparent`}
                      variant="ghost"
                    >
                      WP#{wp.number} {wp.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Technology */}
            <div>
              <h3 className="text-[15px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Technology
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Technology"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Data */}
            <div>
              <h3 className="text-[15px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Data
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Data"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Ops. support */}
            <div>
              <h3 className="text-[15px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Ops. support
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Ops. support"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Training & research */}
            <div>
              <h3 className="text-[15px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Training & research
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Training & research"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Funding */}
            <div>
              <h3 className="text-[15px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Funding
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Funding"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Efficiencies & improvements */}
            <div>
              <h3 className="text-[13px] font-bold text-white leading-[16px] mb-0 bg-[#0076a4] px-4 py-2 rounded-t-[6px]">
                Efficiencies & improvements
              </h3>
              <div className="bg-[#0076a4] p-4 rounded-b-[6px]">
                {WS1_WORK_PACKAGES["Efficiencies & improvements"].map((wp) => {
                  const matches = matchesFilter("WS1", wp.number, selectedWorkPackage, selectedLead, selectedWorkstream, matchingWPKeys);
                  const isGrayed = (selectedWorkPackage || selectedLead || selectedWorkstream) && !matches;
                  return (
                    <Button
                      key={wp.number}
                      onClick={() => handleWPClick("WS1", wp.number, wp.name)}
                      className={`w-full h-auto text-[12px] font-medium ${isGrayed ? 'text-gray-300' : 'text-white'} justify-start px-0 py-2 rounded-[6px] bg-transparent hover:bg-transparent`}
                      variant="ghost"
                    >
                      <span className="font-medium">WP#{wp.number} </span>
                      <span className="font-light">{wp.name}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Dialog (Frame 8) */}
      <Dialog open={!!selectedDetailWP} onOpenChange={(open) => !open && setSelectedDetailWP(null)}>
        <DialogContent className="fixed top-0 right-0 h-full w-[50%] max-w-[607px] translate-x-0 translate-y-0 rounded-none border-l border-t-0 border-r-0 border-b-0 shadow-xl flex flex-col p-0">
          {detailWPInfo && (
            <>
              <DialogHeader className="px-8 pt-8 pb-4 shrink-0">
                <DialogTitle className="text-[14px] font-bold leading-[20px]">
                  Work Package: {detailWPInfo.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-6 px-8 pb-8 overflow-y-auto flex-1">
                {/* Work Package Leads */}
                <div>
                  <p className="text-[14px] font-medium leading-[20px] mb-4">Work Package Leads:</p>
                  <div className="flex flex-wrap gap-2">
                    {detailWPInfo.leads.map((lead, idx) => (
                      <div
                        key={idx}
                        className="bg-[#0076a4] text-white text-[12px] font-normal px-3 py-2 rounded-[6px] h-[52px] flex items-center"
                      >
                        {lead}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Workstream */}
                <div>
                  <p className="text-[14px] font-medium leading-[20px] mb-4">Workstream:</p>
                  <div className="bg-[#0076a4] text-white text-[12px] font-normal px-3 py-2 rounded-[6px] h-[52px] flex items-center w-[122px]">
                    {detailWPInfo.workstream}
                  </div>
                </div>

                {/* Indicative Actions */}
                <div>
                  <p className="text-[14px] font-medium leading-[20px] mb-4">Indicative Actions:</p>
                  <div className="space-y-4">
                    {detailWPInfo.actions.map((action, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200 rounded-[6px] p-[17px] space-y-4"
                      >
                        <p className="text-[14px] font-bold leading-[20px] text-black">
                          {action.indicative_activity}
                        </p>
                        <div className="space-y-[9px]">
                          <div className="flex gap-4 items-center">
                            <p className="text-[14px] font-medium text-black w-[84px] shrink-0">
                              Paragraph number
                            </p>
                            <div className="flex-1 border border-slate-300 rounded-[6px] px-3 py-2">
                              <p className="text-[14px] font-normal text-slate-900">
                                p. {action.document_paragraph}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-4 items-start">
                            <p className="text-[14px] font-medium text-black w-[84px] shrink-0">
                              Paragraph reference text (extract)
                            </p>
                            <div className="flex-1 border border-slate-300 rounded-[6px] px-3 py-2 min-h-[60px]">
                              <p className="text-[14px] font-normal text-slate-900">
                                {action.indicative_activity.length > 150
                                  ? `${action.indicative_activity.substring(0, 150)}...`
                                  : action.indicative_activity}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

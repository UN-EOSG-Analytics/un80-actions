"use client";

import { useMemo } from "react";
import type { Actions, WorkPackage } from "@/types";
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Layers, Briefcase, Users } from "lucide-react";

interface OverallProgressDashboardProps {
  actions: Actions;
  workPackages: WorkPackage[];
}

export function OverallProgressDashboard({
  actions,
  workPackages,
}: OverallProgressDashboardProps) {
  // Calculate overall statistics
  const stats = useMemo(() => {
    const totalActions = actions.length;
    
    return {
      totalActions,
      workstreams: 3,
      workPackages: 31,
      leaders: 34,
    };
  }, [actions]);


  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Actions */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-un-blue/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total Actions</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.totalActions}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-un-blue/10 transition-colors group-hover:bg-un-blue/20">
              <TrendingUp className="h-6 w-6 text-un-blue" />
            </div>
          </div>
        </div>

        {/* Workstreams */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-un-blue/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Workstreams</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.workstreams}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-un-blue/10 transition-colors group-hover:bg-un-blue/20">
              <Layers className="h-6 w-6 text-un-blue" />
            </div>
          </div>
        </div>

        {/* Work Packages */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-un-blue/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Work Packages</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.workPackages}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-un-blue/10 transition-colors group-hover:bg-un-blue/20">
              <Briefcase className="h-6 w-6 text-un-blue" />
            </div>
          </div>
        </div>

        {/* UN System Leaders */}
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-un-blue/30">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">UN System Leaders</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">{stats.leaders}</p>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-un-blue/10 transition-colors group-hover:bg-un-blue/20">
              <Users className="h-6 w-6 text-un-blue" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


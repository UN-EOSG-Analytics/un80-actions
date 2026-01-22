"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { Actions } from "@/types";
import { normalizeLeaderName } from "@/lib/utils";

interface ResponsibleEntitiesProgressProps {
  actions: Actions;
}

export function ResponsibleEntitiesProgress({
  actions,
}: ResponsibleEntitiesProgressProps) {
  const chartData = useMemo(() => {
    const leaderMap = new Map<string, { total: number; completed: number }>();

    actions.forEach((action) => {
      if (
        action.work_package_leads &&
        Array.isArray(action.work_package_leads)
      ) {
        action.work_package_leads.forEach((lead) => {
          if (lead && lead.trim()) {
            const normalized = normalizeLeaderName(lead.trim());
            if (!leaderMap.has(normalized)) {
              leaderMap.set(normalized, { total: 0, completed: 0 });
            }
            const stats = leaderMap.get(normalized)!;
            stats.total++;
            // Simulate 20% completion rate
            if (Math.random() < 0.2) {
              stats.completed++;
            }
          }
        });
      }
    });

    return Array.from(leaderMap.entries())
      .map(([leader, stats]) => ({
        leader,
        total: stats.total,
        completed: stats.completed,
        progress: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 15); // Top 15 entities
  }, [actions]);

  const getColor = (progress: number) => {
    // Use un-blue with varying opacity based on progress
    if (progress >= 50) return "#009edb"; // un-blue full
    if (progress >= 25) return "#009edb"; // un-blue full
    if (progress >= 10) return "#009edb"; // un-blue full
    return "#009edb"; // un-blue full (consistent color)
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Progress by Responsible Entity
      </h3>
      <ResponsiveContainer width="100%" height={500}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="leader"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="progress" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.progress)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      leader: string;
      total: number;
      completed: number;
      progress: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-gray-900">{data.leader}</p>
        <p className="text-sm text-gray-600">Total Actions: {data.total}</p>
        <p className="text-sm text-gray-600">
          Completed: {data.completed} ({data.progress.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
}

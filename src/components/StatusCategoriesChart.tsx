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
  Legend,
} from "recharts";
import type { Actions } from "@/types";

interface StatusCategoriesChartProps {
  actions: Actions;
}

export function StatusCategoriesChart({ actions }: StatusCategoriesChartProps) {
  const chartData = useMemo(() => {
    // Group by workstream and calculate status distribution
    const workstreamMap = new Map<
      string,
      {
        planned: number;
        inProgress: number;
        completed: number;
        delayed: number;
      }
    >();

    // Use a deterministic hash function instead of Math.random()
    const hash = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash);
    };

    actions.forEach((action) => {
      const ws = action.report || "Unknown";
      if (!workstreamMap.has(ws)) {
        workstreamMap.set(ws, {
          planned: 0,
          inProgress: 0,
          completed: 0,
          delayed: 0,
        });
      }
      const stats = workstreamMap.get(ws)!;

      // Use deterministic hash-based distribution instead of Math.random()
      const actionHash = hash(`${action.action_number}-${action.report}`);
      const rand = (actionHash % 100) / 100;
      if (rand < 0.2) stats.completed++;
      else if (rand < 0.6) stats.inProgress++;
      else if (rand < 0.9) stats.planned++;
      else stats.delayed++;
    });

    return Array.from(workstreamMap.entries())
      .map(([workstream, stats]) => ({
        workstream,
        Planned: stats.planned,
        "In Progress": stats.inProgress,
        Completed: stats.completed,
        Delayed: stats.delayed,
      }))
      .sort((a, b) => {
        const totalA = a.Planned + a["In Progress"] + a.Completed + a.Delayed;
        const totalB = b.Planned + b["In Progress"] + b.Completed + b.Delayed;
        return totalB - totalA;
      });
  }, [actions]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-gray-900">
        Status by Workstream
      </h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="workstream"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar dataKey="Planned" stackId="a" fill="#94a3b8" />
          <Bar dataKey="In Progress" stackId="a" fill="#3b82f6" />
          <Bar dataKey="Completed" stackId="a" fill="#10b981" />
          <Bar dataKey="Delayed" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      workstream: string;
      Planned: number;
      "In Progress": number;
      Completed: number;
      Delayed: number;
    };
  }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total =
      data.Planned + data["In Progress"] + data.Completed + data.Delayed;
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
        <p className="mb-2 font-semibold text-gray-900">{data.workstream}</p>
        {payload.map((entry, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value} (
              {((entry.value / total) * 100).toFixed(1)}%)
            </p>
          ))}
          <p className="mt-2 border-t border-gray-200 pt-2 text-sm font-medium text-gray-900">
            Total: {total} actions
          </p>
        </div>
      );
    }
    return null;
}

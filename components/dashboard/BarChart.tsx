'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CategoryData } from '@/lib/data-service';

interface BarChartProps {
  data: CategoryData[];
  title: string;
}

export function BarChart({ data, title }: BarChartProps) {
  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#0088FE" name="Value" />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}


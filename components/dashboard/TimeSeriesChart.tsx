'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesData } from '@/lib/data-service';

interface TimeSeriesChartProps {
  data: TimeSeriesData[];
  title: string;
}

export function TimeSeriesChart({ data, title }: TimeSeriesChartProps) {
  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke="#0088FE" 
            strokeWidth={2}
            name="Value"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


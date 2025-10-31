'use client';

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TimeSeriesData } from '@/lib/data-service';

interface AreaChartProps {
  data: TimeSeriesData[];
  title: string;
}

export function AreaChart({ data, title }: AreaChartProps) {
  return (
    <div className="w-full h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#0088FE" 
            fillOpacity={1}
            fill="url(#colorValue)"
            name="Value"
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}


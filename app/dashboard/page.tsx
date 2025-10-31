'use client';

import { useEffect, useState } from 'react';
import { dataService, type DashboardData } from '@/lib/data-service';
import { TimeSeriesChart } from '@/components/dashboard/TimeSeriesChart';
import { BarChart } from '@/components/dashboard/BarChart';
import { PieChart } from '@/components/dashboard/PieChart';
import { AreaChart } from '@/components/dashboard/AreaChart';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const dashboardData = await dataService.getAllDashboardData();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
        console.error('Error loading dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex justify-center items-center px-4 sm:px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background flex justify-center items-center px-4 sm:px-6">
        <div className="text-center">
          <p className="text-destructive text-lg mb-2">Error loading dashboard</p>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <img
            src="/images/UN Logo_Horizontal_English/Colour/UN Logo_Horizontal_Colour_English.svg"
            alt="UN Logo"
            className="h-10 sm:h-12 w-auto select-none mb-6"
            draggable="false"
          />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground mb-2">
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            Data visualization and analytics dashboard
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Time Series Line Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <TimeSeriesChart data={data.timeSeries} title="Time Series Analysis" />
          </div>

          {/* Area Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <AreaChart data={data.trends} title="Trend Analysis" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <BarChart data={data.monthlyComparison} title="Monthly Comparison" />
          </div>

          {/* Pie Chart */}
          <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
            <PieChart data={data.categoryDistribution} title="Category Distribution" />
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 bg-card border border-border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">About This Dashboard</h2>
          <p className="text-muted-foreground text-sm">
            This dashboard is currently using dummy data. The data service layer is designed
            to easily integrate with Excel files or external APIs. See the{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">lib/data-service.ts</code> and{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">app/api/</code> directory
            for the integration structure.
          </p>
        </div>
      </div>
    </main>
  );
}


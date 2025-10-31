/**
 * Time Series Data API Route
 * 
 * Individual endpoint for time series data.
 * Can be called separately or as part of the dashboard endpoint.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Replace with Excel/API data fetching
    const data = [
      { date: '2024-01', value: 120, category: 'Sales' },
      { date: '2024-02', value: 135, category: 'Sales' },
      { date: '2024-03', value: 145, category: 'Sales' },
      { date: '2024-04', value: 158, category: 'Sales' },
      { date: '2024-05', value: 142, category: 'Sales' },
      { date: '2024-06', value: 168, category: 'Sales' },
      { date: '2024-07', value: 175, category: 'Sales' },
      { date: '2024-08', value: 182, category: 'Sales' },
      { date: '2024-09', value: 190, category: 'Sales' },
      { date: '2024-10', value: 198, category: 'Sales' },
      { date: '2024-11', value: 205, category: 'Sales' },
      { date: '2024-12', value: 215, category: 'Sales' },
    ];
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch time series data' },
      { status: 500 }
    );
  }
}


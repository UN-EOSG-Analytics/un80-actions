/**
 * Category Distribution API Route
 * 
 * Individual endpoint for category distribution data.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // TODO: Replace with Excel/API data fetching
    const data = [
      { name: 'Category A', value: 35, color: '#0088FE' },
      { name: 'Category B', value: 28, color: '#00C49F' },
      { name: 'Category C', value: 22, color: '#FFBB28' },
      { name: 'Category D', value: 15, color: '#FF8042' },
    ];
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error fetching category distribution:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category distribution' },
      { status: 500 }
    );
  }
}


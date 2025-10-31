# Dashboard Integration Guide

This guide explains how to integrate Excel files and API data sources with the dashboard.

## Current Structure

The dashboard is built with a modular architecture that separates data fetching from visualization:

1. **Data Service Layer** (`lib/data-service.ts`): Abstract interface for data fetching
2. **API Routes** (`app/api/`): RESTful endpoints for data retrieval
3. **Dashboard Components** (`components/dashboard/`): Reusable chart components
4. **Dashboard Page** (`app/dashboard/page.tsx`): Main dashboard view

## Integration Options

### Option 1: Excel File Integration

To integrate Excel files:

1. **Install Excel parsing library:**
   ```bash
   npm install xlsx
   # or
   npm install exceljs
   ```

2. **Update API route** (`app/api/dashboard/route.ts`):
   ```typescript
   import * as XLSX from 'xlsx';
   import fs from 'fs';

   async function parseExcelFile(filePath: string): Promise<DashboardData> {
     const workbook = XLSX.readFile(filePath);
     const sheetName = workbook.SheetNames[0];
     const worksheet = workbook.Sheets[sheetName];
     
     // Parse time series data (assuming columns: Date, Value)
     const timeSeries = XLSX.utils.sheet_to_json(worksheet)
       .map(row => ({
         date: row.Date,
         value: row.Value,
         category: row.Category || 'Sales'
       }));
     
     // Similar parsing for other data types...
     
     return {
       timeSeries,
       categoryDistribution: [],
       monthlyComparison: [],
       trends: []
     };
   }
   ```

3. **Switch data service** (`lib/data-service.ts`):
   ```typescript
   // Replace:
   export const dataService: IDataService = new DummyDataService();
   
   // With:
   export const dataService: IDataService = new ApiDataService('/api');
   ```

### Option 2: External API Integration

To integrate with an external API:

1. **Update API route** (`app/api/dashboard/route.ts`):
   ```typescript
   export async function GET() {
     try {
       // Fetch from external API
       const response = await fetch('https://your-api.com/dashboard', {
         headers: {
           'Authorization': `Bearer ${process.env.API_KEY}`,
         },
       });
       
       if (!response.ok) throw new Error('API request failed');
       
       const data = await response.json();
       
       // Transform to match DashboardData interface
       return NextResponse.json({
         timeSeries: data.time_series,
         categoryDistribution: data.categories,
         monthlyComparison: data.monthly,
         trends: data.trends,
       });
     } catch (error) {
       return NextResponse.json(
         { error: 'Failed to fetch data' },
         { status: 500 }
       );
     }
   }
   ```

2. **Update data service** to use API:
   ```typescript
   export const dataService: IDataService = new ApiDataService('/api');
   ```

### Option 3: File Upload

To allow users to upload Excel files:

1. **Create upload API route** (`app/api/upload/route.ts`):
   ```typescript
   import { NextRequest, NextResponse } from 'next/server';
   import * as XLSX from 'xlsx';

   export async function POST(request: NextRequest) {
     try {
       const formData = await request.formData();
       const file = formData.get('file') as File;
       
       if (!file) {
         return NextResponse.json({ error: 'No file provided' }, { status: 400 });
       }
       
       const bytes = await file.arrayBuffer();
       const buffer = Buffer.from(bytes);
       
       const workbook = XLSX.read(buffer, { type: 'buffer' });
       // Parse and return data...
       
       return NextResponse.json({ success: true });
     } catch (error) {
       return NextResponse.json(
         { error: 'Failed to process file' },
         { status: 500 }
       );
     }
   }
   ```

2. **Add upload component** to dashboard page

## API Endpoints

The following API endpoints are available:

- `GET /api/dashboard` - Returns all dashboard data
- `GET /api/time-series` - Returns time series data only
- `GET /api/category-distribution` - Returns category distribution only
- `POST /api/dashboard` - Upload Excel file (to be implemented)

## Data Types

All data should conform to these TypeScript interfaces:

```typescript
interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

interface DashboardData {
  timeSeries: TimeSeriesData[];
  categoryDistribution: CategoryData[];
  monthlyComparison: CategoryData[];
  trends: TimeSeriesData[];
}
```

## Testing

After integration:

1. Update the data service in `lib/data-service.ts`
2. Test API endpoints with `curl` or Postman
3. Verify dashboard displays correctly with real data
4. Add error handling and loading states as needed

## Next Steps

1. Choose integration method (Excel, API, or both)
2. Implement data parsing/transformation logic
3. Update API routes with actual data fetching
4. Switch from `DummyDataService` to `ApiDataService`
5. Add error handling and validation
6. Test with production data structure


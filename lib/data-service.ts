/**
 * Data Service Layer
 * 
 * This service provides an abstraction layer for data fetching.
 * Currently uses dummy data, but will be replaced with API calls when integrating
 * Excel/API data sources.
 */

// Types for our dashboard data
export interface TimeSeriesData {
  date: string;
  value: number;
  category?: string;
}

export interface CategoryData {
  name: string;
  value: number;
  color?: string;
}

export interface DashboardData {
  timeSeries: TimeSeriesData[];
  categoryDistribution: CategoryData[];
  monthlyComparison: CategoryData[];
  trends: TimeSeriesData[];
}

/**
 * Data Service Interface
 * This interface defines the contract for data fetching.
 * Implementations can use API calls, Excel parsing, etc.
 */
export interface IDataService {
  getTimeSeriesData(): Promise<TimeSeriesData[]>;
  getCategoryDistribution(): Promise<CategoryData[]>;
  getMonthlyComparison(): Promise<CategoryData[]>;
  getTrends(): Promise<TimeSeriesData[]>;
  getAllDashboardData(): Promise<DashboardData>;
}

/**
 * Dummy Data Service Implementation
 * Currently returns mock data. Replace with actual API/Excel integration later.
 */
class DummyDataService implements IDataService {
  async getTimeSeriesData(): Promise<TimeSeriesData[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
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
  }

  async getCategoryDistribution(): Promise<CategoryData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      { name: 'Category A', value: 35, color: '#0088FE' },
      { name: 'Category B', value: 28, color: '#00C49F' },
      { name: 'Category C', value: 22, color: '#FFBB28' },
      { name: 'Category D', value: 15, color: '#FF8042' },
    ];
  }

  async getMonthlyComparison(): Promise<CategoryData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      { name: 'Jan', value: 45 },
      { name: 'Feb', value: 52 },
      { name: 'Mar', value: 48 },
      { name: 'Apr', value: 61 },
      { name: 'May', value: 55 },
      { name: 'Jun', value: 68 },
      { name: 'Jul', value: 72 },
      { name: 'Aug', value: 78 },
      { name: 'Sep', value: 85 },
      { name: 'Oct', value: 92 },
      { name: 'Nov', value: 98 },
      { name: 'Dec', value: 105 },
    ];
  }

  async getTrends(): Promise<TimeSeriesData[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return [
      { date: '2024-01', value: 450 },
      { date: '2024-02', value: 480 },
      { date: '2024-03', value: 520 },
      { date: '2024-04', value: 490 },
      { date: '2024-05', value: 550 },
      { date: '2024-06', value: 580 },
      { date: '2024-07', value: 620 },
      { date: '2024-08', value: 650 },
      { date: '2024-09', value: 680 },
      { date: '2024-10', value: 720 },
      { date: '2024-11', value: 750 },
      { date: '2024-12', value: 780 },
    ];
  }

  async getAllDashboardData(): Promise<DashboardData> {
    const [timeSeries, categoryDistribution, monthlyComparison, trends] = await Promise.all([
      this.getTimeSeriesData(),
      this.getCategoryDistribution(),
      this.getMonthlyComparison(),
      this.getTrends(),
    ]);

    return {
      timeSeries,
      categoryDistribution,
      monthlyComparison,
      trends,
    };
  }
}

/**
 * Future API Data Service Implementation
 * This will be implemented when integrating with Excel/API
 */
class ApiDataService implements IDataService {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  async getTimeSeriesData(): Promise<TimeSeriesData[]> {
    const response = await fetch(`${this.baseUrl}/time-series`);
    if (!response.ok) throw new Error('Failed to fetch time series data');
    return response.json();
  }

  async getCategoryDistribution(): Promise<CategoryData[]> {
    const response = await fetch(`${this.baseUrl}/category-distribution`);
    if (!response.ok) throw new Error('Failed to fetch category distribution');
    return response.json();
  }

  async getMonthlyComparison(): Promise<CategoryData[]> {
    const response = await fetch(`${this.baseUrl}/monthly-comparison`);
    if (!response.ok) throw new Error('Failed to fetch monthly comparison');
    return response.json();
  }

  async getTrends(): Promise<TimeSeriesData[]> {
    const response = await fetch(`${this.baseUrl}/trends`);
    if (!response.ok) throw new Error('Failed to fetch trends');
    return response.json();
  }

  async getAllDashboardData(): Promise<DashboardData> {
    const response = await fetch(`${this.baseUrl}/dashboard`);
    if (!response.ok) throw new Error('Failed to fetch dashboard data');
    return response.json();
  }
}

// Export singleton instance
// Switch to ApiDataService when ready to integrate API
export const dataService: IDataService = new DummyDataService();

// Export service classes for testing/customization
export { DummyDataService, ApiDataService };


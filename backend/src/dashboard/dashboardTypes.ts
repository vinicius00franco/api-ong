export interface DashboardStats {
  totalProducts: number;
  totalOrganizations: number;
  totalCategories: number;
  totalInventoryValue: number;
  averageProductPrice: number;
  totalStockQuantity: number;
  productsByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  productsByOrganization: Array<{
    organization: string;
    count: number;
    stock: number;
  }>;
  recentProducts: Array<{
    id: number;
    name: string;
    price: number;
    category: string;
    organization: string;
    createdAt: string;
  }>;
  searchMetrics: {
    totalSearches: number;
    aiUsageRate: number;
    fallbackRate: number;
    averageLatency: number;
  };
}

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  target: string;
  timestamp: string;
  icon: string;
  type: 'product' | 'search' | 'order';
}
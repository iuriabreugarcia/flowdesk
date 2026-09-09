export type ReportRange = '30d' | '90d' | '6m' | '12m';

export interface ReportPeriod {
  range: ReportRange;
  label: string;
  startUtc: string;
  endUtc: string;
}

export interface ReportKpis {
  revenue: number;
  revenueChangePercent: number;
  ordersCreated: number;
  completedOrders: number;
  completionRate: number;
  averageTicket: number;
  openOrders: number;
  openPipeline: number;
  activeCustomers: number;
  averageLeadTimeHours: number;
}

export interface RevenueTrendPoint {
  key: string;
  label: string;
  startUtc: string;
  endUtc: string;
  revenue: number;
  ordersCreated: number;
  completedOrders: number;
}

export interface OrderStatusBreakdown {
  status: 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'DONE';
  label: string;
  count: number;
  value: number;
}

export interface TopCustomer {
  customerId: string;
  customerName: string;
  completedOrders: number;
  revenue: number;
  sharePercent: number;
}

export interface InventoryAnalytics {
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  costValue: number;
  saleValue: number;
  potentialMargin: number;
  movementsInPeriod: number;
}

export interface TopMovedProduct {
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  movedQuantity: number;
  movements: number;
  currentStock: number;
}

export interface RecentCompletedOrder {
  id: string;
  number: string;
  title: string;
  customerName: string;
  value: number;
  completedAtUtc: string;
}

export interface ReportsOverview {
  period: ReportPeriod;
  kpis: ReportKpis;
  revenueTrend: RevenueTrendPoint[];
  ordersByStatus: OrderStatusBreakdown[];
  topCustomers: TopCustomer[];
  inventory: InventoryAnalytics;
  topMovedProducts: TopMovedProduct[];
  recentCompletedOrders: RecentCompletedOrder[];
}

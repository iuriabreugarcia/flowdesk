export type MovementType = 'ENTRY' | 'EXIT' | 'ADJUSTMENT';

export interface LowStockProduct {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  currentStock: number;
  minimumStock: number;
  stockStatus: 'LOW' | 'OUT';
}

export interface InventorySummary {
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  inventoryCostValue: number;
  inventorySaleValue: number;
  lowStockItems: LowStockProduct[];
}

export interface StockMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  note: string | null;
  userId: string | null;
  userName: string | null;
  createdAtUtc: string;
}

export interface MovementPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface StockMovementPayload {
  type: MovementType;
  quantity: number;
  note: string | null;
}

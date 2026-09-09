export type ProductStockStatus = 'OK' | 'LOW' | 'OUT';

export interface ProductListItem {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  currentStock: number;
  minimumStock: number;
  stockStatus: ProductStockStatus;
  updatedAtUtc: string;
}

export interface ProductDetails extends ProductListItem {
  createdAtUtc: string;
}

export interface ProductPagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  initialStock: number;
  minimumStock: number;
}

export interface UpdateProductPayload {
  sku: string;
  name: string;
  category: string | null;
  unit: string;
  costPrice: number;
  salePrice: number;
  minimumStock: number;
}

export interface CustomerListItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface Customer extends CustomerListItem {
  notes: string | null;
}

export interface CustomerPayload {
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  notes: string | null;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

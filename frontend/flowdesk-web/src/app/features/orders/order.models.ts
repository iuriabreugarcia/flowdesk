export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'WAITING' | 'DONE';
export type OrderPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type OrderItemType = 'PRODUCT' | 'SERVICE';

export interface OrderCard {
  id: string;
  number: string;
  title: string;
  customerId: string;
  customerName: string;
  status: OrderStatus;
  priority: OrderPriority;
  estimatedValue: number;
  dueDateUtc: string | null;
  assignedUserId: string | null;
  assignedUserName: string | null;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface OrderActivity {
  id: string;
  type: string;
  description: string;
  fromValue: string | null;
  toValue: string | null;
  userId: string | null;
  userName: string | null;
  createdAtUtc: string;
}

export interface OrderItem {
  id: string;
  type: OrderItemType;
  productId: string | null;
  productSku: string | null;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  total: number;
  affectsStock: boolean;
  stockDeductedAtUtc: string | null;
  productCurrentStock: number | null;
}

export interface OrderDetails extends OrderCard {
  description: string | null;
  notes: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  itemsSubtotal: number;
  itemsDiscount: number;
  itemsTotal: number;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  items: OrderItem[];
  activities: OrderActivity[];
}

export interface OrderPayload {
  customerId: string;
  title: string;
  description: string | null;
  notes: string | null;
  priority: OrderPriority;
  estimatedValue: number;
  dueDateUtc: string | null;
}

export interface OrderItemPayload {
  type: OrderItemType;
  productId: string | null;
  description: string | null;
  unit: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  affectsStock: boolean;
}

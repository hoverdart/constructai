export type OrderStatus = 'On Track' | 'Pending Confirmation' | 'Delayed';

export interface Order {
  supplier: string;
  item_description: string;
  quantity: number;
  unit: string;
  expected_delivery_date: string;
  status: OrderStatus;
}

export interface FilterState {
  status: OrderStatus | 'All';
  supplier: string;
  search: string;
}

export type InsightSeverity = 'info' | 'warning' | 'critical';

export interface OrderInsight {
  id: string;
  title: string;
  summary: string;
  action: string;
  severity: InsightSeverity;
  supplier?: string | null;
  dueDate?: string | null;
}

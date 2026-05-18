import type { Order, FilterState, OrderWithUiId } from '@/app/types/orders';

export function filterOrders(orders: Order[], filters: FilterState): Order[] {
  return orders.filter((order) => {
    const matchesStatus =
      filters.status === 'All' || order.status === filters.status;

    const matchesSupplier =
      filters.supplier === 'All' || order.supplier === filters.supplier;

    const query = filters.search.toLowerCase();
    const matchesSearch =
      query === '' ||
      order.supplier.toLowerCase().includes(query) ||
      order.item_description.toLowerCase().includes(query);

    return matchesStatus && matchesSupplier && matchesSearch;
  });
}

export function getUniqueSuppliers(orders: Order[]): string[] {
  return Array.from(new Set(orders.map((o) => o.supplier))).sort();
}

// Formats orders into a concise plain-text summary for the AI system prompt.
export function formatOrdersForAI(orders: OrderWithUiId[]): string {
  if (orders.length === 0) return 'No orders are currently visible.';

  return orders
    .map(
      (o) =>
        `Order ${o.displayIndex} (${o.uiId}): ${o.supplier} — ${o.item_description} | Qty: ${o.quantity} ${o.unit} | Due: ${o.expected_delivery_date} | Status: ${o.status}`,
    )
    .join('\n');
}

export function withOrderUiIds(orders: Order[]): OrderWithUiId[] {
  return orders.map((order, index) => ({
    ...order,
    uiId: orderUiId(order, index),
    displayIndex: index + 1,
  }));
}

export function orderDomId(orderId: string): string {
  return `order-row-${orderId}`;
}

function orderUiId(order: Order, index: number): string {
  const base = [
    index + 1,
    order.supplier,
    order.item_description,
    order.expected_delivery_date,
  ]
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  return base || `order-${index + 1}`;
}

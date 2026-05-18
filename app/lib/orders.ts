import type { Order, FilterState } from '@/app/types/orders';

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
export function formatOrdersForAI(orders: Order[]): string {
  if (orders.length === 0) return 'No orders are currently visible.';

  const lines = orders.map(
    (o, i) =>
      `${i + 1}. ${o.supplier} — ${o.item_description} | Qty: ${o.quantity} ${o.unit} | Due: ${o.expected_delivery_date} | Status: ${o.status}`,
  );
  return lines.join('\n');
}

import type { Order } from '@/app/types/orders';
import StatusBadge from './StatusBadge';

interface OrdersTableProps {
  orders: Order[];
}

export default function OrdersTable({ orders }: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 text-center shadow-sm">
        <p className="text-sm text-zinc-500">No orders match the current filters.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Supplier
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Item
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Qty
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Expected Delivery
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-zinc-50"
              >
                <td className="px-4 py-3 font-medium text-zinc-800">
                  {order.supplier}
                </td>
                <td className="px-4 py-3 text-zinc-600 max-w-xs">
                  {order.item_description}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-700">
                  {order.quantity.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-zinc-500">{order.unit}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {formatDate(order.expected_delivery_date)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

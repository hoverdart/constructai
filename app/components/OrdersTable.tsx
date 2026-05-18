import type { OrderWithUiId } from '@/app/types/orders';
import { orderDomId } from '@/app/lib/orders';
import StatusBadge from './StatusBadge';

interface OrdersTableProps {
  orders: OrderWithUiId[];
  selectedOrderId?: string | null;
  highlightedOrderId?: string | null;
}

export default function OrdersTable({
  orders,
  selectedOrderId,
  highlightedOrderId,
}: OrdersTableProps) {
  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl border border-zinc-200 bg-white py-16 shadow-sm">
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
              {['Supplier', 'Item', 'Qty', 'Unit', 'Expected Delivery', 'Status'].map((col) => (
                <th
                  key={col}
                  className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500 ${col === 'Qty' ? 'text-right' : 'text-left'}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((order) => {
              const selected = selectedOrderId === order.uiId;
              const highlighted = highlightedOrderId === order.uiId;
              return (
                <tr
                  key={order.uiId}
                  id={orderDomId(order.uiId)}
                  className={`transition-all duration-700 ease-out ${
                    highlighted || selected
                      ? selected
                        ? 'bg-blue-50 ring-2 ring-inset ring-blue-300'
                        : 'bg-amber-50 ring-1 ring-inset ring-amber-300'
                      : 'hover:bg-zinc-50'
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-zinc-800">{order.supplier}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-zinc-400">
                      Order {order.displayIndex}
                    </div>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-zinc-600">{order.item_description}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-700">
                    {order.quantity.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{order.unit}</td>
                  <td className="px-4 py-3 text-zinc-600">{formatDate(order.expected_delivery_date)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

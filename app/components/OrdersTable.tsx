import { Fragment } from 'react';
import type { OrderInsight, OrderWithUiId } from '@/app/types/orders';
import { orderDomId } from '@/app/lib/orders';
import { InsightCard } from './InsightsPanel';
import StatusBadge from './StatusBadge';

interface OrdersTableProps {
  insights: OrderInsight[];
  insightsLoading: boolean;
  onSelectOrder: (orderId: string) => void;
  orders: OrderWithUiId[];
  selectedOrderId?: string | null;
  highlightedOrderId?: string | null;
}

export default function OrdersTable({
  insights,
  insightsLoading,
  onSelectOrder,
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
              const rowInsights = insights.filter((insight) =>
                insight.targetOrderIds.includes(order.uiId),
              );

              return (
                <Fragment key={order.uiId}>
                  <tr
                    id={orderDomId(order.uiId)}
                    onClick={() => onSelectOrder(order.uiId)}
                    className={`cursor-pointer transition-all duration-700 ease-out ${
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
                  {selected ? (
                    <tr className="bg-blue-50/40">
                      <td colSpan={6} className="px-4 py-3">
                        {/* Row-level insights reuse the global AI scan instead of making a second API call. */}
                        <RowInsights
                          insights={rowInsights}
                          loading={insightsLoading}
                        />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowInsights({
  insights,
  loading,
}: {
  insights: OrderInsight[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-lg border border-blue-100 bg-white px-4 py-3 text-sm text-zinc-500">
        Loading insights for this order...
      </div>
    );
  }

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-blue-100 bg-white px-4 py-3 text-sm text-zinc-500">
        No targeted insights for this order right now.
      </div>
    );
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {insights.map((insight) => (
        <InsightCard compact insight={insight} key={insight.id} />
      ))}
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

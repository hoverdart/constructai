'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FilterState,
  Order,
  OrderInsight,
} from '@/app/types/orders';
import {
  filterOrders,
  getUniqueSuppliers,
  orderDomId,
  withOrderUiIds,
} from '@/app/lib/orders';
import FilterBar from './FilterBar';
import OrdersTable from './OrdersTable';
import StatCard from './StatCard';
import AIAgent from './AIAgent';
import InsightPopups from './InsightPopups';

const DEFAULT_FILTERS: FilterState = {
  status: 'All',
  supplier: 'All',
  search: '',
};

interface DashboardProps {
  orders: Order[];
}

export default function Dashboard({ orders }: DashboardProps) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [insights, setInsights] = useState<OrderInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  const suppliers = useMemo(() => getUniqueSuppliers(orders), [orders]);
  const filtered = useMemo(() => filterOrders(orders, filters), [orders, filters]);
  const visibleOrders = useMemo(() => withOrderUiIds(filtered), [filtered]);
  const orderSignature = useMemo(
    () =>
      visibleOrders
        .map(
          (order) =>
            `${order.uiId}|${order.quantity}|${order.expected_delivery_date}|${order.status}`,
        )
        .join('::'),
    [visibleOrders],
  );

  const onTrackCount = visibleOrders.filter((o) => o.status === 'On Track').length;
  const pendingCount = visibleOrders.filter(
    (o) => o.status === 'Pending Confirmation',
  ).length;
  const delayedCount = visibleOrders.filter((o) => o.status === 'Delayed').length;

  useEffect(() => {
    const controller = new AbortController();

    async function scanVisibleOrders() {
      if (visibleOrders.length === 0) {
        setInsights([]);
        return;
      }

      setInsightsLoading(true);

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders: visibleOrders }),
          signal: controller.signal,
        });

        if (!res.ok) {
          setInsights([]);
          return;
        }

        const data = (await res.json()) as { insights?: OrderInsight[] };
        setInsights(Array.isArray(data.insights) ? data.insights : []);
      } catch {
        if (!controller.signal.aborted) setInsights([]);
      } finally {
        if (!controller.signal.aborted) setInsightsLoading(false);
      }
    }

    const timeout = window.setTimeout(scanVisibleOrders, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [visibleOrders, orderSignature]);

  const visibleOrderIds = useMemo(
    () => new Set(visibleOrders.map((order) => order.uiId)),
    [visibleOrders],
  );
  const visibleSelectedOrderId =
    selectedOrderId && visibleOrderIds.has(selectedOrderId) ? selectedOrderId : null;
  const visibleHighlightedOrderId =
    highlightedOrderId && visibleOrderIds.has(highlightedOrderId)
      ? highlightedOrderId
      : null;

  const selectOrder = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setHighlightedOrderId(orderId);

    window.requestAnimationFrame(() => {
      document
        .getElementById(orderDomId(orderId))
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    window.setTimeout(() => {
      setHighlightedOrderId((current) => (current === orderId ? null : current));
    }, 1800);
  }, []);

  const handleSelectInsight = useCallback(
    (insight: OrderInsight) => {
      const targetOrderId = insight.targetOrderIds[0];
      if (targetOrderId) selectOrder(targetOrderId);
    },
    [selectOrder],
  );

  const handleDismissInsight = useCallback(
    (insight: OrderInsight) => {
      if (selectedOrderId && insight.targetOrderIds.includes(selectedOrderId)) {
        setSelectedOrderId(null);
        setHighlightedOrderId(null);
      }
    },
    [selectedOrderId],
  );

  const urgentInsightCount = insights.filter(
    (insight) => insight.severity === 'critical' || insight.severity === 'warning',
  ).length;

  return (
    <div className="min-h-screen bg-zinc-50 pb-28">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              Production Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Track delivery orders and get AI-powered insights.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsInsightsOpen((open) => !open)}
            className={`group relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-lg border px-4 py-2 text-sm font-semibold shadow-sm transition-all duration-300 ${
              isInsightsOpen
                ? 'border-blue-300 bg-blue-300 text-white shadow-blue-200'
                : 'border-blue-100 bg-white text-zinc-900 hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md'
            }`}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-amber-200 via-blue-200 to-emerald-200 opacity-40 blur-xl transition group-hover:opacity-70" />
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-blue-500" />
            </span>
            <span className="relative">
              {isInsightsOpen ? 'Hide Insights' : 'Show Insights'}
            </span>
            <span className="relative rounded-full bg-black/10 px-2 py-0.5 text-xs">
              {insightsLoading ? '...' : urgentInsightCount || insights.length}
            </span>
          </button>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total" value={visibleOrders.length} color="blue" />
            <StatCard label="On Track" value={onTrackCount} color="emerald" />
            <StatCard label="Pending" value={pendingCount} color="amber" />
            <StatCard label="Delayed" value={delayedCount} color="red" />
          </div>

          <FilterBar filters={filters} suppliers={suppliers} onChange={setFilters} />

          <InsightPopups
            isOpen={isInsightsOpen}
            insights={insights}
            loading={insightsLoading}
            onDismissInsight={handleDismissInsight}
            onSelectInsight={handleSelectInsight}
          />

          <OrdersTable
            orders={visibleOrders}
            selectedOrderId={visibleSelectedOrderId}
            highlightedOrderId={visibleHighlightedOrderId}
          />

          <p className="text-xs text-zinc-400">
            Showing {visibleOrders.length} of {orders.length} orders
          </p>
        </div>
      </div>

      <AIAgent
        orders={visibleOrders}
        isOpen={isChatOpen}
        onHighlight={selectOrder}
        onOpenChange={setIsChatOpen}
      />
    </div>
  );
}

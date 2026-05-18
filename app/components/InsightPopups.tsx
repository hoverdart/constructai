'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Order, OrderInsight, InsightSeverity } from '@/app/types/orders';

interface InsightPopupsProps {
  orders: Order[];
}

const severityStyles: Record<InsightSeverity, string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-950',
  warning: 'border-amber-200 bg-amber-50 text-amber-950',
  critical: 'border-red-200 bg-red-50 text-red-950',
};

const severityDots: Record<InsightSeverity, string> = {
  info: 'bg-blue-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
};

export default function InsightPopups({ orders }: InsightPopupsProps) {
  const [insights, setInsights] = useState<OrderInsight[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);

  const orderSignature = useMemo(
    () =>
      orders
        .map(
          (order) =>
            `${order.supplier}|${order.item_description}|${order.quantity}|${order.expected_delivery_date}|${order.status}`,
        )
        .join('::'),
    [orders],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function scanOrders() {
      if (orders.length === 0) {
        setInsights([]);
        return;
      }

      setLoading(true);

      try {
        const res = await fetch('/api/insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orders }),
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
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    const timeout = window.setTimeout(scanOrders, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [orders, orderSignature]);

  const visibleInsights = insights.filter((insight) => !dismissed.has(insight.id));

  if (visibleInsights.length === 0 && !loading) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
      {loading && visibleInsights.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-500 shadow-lg">
          Scanning orders for insights...
        </div>
      ) : null}

      {visibleInsights.map((insight) => (
        <div
          key={insight.id}
          className={`rounded-lg border px-4 py-3 shadow-lg ${severityStyles[insight.severity]}`}
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDots[insight.severity]}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold">{insight.title}</p>
                <button
                  type="button"
                  aria-label={`Dismiss ${insight.title}`}
                  onClick={() =>
                    setDismissed((current) => new Set(current).add(insight.id))
                  }
                  className="shrink-0 rounded p-0.5 text-current opacity-55 transition hover:opacity-100"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="mt-1 text-xs leading-relaxed opacity-80">
                {insight.summary}
              </p>
              <p className="mt-2 text-xs font-medium">{insight.action}</p>
              {(insight.supplier || insight.dueDate) && (
                <p className="mt-2 text-[11px] opacity-60">
                  {[insight.supplier, formatDate(insight.dueDate)]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';

  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

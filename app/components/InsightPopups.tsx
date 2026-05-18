'use client';

import { useMemo, useState } from 'react';
import type { OrderInsight, InsightSeverity } from '@/app/types/orders';

interface InsightPopupsProps {
  insights: OrderInsight[];
  isOpen: boolean;
  loading: boolean;
  onDismissInsight: (insight: OrderInsight) => void;
  onSelectInsight: (insight: OrderInsight) => void;
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

export default function InsightPopups({
  insights,
  isOpen,
  loading,
  onDismissInsight,
  onSelectInsight,
}: InsightPopupsProps) {
  const [dismissedState, setDismissedState] = useState<{
    ids: Set<string>;
    signature: string;
  }>(() => ({ ids: new Set(), signature: '' }));
  const insightSignature = useMemo(
    () => insights.map((insight) => insight.id).join('::'),
    [insights],
  );
  const dismissed =
    dismissedState.signature === insightSignature ? dismissedState.ids : new Set<string>();
  const visibleInsights = insights.filter((insight) => !dismissed.has(insight.id));

  return (
    <div
      className={`overflow-hidden transition-all duration-500 ease-out ${
        isOpen ? 'max-h-[520px] opacity-100' : 'max-h-0 opacity-0'
      }`}
    >
      <div className="rounded-lg border border-zinc-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Actionable insights</p>
            <p className="text-xs text-zinc-500">
              Click an insight to jump to the affected order row.
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600">
            {loading ? 'Scanning' : `${visibleInsights.length} active`}
          </span>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-3">
          {loading && visibleInsights.length === 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-lg border border-zinc-100 bg-zinc-50"
                />
              ))}
            </div>
          ) : null}

          {!loading && visibleInsights.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
              No active insights for the visible orders.
            </div>
          ) : null}

          {visibleInsights.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleInsights.map((insight) => (
                <InsightCard
                  insight={insight}
                  key={insight.id}
                  onDismiss={(dismissedInsight) => {
                    setDismissedState((current) => {
                      const ids =
                        current.signature === insightSignature
                          ? new Set(current.ids)
                          : new Set<string>();
                      ids.add(dismissedInsight.id);
                      return { ids, signature: insightSignature };
                    });
                    onDismissInsight(dismissedInsight);
                  }}
                  onSelect={onSelectInsight}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function InsightCard({
  insight,
  onDismiss,
  onSelect,
}: {
  insight: OrderInsight;
  onDismiss: (insight: OrderInsight) => void;
  onSelect: (insight: OrderInsight) => void;
}) {
  const hasTarget = insight.targetOrderIds.length > 0;

  return (
    <div
      role={hasTarget ? 'button' : undefined}
      tabIndex={hasTarget ? 0 : undefined}
      onClick={() => {
        if (hasTarget) onSelect(insight);
      }}
      onKeyDown={(event) => {
        if (hasTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect(insight);
        }
      }}
      className={`rounded-lg border p-3 text-left transition-all duration-300 ${
        hasTarget
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
          : 'cursor-default'
      } ${severityStyles[insight.severity]}`}
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
              onClick={(event) => {
                event.stopPropagation();
                onDismiss(insight);
              }}
              className="shrink-0 rounded p-0.5 text-current opacity-55 transition hover:bg-black/5 hover:opacity-100"
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-65">
            {insight.supplier ? <span>{insight.supplier}</span> : null}
            {insight.dueDate ? <span>{formatDate(insight.dueDate)}</span> : null}
            {hasTarget ? (
              <span className="font-medium text-current underline underline-offset-2">
                View order
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

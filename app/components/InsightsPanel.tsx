'use client';

import type { InsightSeverity, InsightType, OrderInsight } from '@/app/types/orders';

interface InsightsPanelProps {
  displayCount: number;
  insights: OrderInsight[];
  isOpen: boolean;
  loading: boolean;
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

const typeStyles: Record<InsightType, string> = {
  actionable: '',
  at_risk: 'border-violet-200 bg-violet-50 text-violet-950',
};

const typeDots: Record<InsightType, string> = {
  actionable: '',
  at_risk: 'bg-violet-500',
};

const typeLabels: Record<InsightType, string> = {
  actionable: 'Actionable',
  at_risk: 'At risk',
};

export default function InsightsPanel({
  displayCount,
  insights,
  isOpen,
  loading,
  onSelectInsight,
}: InsightsPanelProps) {
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
            {loading ? 'Scanning' : `${displayCount} row insights`}
          </span>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-3">
          {loading && insights.length === 0 ? <InsightsSkeleton /> : null}

          {!loading && insights.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
              No active insights for the visible orders.
            </div>
          ) : null}

          {insights.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {insights.map((insight) => (
                <InsightCard
                  insight={insight}
                  key={insight.id}
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

export function InsightCard({
  insight,
  onSelect,
  compact = false,
}: {
  insight: OrderInsight;
  onSelect?: (insight: OrderInsight) => void;
  compact?: boolean;
}) {
  const hasTarget = insight.targetOrderIds.length > 0;
  const clickable = hasTarget && Boolean(onSelect);
  const cardStyle =
    insight.type === 'at_risk'
      ? typeStyles.at_risk
      : severityStyles[insight.severity];
  const dotStyle =
    insight.type === 'at_risk'
      ? typeDots.at_risk
      : severityDots[insight.severity];

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={() => {
        if (clickable) onSelect?.(insight);
      }}
      onKeyDown={(event) => {
        if (clickable && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onSelect?.(insight);
        }
      }}
      className={`rounded-lg border text-left transition-all duration-300 ${
        compact ? 'p-2.5' : 'p-3'
      } ${
        clickable
          ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
          : 'cursor-default'
      } ${cardStyle}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotStyle}`}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-current/10">
              {typeLabels[insight.type]}
            </span>
            {insight.type === 'at_risk' ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700 ring-1 ring-violet-200">
                Might slip
              </span>
            ) : null}
          </div>
          <p className="text-sm font-semibold">{insight.title}</p>
          <p className="mt-1 text-xs leading-relaxed opacity-80">
            {insight.summary}
          </p>
          <p className="mt-2 text-xs font-medium">{insight.action}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-65">
            {insight.supplier ? <span>{insight.supplier}</span> : null}
            {insight.dueDate ? <span>{formatDate(insight.dueDate)}</span> : null}
            {clickable ? (
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

function InsightsSkeleton() {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-28 animate-pulse rounded-lg border border-zinc-100 bg-zinc-50"
        />
      ))}
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

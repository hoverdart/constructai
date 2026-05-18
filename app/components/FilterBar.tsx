'use client';

import type { FilterState, OrderStatus } from '@/app/types/orders';

const STATUS_OPTIONS: Array<OrderStatus | 'All'> = [
  'All',
  'On Track',
  'Pending Confirmation',
  'Delayed',
];

interface FilterBarProps {
  filters: FilterState;
  suppliers: string[];
  onChange: (filters: FilterState) => void;
}

export default function FilterBar({ filters, suppliers, onChange }: FilterBarProps) {
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
      {/* Search */}
      <div className="relative flex-1 min-w-48">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search supplier or item..."
          value={filters.search}
          onChange={(e) => set('search', e.target.value)}
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder-zinc-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {/* Status filter */}
      <select
        value={filters.status}
        onChange={(e) => set('status', e.target.value as FilterState['status'])}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s === 'All' ? 'All Statuses' : s}
          </option>
        ))}
      </select>

      {/* Supplier filter */}
      <select
        value={filters.supplier}
        onChange={(e) => set('supplier', e.target.value)}
        className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
      >
        <option value="All">All Suppliers</option>
        {suppliers.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {/* Clear button — only visible when filters are active */}
      {(filters.search !== '' || filters.status !== 'All' || filters.supplier !== 'All') && (
        <button
          onClick={() => onChange({ search: '', status: 'All', supplier: 'All' })}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 transition hover:bg-zinc-50 hover:text-zinc-700"
        >
          Clear
        </button>
      )}
    </div>
  );
}

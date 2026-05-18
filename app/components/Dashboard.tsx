'use client';

import { useState, useMemo } from 'react';
import type { Order, FilterState } from '@/app/types/orders';
import { filterOrders, getUniqueSuppliers } from '@/app/lib/orders';
import FilterBar from './FilterBar';
import OrdersTable from './OrdersTable';
import StatCard from './StatCard';
import AIAgent from './AIAgent';

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

  const suppliers = useMemo(() => getUniqueSuppliers(orders), [orders]);

  const filtered = useMemo(
    () => filterOrders(orders, filters),
    [orders, filters],
  );

  // Counts per status for the stat cards
  const onTrackCount = filtered.filter((o) => o.status === 'On Track').length;
  const pendingCount = filtered.filter((o) => o.status === 'Pending Confirmation').length;
  const delayedCount = filtered.filter((o) => o.status === 'Delayed').length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-900">Production Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Track delivery orders and get AI-powered insights.
          </p>
        </div>

        {/* Two-column layout: table on left, AI agent on right */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
          {/* Left column */}
          <div className="flex flex-1 flex-col gap-4 min-w-0">
            {/* Stats row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total" value={filtered.length} color="blue" />
              <StatCard label="On Track" value={onTrackCount} color="emerald" />
              <StatCard label="Pending" value={pendingCount} color="amber" />
              <StatCard label="Delayed" value={delayedCount} color="red" />
            </div>

            {/* Filters */}
            <FilterBar
              filters={filters}
              suppliers={suppliers}
              onChange={setFilters}
            />

            {/* Table */}
            <OrdersTable orders={filtered} />

            <p className="text-xs text-zinc-400">
              Showing {filtered.length} of {orders.length} orders
            </p>
          </div>

          {/* Right column — AI Agent panel */}
          <div className="w-full lg:w-96 lg:sticky lg:top-8">
            {/* Fixed height so the chat panel doesn't expand infinitely */}
            <div className="h-[600px]">
              <AIAgent orders={filtered} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

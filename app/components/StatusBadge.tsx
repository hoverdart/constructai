import type { OrderStatus } from '@/app/types/orders';

const statusStyles: Record<OrderStatus, string> = {
  'On Track': 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  'Pending Confirmation': 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  Delayed: 'bg-red-100 text-red-800 ring-1 ring-red-200',
};

const statusDots: Record<OrderStatus, string> = {
  'On Track': 'bg-emerald-500',
  'Pending Confirmation': 'bg-amber-500',
  Delayed: 'bg-red-500',
};

interface StatusBadgeProps {
  status: OrderStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${statusDots[status]}`} />
      {status}
    </span>
  );
}

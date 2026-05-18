interface StatCardProps {
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'red' | 'blue';
}

const colorMap = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

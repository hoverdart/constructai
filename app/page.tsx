import ordersData from '@/data/data.json';
import type { Order } from '@/app/types/orders';
import Dashboard from '@/app/components/Dashboard';

// The page is a Server Component — it reads data at request time and
// passes the result down to the interactive client Dashboard.
export default function Home() {
  const orders = ordersData as Order[];
  return <Dashboard orders={orders} />;
}

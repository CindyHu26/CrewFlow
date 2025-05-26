import CustomerDetailPage from '@/components/customers/CustomerDetailPage';
import { customerDB } from '@/lib/customerDB';
import { getCurrentUser } from '@/lib/auth';

// 生成靜態路徑參數
export async function generateStaticParams() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return [];
  }
  const customers = await customerDB.getAccessibleCustomers(currentUser);
  return customers.map((customer) => ({
    id: customer.id,
  }));
}

export default function CustomerPage({ params }: { params: { id: string } }) {
  return <CustomerDetailPage customerId={params.id} />;
} 
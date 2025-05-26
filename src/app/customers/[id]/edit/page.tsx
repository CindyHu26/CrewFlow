import CustomerEditPage from '@/components/customers/CustomerEditPage';
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

export default function EditPage({ params }: { params: { id: string } }) {
  return <CustomerEditPage customerId={params.id} />;
} 
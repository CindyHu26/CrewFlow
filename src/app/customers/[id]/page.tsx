import CustomerDetailPage from '@/components/customers/CustomerDetailPage';
import { customerDB } from '@/lib/customerDB';
import { getCurrentUser } from '@/lib/auth';
import Card from '@/components/Card';

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
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CustomerDetailPage customerId={params.id} />
        </Card>
      </div>
    </div>
  );
} 
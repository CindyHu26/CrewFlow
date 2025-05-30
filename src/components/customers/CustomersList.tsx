'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { Customer } from '@/types';
import { useUsers } from '@/contexts/UserContext';
import Card from '@/components/Card';

export default function CustomersList() {
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const user = getCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<'all' | '工廠' | '個人' | '養護機構'>('all');

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/login');
          return;
        }

        const fetchedCustomers = await customerDB.getAccessibleCustomers(currentUser);
        // 按照客戶代號排序，如果代號為空則排在最後
        const sortedCustomers = [...fetchedCustomers].sort((a: Customer, b: Customer) => {
          if (!a.code && !b.code) return 0;
          if (!a.code) return 1;
          if (!b.code) return -1;
          return a.code.localeCompare(b.code);
        });
        setCustomers(sortedCustomers);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : '發生錯誤');
        setLoading(false);
      }
    };

    if (!mounted) {
      setMounted(true);
      fetchCustomers();
    }
  }, [mounted, router]);

  // 搜尋過濾功能
  useEffect(() => {
    if (!customers) return;

    const filtered = customers.filter(customer => {
      const searchLower = searchQuery.toLowerCase();
      
      // 搜尋客戶代號和名稱
      const matchesBasicInfo = (
        (customer.code || '').toLowerCase().includes(searchLower) ||
        customer.name.toLowerCase().includes(searchLower)
      );

      // 搜尋內勤人員名稱
      const matchesInternalStaff = users
        .filter(u => customer.internal_staff.includes(u.id))
        .some(u => u.name.toLowerCase().includes(searchLower));

      // 搜尋外勤人員名稱
      const matchesExternalStaff = users
        .filter(u => customer.external_staff.includes(u.id))
        .some(u => u.name.toLowerCase().includes(searchLower));

      // 符合任一條件即可
      const matchesSearch = matchesBasicInfo || matchesInternalStaff || matchesExternalStaff;

      const matchesCategory = searchCategory === 'all' || customer.category === searchCategory;

      return matchesSearch && matchesCategory;
    });

    setFilteredCustomers(filtered);
  }, [searchQuery, searchCategory, customers, users]);

  if (!mounted) {
    return null;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || usersError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600 mb-4">{error || usersError}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          重新載入
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">客戶管理</h1>
          <button
            onClick={() => router.push('/customers/new')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新增客戶
          </button>
        </div>

        {/* 搜尋區塊 */}
        <Card className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="search" className="block text-xl font-semibold text-gray-700">
                搜尋客戶
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="輸入客戶代號、名稱、內勤或外勤人員姓名"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-xl font-semibold text-gray-700">
                客戶類別
              </label>
              <select
                id="category"
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value as 'all' | '工廠' | '個人' | '養護機構')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="all">全部</option>
                <option value="工廠">工廠</option>
                <option value="個人">個人</option>
                <option value="養護機構">養護機構</option>
              </select>
            </div>
          </div>
        </Card>

        {/* 客戶列表 */}
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    客戶代號
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    客戶名稱
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    客戶類別
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    內勤人員
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    外勤人員
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.code || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {users.filter(u => customer.internal_staff.includes(u.id)).map(u => u.name).join('、') || '無'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {users.filter(u => customer.external_staff.includes(u.id)).map(u => u.name).join('、') || '無'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => router.push(`/customers/${customer.id}`)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => router.push(`/customers/${customer.id}/edit`)}
                        className="text-green-600 hover:text-green-900"
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { CustomerBase, NewCustomer } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useUsers } from '@/contexts/UserContext';
import Card from '@/components/Card';

export default function NewCustomerPage() {
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [formData, setFormData] = useState<CustomerBase>({
    name: '',
    code: '',
    category: '工廠',
    internal_staff: [],
    external_staff: [],
    status: 'active'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStaffCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, checked } = e.target;
    setFormData(prev => {
      const staffList = prev[name as 'internal_staff' | 'external_staff'];
      if (checked) {
        return {
          ...prev,
          [name]: [...staffList, value]
        };
      } else {
        return {
          ...prev,
          [name]: staffList.filter(id => id !== value)
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // 建立新客戶資料
      const newCustomer: NewCustomer = {
        ...formData,
        authorized_users: [currentUser.employee_id],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: currentUser.employee_id
      };

      // 儲存到資料庫
      await customerDB.createCustomer(newCustomer, currentUser);
      router.push('/customers');
    } catch (error) {
      console.error('建立客戶資料時發生錯誤:', error);
      setError('建立客戶資料失敗');
    } finally {
      setLoading(false);
    }
  };

  if (usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">載入使用者資料時發生錯誤</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-8">新增客戶</h1>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  客戶代號
                </label>
                <input
                  type="text"
                    name="code"
                  value={formData.code}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  客戶名稱
                </label>
                <input
                  type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    縣市
                  </label>
                  <input
                    type="text"
                    name="county"
                    value={formData.county || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    鄉鎮市區
                  </label>
                  <input
                    type="text"
                    name="district"
                    value={formData.district || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  />
              </div>

                <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  地址
                </label>
                <input
                  type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  負責人
                </label>
                <input
                  type="text"
                    name="owner"
                    value={formData.owner || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  聯絡人
                </label>
                <input
                  type="text"
                    name="contact"
                    value={formData.contact || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    手機
                  </label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                  />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                    傳真
                </label>
                <input
                  type="tel"
                    name="fax"
                    value={formData.fax || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  客戶類別
                </label>
                <select
                    name="category"
                  value={formData.category}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                >
                  <option value="工廠">工廠</option>
                  <option value="個人">個人</option>
                  <option value="養護機構">養護機構</option>
                </select>
              </div>

                <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  內勤人員
                </label>
                  <div className="border rounded bg-gray-50 p-2 max-h-40 overflow-y-auto">
                  {users
                    .filter(user => user.departments.includes('行政'))
                      .map(user => (
                        <div key={user.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                            id={`internal-${user.id}`}
                            name="internal_staff"
                            value={user.id}
                            checked={formData.internal_staff.includes(user.id)}
                            onChange={handleStaffCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`internal-${user.id}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {user.name}
                    </label>
                        </div>
                  ))}
                </div>
              </div>

                <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  外勤人員
                </label>
                  <div className="border rounded bg-gray-50 p-2 max-h-40 overflow-y-auto">
                  {users
                    .filter(user => user.departments.includes('服務'))
                      .map(user => (
                        <div key={user.id} className="flex items-center mb-1">
                      <input
                        type="checkbox"
                            id={`external-${user.id}`}
                            name="external_staff"
                            value={user.id}
                            checked={formData.external_staff.includes(user.id)}
                            onChange={handleStaffCheckboxChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label
                            htmlFor={`external-${user.id}`}
                            className="ml-2 block text-sm text-gray-900"
                          >
                            {user.name}
                    </label>
                        </div>
                  ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? '處理中...' : '建立客戶'}
                </button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
} 
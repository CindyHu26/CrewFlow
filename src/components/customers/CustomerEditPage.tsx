'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { Customer, User } from '@/types';
import { useUsers } from '@/contexts/UserContext';

export default function CustomerEditPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    county: '',
    district: '',
    address: '',
    owner: '',
    contact: '',
    phone: '',
    fax: '',
    mobile: '',
    category: '工廠' as '工廠' | '個人' | '養護機構',
    internal_staff: [] as string[],
    external_staff: [] as string[],
    status: 'active' as 'active' | 'inactive'
  });

  useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // 載入客戶資料
        const customerData = await customerDB.getCustomer(customerId, user);
        if (!customerData) {
          setError('找不到客戶資料');
          setLoading(false);
          return;
        }

        // 設置表單資料
        setFormData({
          code: customerData.code || '',
          name: customerData.name || '',
          county: customerData.county || '',
          district: customerData.district || '',
          address: customerData.address || '',
          owner: customerData.owner || '',
          contact: customerData.contact || '',
          phone: customerData.phone || '',
          fax: customerData.fax || '',
          mobile: customerData.mobile || '',
          category: customerData.category,
          internal_staff: customerData.internal_staff || [],
          external_staff: customerData.external_staff || [],
          status: customerData.status || 'active'
        });
      } catch (err) {
        console.error('載入資料時發生錯誤:', err);
        setError('載入資料時發生錯誤');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [customerId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const updateData = {
        ...formData,
        updated_at: Timestamp.now()
      };
      await customerDB.updateCustomer(customerId, updateData, user);
      router.push(`/customers/${customerId}`);
    } catch (error) {
      console.error('更新客戶資料時發生錯誤:', error);
      setError('更新客戶資料失敗');
    }
  };

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || usersError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error || usersError}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold mb-8">編輯客戶資料</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    客戶代號
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    客戶名稱
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    縣市
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.county}
                    onChange={(e) => setFormData({ ...formData, county: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    鄉鎮市區
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    地址
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    負責人
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    聯絡人
                  </label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    電話
                  </label>
                  <input
                    type="tel"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    傳真
                  </label>
                  <input
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.fax}
                    onChange={(e) => setFormData({ ...formData, fax: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    手機
                  </label>
                  <input
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    客戶類別
                  </label>
                  <select
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-100"
                    value={formData.category}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      category: e.target.value as '工廠' | '個人' | '養護機構' 
                    })}
                  >
                    <option value="工廠">工廠</option>
                    <option value="個人">個人</option>
                    <option value="養護機構">養護機構</option>
                  </select>
                </div>
              </div>

              {/* 內勤人員選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  內勤人員
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {users
                    .filter(user => user.departments.includes('行政'))
                    .sort((a, b) => {
                      // 已選擇的排在前面
                      const aSelected = formData.internal_staff.includes(a.employee_id);
                      const bSelected = formData.internal_staff.includes(b.employee_id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      // 如果選擇狀態相同，按照姓名排序
                      return a.name.localeCompare(b.name);
                    })
                    .map((user) => (
                    <label key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={formData.internal_staff.includes(user.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              internal_staff: [...formData.internal_staff, user.employee_id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              internal_staff: formData.internal_staff.filter(id => id !== user.employee_id)
                            });
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {user.employee_id} - {user.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 外勤人員選擇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  外勤人員
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto p-2 border rounded-md">
                  {users
                    .filter(user => user.departments.includes('服務'))
                    .sort((a, b) => {
                      // 已選擇的排在前面
                      const aSelected = formData.external_staff.includes(a.employee_id);
                      const bSelected = formData.external_staff.includes(b.employee_id);
                      if (aSelected && !bSelected) return -1;
                      if (!aSelected && bSelected) return 1;
                      // 如果選擇狀態相同，按照姓名排序
                      return a.name.localeCompare(b.name);
                    })
                    .map((user) => (
                    <label key={user.id} className="flex items-center">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        checked={formData.external_staff.includes(user.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              external_staff: [...formData.external_staff, user.employee_id]
                            });
                          } else {
                            setFormData({
                              ...formData,
                              external_staff: formData.external_staff.filter(id => id !== user.employee_id)
                            });
                          }
                        }}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {user.employee_id} - {user.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => router.push(`/customers/${customerId}`)}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 
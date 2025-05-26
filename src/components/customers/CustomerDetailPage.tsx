'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { Customer, User } from '@/types';
import { useUsers } from '@/contexts/UserContext';

export default function CustomerDetailPage({ customerId }: { customerId: string }) {
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedInternalStaff, setSelectedInternalStaff] = useState<string[]>([]);
  const [selectedExternalStaff, setSelectedExternalStaff] = useState<string[]>([]);

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
      setCustomer(customerData);
      setSelectedInternalStaff(customerData.internal_staff);
      setSelectedExternalStaff(customerData.external_staff);
    } catch (err) {
      setError('載入資料時發生錯誤');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [customerId, router]);

  const handleUpdateStaff = async () => {
    setError(null);
    setSuccess(null);
    
    if (!customer) return;
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      const updateData = {
        internal_staff: selectedInternalStaff,
        external_staff: selectedExternalStaff,
        updated_at: Timestamp.now()
      };

      await customerDB.updateCustomer(customer.id, updateData, user);
      
      setSuccess('人員設定更新成功');
      await loadData(); // 重新載入資料以確保顯示最新狀態
    } catch (err) {
      console.error('更新人員時發生錯誤:', err);
      setError('更新人員設定失敗');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer || !window.confirm('確定要刪除此客戶資料嗎？')) return;
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    try {
      await customerDB.deleteCustomer(customer.id, user);
      router.push('/customers');
    } catch (err) {
      console.error('刪除客戶時發生錯誤:', err);
    }
  };

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || usersError || !customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error || usersError || '找不到客戶資料'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <h3 className="text-2xl font-bold leading-6 text-gray-900">
              客戶資料
            </h3>
            <div className="space-x-3">
              <button
                onClick={() => router.push(`/customers/${customer.id}/edit`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                編輯
              </button>
              <button
                onClick={handleDeleteCustomer}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                刪除
              </button>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">客戶代號</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.code}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">客戶名稱</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.name}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">負責人</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.owner}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">聯絡人</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.contact}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">電話</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.phone}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">傳真</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.fax}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">手機</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.mobile}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">客戶類別</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.category}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">區域</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.county}{customer?.district}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">地址</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer?.address}</dd>
              </div>
            </dl>
          </div>

          {/* 內勤和外勤人員管理區塊 */}
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">人員管理</h4>
            <div className="space-y-6">
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
                      const aSelected = selectedInternalStaff.includes(a.employee_id);
                      const bSelected = selectedInternalStaff.includes(b.employee_id);
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
                        checked={selectedInternalStaff.includes(user.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedInternalStaff([...selectedInternalStaff, user.employee_id]);
                          } else {
                            setSelectedInternalStaff(selectedInternalStaff.filter(id => id !== user.employee_id));
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
                      const aSelected = selectedExternalStaff.includes(a.employee_id);
                      const bSelected = selectedExternalStaff.includes(b.employee_id);
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
                        checked={selectedExternalStaff.includes(user.employee_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExternalStaff([...selectedExternalStaff, user.employee_id]);
                          } else {
                            setSelectedExternalStaff(selectedExternalStaff.filter(id => id !== user.employee_id));
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

              {error && (
                <div className="bg-red-50 p-4 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-50 p-4 rounded-md">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleUpdateStaff}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  更新人員設定
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
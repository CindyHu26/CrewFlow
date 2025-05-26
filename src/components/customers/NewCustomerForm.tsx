'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { Customer, CustomerBase, NewCustomer, User } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useUsers } from '@/contexts/UserContext';

export default function NewCustomerForm() {
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
  const [mounted, setMounted] = useState(false);
  const user = getCurrentUser();

  useEffect(() => {
    if (!mounted) {
      setMounted(true);
    }
  }, [mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // 建立基本客戶資料
      const customerBase: CustomerBase = {
        name: formData.name,
        code: formData.code?.trim() || '',
        category: formData.category,
        internal_staff: formData.internal_staff,
        external_staff: formData.external_staff,
        status: 'active'
      };

      // 加入選填欄位（如果有值的話）
      const trimmedCounty = formData.county?.trim();
      if (trimmedCounty) customerBase.county = trimmedCounty;

      const trimmedDistrict = formData.district?.trim();
      if (trimmedDistrict) customerBase.district = trimmedDistrict;

      const trimmedAddress = formData.address?.trim();
      if (trimmedAddress) customerBase.address = trimmedAddress;

      const trimmedOwner = formData.owner?.trim();
      if (trimmedOwner) customerBase.owner = trimmedOwner;

      const trimmedContact = formData.contact?.trim();
      if (trimmedContact) customerBase.contact = trimmedContact;

      const trimmedPhone = formData.phone?.trim();
      if (trimmedPhone) customerBase.phone = trimmedPhone;

      const trimmedFax = formData.fax?.trim();
      if (trimmedFax) customerBase.fax = trimmedFax;

      const trimmedMobile = formData.mobile?.trim();
      if (trimmedMobile) customerBase.mobile = trimmedMobile;

      // 建立新客戶資料
      const newCustomer: NewCustomer = {
        ...customerBase,
        authorized_users: [currentUser.id],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: currentUser.id
      };

      // 儲存到資料庫
      await customerDB.createCustomer(newCustomer, currentUser);
      router.push('/customers');
    } catch (err) {
      setError(err instanceof Error ? err.message : '發生錯誤');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStaffChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, options } = e.target;
    const selectedValues = Array.from(options)
      .filter(option => option.selected)
      .map(option => option.value);
    
    setFormData(prev => ({
      ...prev,
      [name]: selectedValues
    }));
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    router.push('/login');
    return null;
  }

  if (usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600 mb-4">{usersError}</div>
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-6">新增客戶</h1>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本資料 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  客戶名稱 *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  客戶代號
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                  客戶類別 *
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="工廠">工廠</option>
                  <option value="個人">個人</option>
                  <option value="養護機構">養護機構</option>
                </select>
              </div>

              <div>
                <label htmlFor="internal_staff" className="block text-sm font-medium text-gray-700">
                  內勤人員 *
                </label>
                <select
                  id="internal_staff"
                  name="internal_staff"
                  multiple
                  value={formData.internal_staff}
                  onChange={handleStaffChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {users
                    .filter(user => user.departments.includes('行政'))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">按住 Ctrl 鍵可多選</p>
              </div>

              <div>
                <label htmlFor="external_staff" className="block text-sm font-medium text-gray-700">
                  外勤人員 *
                </label>
                <select
                  id="external_staff"
                  name="external_staff"
                  multiple
                  value={formData.external_staff}
                  onChange={handleStaffChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {users
                    .filter(user => user.departments.includes('服務'))
                    .map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
                <p className="mt-1 text-sm text-gray-500">按住 Ctrl 鍵可多選</p>
              </div>
            </div>

            {/* 地址資料 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="county" className="block text-sm font-medium text-gray-700">
                  縣市
                </label>
                <input
                  type="text"
                  id="county"
                  name="county"
                  value={formData.county || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700">
                  鄉鎮市區
                </label>
                <input
                  type="text"
                  id="district"
                  name="district"
                  value={formData.district || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  詳細地址
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  value={formData.address || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 聯絡資料 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700">
                  負責人
                </label>
                <input
                  type="text"
                  id="owner"
                  name="owner"
                  value={formData.owner || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
                  聯絡人
                </label>
                <input
                  type="text"
                  id="contact"
                  name="contact"
                  value={formData.contact || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  電話
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="fax" className="block text-sm font-medium text-gray-700">
                  傳真
                </label>
                <input
                  type="tel"
                  id="fax"
                  name="fax"
                  value={formData.fax || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                  手機
                </label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={formData.mobile || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
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
                {loading ? '處理中...' : '新增客戶'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
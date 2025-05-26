'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { customerDB } from '@/lib/customerDB';
import { serviceDB } from '@/lib/serviceDB';
import { Customer } from '@/types';
import { useUsers } from '@/contexts/UserContext';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';

console.log('=== 頁面組件開始載入 ===');

// 安全轉換 Firebase 日期欄位
function toDateSafe(dateValue: any): Date | null {
  if (!dateValue) return null;
  if (typeof dateValue.toDate === 'function') return dateValue.toDate();
  if (dateValue instanceof Date) return dateValue;
  if (typeof dateValue === 'string' || typeof dateValue === 'number') return new Date(dateValue);
  return null;
}

export default function ServiceRecordsPage() {
  console.log('=== ServiceRecordsPage 組件渲染 ===');
  
  const router = useRouter();
  const { users, loading: usersLoading, error: usersError } = useUsers();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [serviceRecords, setServiceRecords] = useState<any[]>([]);
  const user = getCurrentUser();

  console.log('初始狀態:', {
    loading,
    error,
    currentMonth,
    customersCount: customers.length,
    serviceRecordsCount: serviceRecords.length,
    user
  });

  useEffect(() => {
    console.log('=== useEffect 觸發 ===');
    console.log('currentMonth:', currentMonth);

    const fetchData = async () => {
      try {
        console.log('=== 開始載入資料 ===');
        
        const currentUser = await getCurrentUser();
        console.log('1. 取得當前使用者:', currentUser);
        
        if (!currentUser) {
          console.log('使用者未登入，導向登入頁面');
          router.push('/login');
          return;
        }

        // 取得客戶列表
        console.log('2. 開始取得客戶列表...');
        const fetchedCustomers = await customerDB.getAccessibleCustomers(currentUser);
        console.log('取得客戶列表完成，數量:', fetchedCustomers.length);
        console.log('客戶列表範例:', fetchedCustomers.slice(0, 3));
        setCustomers(fetchedCustomers);

        // 取得當月服務紀錄
        const startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
        
        console.log('3. 準備查詢服務紀錄:', {
          startDate,
          endDate,
          currentUser: currentUser.employee_id
        });

        const records = await serviceDB.getServiceRecordsByDateRange(
          startDate,
          endDate,
          currentUser
        );
        console.log('4. 取得服務紀錄完成，數量:', records.length);
        if (records.length > 0) {
          console.log('服務紀錄範例:', records[0]);
        }

        setServiceRecords(records);
        console.log('5. 資料載入完成');
        
        setLoading(false);
      } catch (err) {
        console.error('載入資料時發生錯誤:', err);
        setError(err instanceof Error ? err.message : '發生錯誤');
        setLoading(false);
      }
    };

    fetchData();
  }, [currentMonth, router]);

  // 計算每個客戶的服務次數
  const getServiceCount = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      console.log('找不到客戶:', customerId);
      return 0;
    }
    
    const count = serviceRecords.filter(record => 
      record.customer_names && record.customer_names.includes(customer.name)
    ).length;
    
    console.log(`客戶 ${customer.name} 的服務次數:`, count);
    return count;
  };

  // 取得客戶的服務紀錄
  const getCustomerServices = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
      console.log('找不到客戶:', customerId);
      return [];
    }
    
    const services = serviceRecords
      .filter(record => 
        record.customer_names && record.customer_names.includes(customer.name)
      )
      .sort((a, b) => {
        const dateA = toDateSafe(a.date);
        const dateB = toDateSafe(b.date);
        if (!dateA || !dateB) return 0;
        return dateB.getTime() - dateA.getTime();
      });
    
    console.log(`客戶 ${customer.name} 的服務紀錄:`, services);
    return services;
  };

  if (!user) {
    console.log('使用者未登入，準備導向登入頁面');
    router.push('/login');
    return null;
  }

  if (loading || usersLoading) {
    console.log('載入中...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || usersError) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="text-2xl text-red-600 mb-4">
                {error || usersError}
              </div>
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                重新載入
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 月份切換區塊，永遠顯示 */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">服務紀錄管理</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentMonth(newDate);
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              上個月
            </button>
            <span className="text-xl font-semibold">
              {format(currentMonth, 'yyyy年MM月', { locale: zhTW })}
            </span>
            <button
              onClick={() => {
                const newDate = new Date(currentMonth);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentMonth(newDate);
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              下個月
            </button>
          </div>
        </div>

        {/* 內容區塊 */}
        {(customers.length === 0 || serviceRecords.length === 0) ? (
          <div className="bg-white shadow rounded-lg p-12 flex flex-col items-center justify-center mt-16">
            <span className="text-3xl text-red-500 mb-4">找不到服務紀錄</span>
            <span className="text-gray-400">本月份尚無任何服務紀錄，請嘗試切換月份或新增服務。</span>
          </div>
        ) : (
          // ...原本的表格內容...
          <div className="bg-white shadow rounded-lg">
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
                      本月服務次數
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                      最近服務日期
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-base font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => {
                    const serviceCount = getServiceCount(customer.id);
                    const customerServices = getCustomerServices(customer.id);
                    const lastServiceDate = toDateSafe(customerServices[0]?.date);

                    return (
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
                          {serviceCount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {lastServiceDate ? format(lastServiceDate, 'yyyy/MM/dd', { locale: zhTW }) : '無服務紀錄'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={() => router.push(`/services/new?customerId=${customer.id}`)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            新增服務
                          </button>
                          <button
                            onClick={() => router.push(`/services/all?customerId=${customer.id}`)}
                            className="text-green-600 hover:text-green-900"
                          >
                            查看紀錄
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
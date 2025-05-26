'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { format, parse, isValid } from 'date-fns';
import Link from 'next/link';
import { Tab } from '@headlessui/react';

interface Service {
  id: string;
  userId: string;
  username: string;
  customer_names: string[];
  job_types: string[];
  staff_name: string;
  partner_names: string[];
  service_feedback_employer: string;
  service_feedback_worker: string;
  handling_process: string;
  handling_result: string;
  timestamp: Timestamp;
  created_at: Timestamp;
  updated_at: Timestamp;
}

type SortField = 'created_at' | 'username' | 'customer' | 'serviceDate' | 'content';
type SortOrder = 'asc' | 'desc';

type SearchFilters = {
  dateRange: {
    start: string;
    end: string;
  };
  customerName: string;
  staffName: string;
};

interface Report {
  id: string;
  service_id: string;
  type: string;
  body: string;
  is_urgent: boolean;
  status: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

export default function AllServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: {
      start: '',
      end: ''
    },
    customerName: '',
    staffName: ''
  });
  const [activeTab, setActiveTab] = useState<'services' | 'reports'>('services');
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // 檢查使用者權限
        if ((user.position_level ?? 0) < 3) {
          router.push('/services');
          return;
        }

        // 獲取所有服務紀錄，按建立時間降序排序
        const servicesRef = collection(db, 'services');
        const q = query(
          servicesRef,
          orderBy('created_at', 'desc')
        );

        const querySnapshot = await getDocs(q);
        console.log('查詢結果數量:', querySnapshot.size);

        const servicesData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          console.log('原始資料:', data);
          return {
            id: doc.id,
            userId: data.userId || '',
            username: data.staff_name || '',
            customer_names: data.customer_names || [],
            job_types: data.job_types || [],
            staff_name: data.staff_name || '',
            partner_names: data.partner_names || [],
            service_feedback_employer: data.service_feedback_employer || '',
            service_feedback_worker: data.service_feedback_worker || '',
            handling_process: data.handling_process || '',
            handling_result: data.handling_result || '',
            timestamp: data.timestamp || Timestamp.now(),
            created_at: data.created_at || Timestamp.now(),
            updated_at: data.updated_at || Timestamp.now()
          };
        }) as Service[];

        console.log('處理後的資料:', servicesData);
        setServices(servicesData);
        setLoading(false);
      } catch (err) {
        console.error('獲取服務紀錄時發生錯誤:', err);
        setError('無法載入服務紀錄');
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  useEffect(() => {
    const fetchReports = async () => {
      const reportsRef = collection(db, 'reports');
      const q = query(reportsRef, orderBy('created_at', 'desc'));
      const snapshot = await getDocs(q);
      let allReports = snapshot.docs.map(doc => ({
        id: doc.id,
        service_id: doc.data().service_id || '',
        type: doc.data().type || '',
        body: doc.data().body || '',
        is_urgent: doc.data().is_urgent || false,
        status: doc.data().status || '待處理',
        created_at: doc.data().created_at || Timestamp.now(),
        updated_at: doc.data().updated_at || Timestamp.now()
      })) as Report[];
      // 排序：未處理且緊急 > 其他，時間遞減
      allReports.sort((a, b) => {
        if (a.status === '待處理' && a.is_urgent && !(b.status === '待處理' && b.is_urgent)) return -1;
        if (!(a.status === '待處理' && a.is_urgent) && b.status === '待處理' && b.is_urgent) return 1;
        return b.created_at.toMillis() - a.created_at.toMillis();
      });
      setReports(allReports);
    };
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) {
      return '↕️';
    }
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const handleFilterChange = (field: keyof SearchFilters, value: any) => {
    if (field === 'dateRange') {
      setFilters(prev => ({
        ...prev,
        dateRange: { ...prev.dateRange, ...value }
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const resetFilters = () => {
    setFilters({
      dateRange: {
        start: '',
        end: ''
      },
      customerName: '',
      staffName: ''
    });
  };

  const getFilteredServices = () => {
    return services.filter(service => {
      const serviceDate = service.timestamp.toDate();
      
      // 日期範圍過濾
      if (filters.dateRange.start) {
        const startDate = parse(filters.dateRange.start, 'yyyy-MM-dd', new Date());
        if (isValid(startDate) && serviceDate < startDate) return false;
      }
      if (filters.dateRange.end) {
        const endDate = parse(filters.dateRange.end, 'yyyy-MM-dd', new Date());
        if (isValid(endDate) && serviceDate > endDate) return false;
      }

      // 客戶名稱過濾
      if (filters.customerName && 
          !service.customer_names.some(name => 
            name.toLowerCase().includes(filters.customerName.toLowerCase())
          )
      ) {
        return false;
      }

      // 服務人員過濾
      if (filters.staffName) {
        const staffNameLower = filters.staffName.toLowerCase();
        const serviceStaffLower = (
          service.staff_name + 
          (service.partner_names && service.partner_names.length > 0 
            ? ' ' + service.partner_names.join(' ') 
            : ''
          )
        ).toLowerCase();
        
        if (!serviceStaffLower.includes(staffNameLower)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis()); // 預設按時間降序排序
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    );
  }

  const filteredServices = getFilteredServices();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">服務紀錄管理</h1>
        </div>
        {/* Tab 切換 */}
        <div className="mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            <button
              className={`px-3 py-2 font-medium text-sm rounded-md ${activeTab === 'services' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('services')}
            >
              所有服務紀錄
            </button>
            <button
              className={`px-3 py-2 font-medium text-sm rounded-md ${activeTab === 'reports' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('reports')}
            >
              回報事項
            </button>
          </nav>
        </div>
        {/* Tab 內容 */}
        {activeTab === 'services' && (
          <>
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                開始日期
              </label>
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.dateRange.start}
                onChange={(e) => handleFilterChange('dateRange', { start: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                結束日期
              </label>
              <input
                type="date"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.dateRange.end}
                onChange={(e) => handleFilterChange('dateRange', { end: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客戶名稱
              </label>
              <input
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.customerName}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                placeholder="搜尋客戶名稱"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服務人員
              </label>
              <input
                type="text"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                value={filters.staffName}
                onChange={(e) => handleFilterChange('staffName', e.target.value)}
                placeholder="搜尋服務人員"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={resetFilters}
              className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              重置
            </button>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th 
                  scope="col" 
                  className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 cursor-pointer"
                  onClick={() => handleSort('username')}
                >
                  建立者 {getSortIcon('username')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort('customer')}
                >
                  客戶名稱 {getSortIcon('customer')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                  onClick={() => handleSort('serviceDate')}
                >
                  服務日期 {getSortIcon('serviceDate')}
                </th>
                <th 
                  scope="col" 
                  className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                >
                  服務內容
                </th>
                <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                  <span className="sr-only">操作</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-gray-500">
                    目前沒有符合條件的服務紀錄
                  </td>
                </tr>
              ) : (
                filteredServices.map((service: Service) => (
                  <tr key={service.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {service.staff_name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {service.customer_names.join(', ')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {service.timestamp ? 
                        format(service.timestamp.toDate(), 'yyyy/MM/dd') :
                        '無日期資料'}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      <div className="space-y-2">
                        {service.service_feedback_employer && (
                          <div>
                            <span className="font-medium text-gray-700">雇主反映：</span>
                            <span className="text-gray-600">{service.service_feedback_employer}</span>
                          </div>
                        )}
                        {service.service_feedback_worker && (
                          <div>
                            <span className="font-medium text-gray-700">移工反映：</span>
                            <span className="text-gray-600">{service.service_feedback_worker}</span>
                          </div>
                        )}
                        {service.handling_process && (
                          <div>
                            <span className="font-medium text-gray-700">處理經過：</span>
                            <span className="text-gray-600">{service.handling_process}</span>
                          </div>
                        )}
                        {service.handling_result && (
                          <div>
                            <span className="font-medium text-gray-700">處理結果：</span>
                            <span className="text-gray-600">{service.handling_result}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        className="text-indigo-600 hover:text-indigo-900"
                        onClick={() => router.push(`/services/${service.id}`)}
                      >
                        查看詳情
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
          </>
        )}
        {activeTab === 'reports' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">所有回報事項</h2>
            {reports.length === 0 ? (
              <div className="text-gray-500 text-center py-8">目前沒有回報事項</div>
            ) : (
              <div className="space-y-4">
                {reports.map((report, idx) => (
                  <div key={report.service_id + '-' + idx} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{report.type}</span>
                        {report.is_urgent && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">緊急</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(report.created_at.toDate(), 'yyyy/MM/dd HH:mm')}
                      </span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{report.body}</div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">狀態：</span>
                      <span className={
                        report.status === '已完成' ? 'text-green-600' :
                        report.status === '處理中' ? 'text-yellow-600' :
                        'text-red-600'
                      }>
                        {report.status}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">來源服務：</span>
                      <Link href={`/services/${report.service_id}`} className="text-blue-600 hover:underline">查看服務紀錄</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 
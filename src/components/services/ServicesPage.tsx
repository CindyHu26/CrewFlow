'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Service } from '@/types/service';
import { format } from 'date-fns';
import Link from 'next/link';
import MyServicesList from '@/components/services/MyServicesList';
import AreaServicesList from '@/components/services/AreaServicesList';
import ExpensesList from '@/components/services/ExpensesList';
import ItemsList from '@/components/services/ItemsList';
import ReportsList from '@/components/services/ReportsList';
import { getCurrentUser } from '@/lib/auth';
import { serviceDB } from '@/lib/serviceDB';

type SortField = 'timestamp' | 'customer_names' | 'staff_name' | 'service_content';
type SortOrder = 'asc' | 'desc';

type SearchFilters = {
  dateRange: {
    start: string;
    end: string;
  };
  customerName: string;
  workerName: string;
  staffName: string;
  content: string;
};

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateRange: {
      start: format(new Date(), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    },
    customerName: '',
    workerName: '',
    staffName: '',
    content: '',
  });
  const [activeTab, setActiveTab] = useState('my');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  const tabs = [
    { id: 'my', name: '我的服務紀錄' },
    { id: 'area', name: '我區服務紀錄' },
    { id: 'expenses', name: '收支明細' },
    { id: 'items', name: '收付物件明細' },
    { id: 'reports', name: '回報事項' }
  ];

  useEffect(() => {
    const fetchUserAndServices = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const currentUser = getCurrentUser();
        setUser(currentUser);
        if (!currentUser) {
          setError('請先登入');
          setServices([]);
          return;
        }
        if (!currentUser.name) {
          setError('使用者資料不完整');
          setServices([]);
          return;
        }
        const userServices = await serviceDB.getUserServiceRecords(currentUser.name);
        setServices(userServices);
      } catch (err) {
        setError('載入服務紀錄失敗');
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserAndServices();
  }, []);

  useEffect(() => {
    console.log('Active tab changed:', activeTab);
  }, [activeTab]);

  const handleTabChange = (tabId: string) => {
    console.log('Changing tab to:', tabId);
    setActiveTab(tabId);
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortedServices = () => {
    if (!services || services.length === 0) return [];
    
    return [...services].sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'timestamp':
          comparison = a.timestamp.toMillis() - b.timestamp.toMillis();
          break;
        case 'customer_names':
          comparison = (a.customer_names[0] || '').localeCompare(b.customer_names[0] || '');
          break;
        case 'staff_name':
          comparison = a.staff_name.localeCompare(b.staff_name);
          break;
        case 'service_content':
          const aContent = getServiceContent(a);
          const bContent = getServiceContent(b);
          comparison = aContent.localeCompare(bContent);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  const getServiceContent = (service: Service) => {
    const parts = [];
    if (service.service_feedback_employer) parts.push(`雇主反映：${service.service_feedback_employer}`);
    if (service.service_feedback_worker) parts.push(`移工反映：${service.service_feedback_worker}`);
    if (service.handling_process) parts.push(`處理經過：${service.handling_process}`);
    if (service.handling_result) parts.push(`處理結果：${service.handling_result}`);
    return parts.join(' | ');
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
        start: format(new Date(), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      },
      customerName: '',
      workerName: '',
      staffName: '',
      content: '',
    });
  };

  const getFilteredServices = () => {
    if (!services || services.length === 0) return [];
    
    return services.filter(service => {
      const serviceDate = service.timestamp.toDate();
      const serviceDateStr = serviceDate.toISOString().slice(0, 10); // 只取 yyyy-MM-dd
      const startDateStr = filters.dateRange.start;
      const endDateStr = filters.dateRange.end;

      if (startDateStr && serviceDateStr < startDateStr) return false;
      if (endDateStr && serviceDateStr > endDateStr) return false;

      if (filters.customerName && 
          !service.customer_names.some(name => name.toLowerCase().includes(filters.customerName.toLowerCase()))) {
        return false;
      }

      if (filters.workerName && 
          !service.worker_name?.toLowerCase().includes(filters.workerName.toLowerCase())) {
        return false;
      }

      if (filters.staffName) {
        const staffNameLower = filters.staffName.toLowerCase();
        const serviceStaffLower = (service.staff_name + (service.partner_names && service.partner_names.length > 0 ? ' ' + service.partner_names.join(' ') : '')).toLowerCase();
        if (!serviceStaffLower.includes(staffNameLower)) {
          return false;
        }
      }

      if (filters.content) {
        const contentLower = filters.content.toLowerCase();
        const serviceContent = getServiceContent(service).toLowerCase();
        if (!serviceContent.includes(contentLower)) {
          return false;
        }
      }

      return true;
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">載入中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              返回登入頁面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">服務紀錄管理</h1>
          <Link
            href="/services/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            新增服務紀錄
          </Link>
        </div>

        {/* 頁籤 */}
        <div className="mb-6">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700'
                } px-3 py-2 font-medium text-sm rounded-md`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 內容區域 */}
        <div className="bg-white shadow rounded-lg">
          {activeTab === 'my' && (
            <>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">我的服務紀錄</h2>
                <MyServicesList services={getFilteredServices()} />
              </div>
            </>
          )}
          {activeTab === 'area' && (
            <>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">我區服務紀錄</h2>
                <AreaServicesList />
              </div>
            </>
          )}
          {activeTab === 'expenses' && (
            <>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">收支明細</h2>
                <ExpensesList />
              </div>
            </>
          )}
          {activeTab === 'items' && (
            <>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">收付物件明細</h2>
                <ItemsList />
              </div>
            </>
          )}
          {activeTab === 'reports' && (
            <>
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">回報事項</h2>
                <ReportsList />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
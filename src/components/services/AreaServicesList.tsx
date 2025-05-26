'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Service } from '@/types/service';
import { serviceDB } from '@/lib/serviceDB';
import { getCurrentUser } from '@/lib/auth';
import { ServiceFilters } from '@/types/filters';
import { customerDB } from '@/lib/customerDB';

export default function AreaServicesList() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ServiceFilters>({
    dateRange: {
      start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    },
    customerName: '',
    workerName: '',
    content: '',
  });

  useEffect(() => {
    const loadServices = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        // 先查自己負責的客戶
        const customers = await customerDB.getCustomersByStaff(user.employee_id);
        const customerNames = customers.map(c => c.name);
        // 查詢所有這些客戶的服務紀錄
        const servicesData = await serviceDB.getServicesByCustomerNames(customerNames);
        setServices(servicesData);
      } catch (error) {
        console.error('載入服務紀錄時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    };
    loadServices();
  }, [router]);

  const handleFilterChange = (field: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      dateRange: {
        start: format(subDays(new Date(), 6), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      },
      customerName: '',
      workerName: '',
      content: '',
    });
  };

  const getFilteredServices = () => {
    console.log('Filtering services:', services); // 追蹤原始資料
    
    return services.filter(service => {
      const serviceDate = service.timestamp.toDate();
      const startDate = new Date(filters.dateRange.start + 'T00:00:00');
      const endDate = new Date(filters.dateRange.end + 'T23:59:59.999');

      console.log('Filtering dates:', { // 追蹤日期過濾
        serviceDate,
        startDate,
        endDate,
        isInRange: serviceDate >= startDate && serviceDate <= endDate
      });

      const dateMatches = serviceDate >= startDate && serviceDate <= endDate;
      
      const customerMatches = !filters.customerName || 
        service.customer_names.some(name => 
          name.toLowerCase().includes(filters.customerName.toLowerCase())
        );

      const workerMatches = !filters.workerName || 
        service.worker_name.toLowerCase().includes(filters.workerName.toLowerCase());

      const contentMatches = !filters.content || 
        service.handling_process.toLowerCase().includes(filters.content.toLowerCase()) ||
        service.handling_result.toLowerCase().includes(filters.content.toLowerCase());

      const matches = dateMatches && customerMatches && workerMatches && contentMatches;
      
      console.log('Filter results:', { // 追蹤過濾結果
        dateMatches,
        customerMatches,
        workerMatches,
        contentMatches,
        finalResult: matches
      });

      return matches;
    });
  };

  if (loading) {
    return <div className="p-4">載入中...</div>;
  }

  const filteredServices = getFilteredServices();
  console.log('Final filtered services:', filteredServices); // 追蹤最終結果

  return (
    <div className="p-4">
      {/* 搜尋過濾器 */}
      <div className="mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          {showFilters ? '隱藏搜尋' : '顯示搜尋'}
        </button>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                日期範圍
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <span className="text-gray-500">至</span>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                客戶名稱
              </label>
              <input
                type="text"
                value={filters.customerName}
                onChange={(e) => handleFilterChange('customerName', e.target.value)}
                placeholder="搜尋客戶名稱"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工人姓名
              </label>
              <input
                type="text"
                value={filters.workerName}
                onChange={(e) => handleFilterChange('workerName', e.target.value)}
                placeholder="搜尋工人姓名"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                服務內容
              </label>
              <input
                type="text"
                value={filters.content}
                onChange={(e) => handleFilterChange('content', e.target.value)}
                placeholder="搜尋服務內容"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                重置搜尋
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 服務紀錄列表 */}
      {filteredServices.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">沒有找到相關的服務紀錄</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  服務時間
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  客戶名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工種
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  服務人員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  服務內容
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredServices.map((service) => (
                <tr
                  key={service.id}
                  onClick={() => router.push(`/services/${service.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(service.timestamp.toDate(), 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {service.customer_names.join('、')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {service.job_types.join('、')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {service.staff_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xl">
                    <div className="line-clamp-2">
                      {[
                        service.service_feedback_employer && `雇主反映：${service.service_feedback_employer}`,
                        service.service_feedback_worker && `移工反映：${service.service_feedback_worker}`,
                        service.handling_process && `處理經過：${service.handling_process}`,
                        service.handling_result && `處理結果：${service.handling_result}`,
                      ].filter(Boolean).join(' | ') || '-'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 
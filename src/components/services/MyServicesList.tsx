'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { Service } from '@/types/service';
import { ServiceFilters } from '@/types/filters';

interface MyServicesListProps {
  services: Service[];
}

export default function MyServicesList({ services }: MyServicesListProps) {
  const router = useRouter();
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
    console.log('MyServicesList received services:', services);
    if (services && services.length > 0) {
      console.log('First service record:', services[0]);
    }
  }, [services]);

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
    console.log('Filtering services:', services);
    
    if (!services || services.length === 0) {
      console.log('No services to filter');
      return [];
    }

    const filtered = services.filter(service => {
      try {
        console.log('Processing service:', service);
        
        if (!service.timestamp) {
          console.error('Service missing timestamp:', service);
          return false;
        }

        const serviceDate = service.timestamp.toDate();
        console.log('Service date:', serviceDate);
        
        const startDate = new Date(filters.dateRange.start + 'T00:00:00');
        const endDate = new Date(filters.dateRange.end + 'T23:59:59.999');
        console.log('Date range:', { startDate, endDate });

        const dateMatches = serviceDate >= startDate && serviceDate <= endDate;
        console.log('Date matches:', dateMatches);
        
        const customerMatches = !filters.customerName || 
          (service.customer_names && service.customer_names.some(name => 
            name.toLowerCase().includes(filters.customerName.toLowerCase())
          ));
        console.log('Customer matches:', customerMatches);

        const workerMatches = !filters.workerName || 
          (service.worker_name && service.worker_name.toLowerCase().includes(filters.workerName.toLowerCase()));
        console.log('Worker matches:', workerMatches);

        const contentMatches = !filters.content || 
          (service.handling_process && service.handling_process.toLowerCase().includes(filters.content.toLowerCase())) ||
          (service.handling_result && service.handling_result.toLowerCase().includes(filters.content.toLowerCase()));
        console.log('Content matches:', contentMatches);

        return dateMatches && customerMatches && workerMatches && contentMatches;
      } catch (error) {
        console.error('Error filtering service:', error, service);
        return false;
      }
    });

    console.log('Filtered services:', filtered);
    return filtered;
  };

  const filteredServices = getFilteredServices();

  if (!services || services.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">目前沒有服務紀錄</p>
      </div>
    );
  }

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
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                客戶名稱
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工人姓名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                服務內容
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredServices.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {format(service.timestamp.toDate(), 'yyyy-MM-dd')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.customer_names?.join(', ') || '無'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.worker_name || '無'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="max-w-xs truncate">
                    {service.handling_process || '無'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => router.push(`/services/${service.id}`)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    查看詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 
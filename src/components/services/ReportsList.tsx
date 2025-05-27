'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Service, Report } from '@/types/service';
import { serviceDB } from '@/lib/serviceDB';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type ReportWithService = Report & {
  service_id: string;
  service_timestamp: Date;
  customer_names: string[];
  staff_name: string;
};

export default function ReportsList() {
  const [reports, setReports] = useState<ReportWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadReports = async () => {
      const user = getCurrentUser();
      if (!user) return;

      try {
        console.log('Current user:', user);
        // 獲取當前用戶的所有服務紀錄
        const services = await serviceDB.getUserServiceRecords(user.name);
        console.log('Services data:', services);
        
        // 整理回報事項
        const allReports: ReportWithService[] = [];
        services.forEach(service => {
          if (service.reports) {
            service.reports.forEach(report => {
              const reportWithService: ReportWithService = {
                ...report,
                service_id: service.id,
                service_timestamp: service.timestamp.toDate(),
                customer_names: service.customer_names,
                staff_name: service.staff_name,
              };
              console.log('Processing report:', reportWithService);
              allReports.push(reportWithService);
            });
          }
        });

        // 依照時間排序，最新的在前面
        allReports.sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime());
        console.log('All processed reports:', allReports);
        setReports(allReports);
      } catch (error) {
        console.error('載入回報事項時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const getFilteredReports = () => {
    console.log('Filtering reports:', reports);
    
    return reports.filter(report => {
      const reportDate = report.service_timestamp;
      const startDate = new Date(dateRange.start + 'T00:00:00');
      const endDate = new Date(dateRange.end + 'T23:59:59.999');

      console.log('Filtering dates:', {
        reportDate,
        startDate,
        endDate,
        isInRange: reportDate >= startDate && reportDate <= endDate
      });

      const dateMatches = reportDate >= startDate && reportDate <= endDate;
      const typeMatches = !selectedType || report.type === selectedType;
      const statusMatches = !selectedStatus || report.status === selectedStatus;
      const searchMatches = !searchText || 
        report.customer_names.some(name => name.toLowerCase().includes(searchText.toLowerCase())) ||
        report.content.toLowerCase().includes(searchText.toLowerCase());

      console.log('Filter results:', {
        dateMatches,
        typeMatches,
        statusMatches,
        searchMatches,
        finalResult: dateMatches && typeMatches && statusMatches && searchMatches
      });

      return dateMatches && typeMatches && statusMatches && searchMatches;
    });
  };

  const uniqueTypes = Array.from(new Set(reports.map(report => report.type)));
  const statusOptions = ['待處理', '處理中', '已完成'];
  const filteredReports = getFilteredReports();

  if (loading) {
    return <div className="p-4">載入中...</div>;
  }

  return (
    <div className="p-4">
      {/* 篩選器 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日期範圍
            </label>
            <div className="flex space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
              <span className="text-gray-500">至</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              回報類型
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">全部類型</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              處理狀態
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">全部狀態</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              搜尋
            </label>
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜尋客戶名稱或回報內容"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({
                  start: format(new Date(), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd'),
                });
                setSelectedType('');
                setSelectedStatus('');
                setSearchText('');
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              重置篩選
            </button>
          </div>
        </div>
      </div>

      {/* 回報事項列表 */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">沒有找到相關的回報事項</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report, index) => (
            <div 
              key={`${report.service_id}-${index}`} 
              className="bg-white p-4 rounded-lg shadow hover:bg-gray-50 cursor-pointer"
              onClick={() => router.push(`/services/${report.service_id}`)}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="text-sm text-gray-500">
                    {format(report.service_timestamp, 'yyyy/MM/dd HH:mm')}
                  </div>
                  <div className="font-medium">
                    {report.customer_names.join('、')}
                  </div>
                  <div className="text-sm text-gray-500">
                    服務人員：{report.staff_name}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {report.type}
                  </span>
                  {report.is_urgent && (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      緊急
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    report.status === '已完成' ? 'bg-green-100 text-green-800' :
                    report.status === '處理中' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded mb-2">
                <div className="text-sm font-medium text-gray-700 mb-1">回報內容：</div>
                <div className="text-gray-600 whitespace-pre-wrap">{report.content}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Service, SubItem } from '@/types/service';
import { serviceDB } from '@/lib/serviceDB';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

type ItemWithService = SubItem & {
  service_id: string;
  service_timestamp: Date;
  customer_names: string[];
  staff_name: string;
};

export default function ItemsList() {
  const [items, setItems] = useState<ItemWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const router = useRouter();

  useEffect(() => {
    const loadItems = async () => {
      const user = getCurrentUser();
      if (!user) return;

      try {
        console.log('Current user:', user);
        // 獲取當前用戶的所有服務紀錄
        const services = await serviceDB.getUserServiceRecords(user.name);
        console.log('Services data:', services);
        
        // 整理收付物件明細
        const allItems: ItemWithService[] = [];
        services.forEach(service => {
          if (service.sub_items) {
            service.sub_items.forEach(item => {
              const itemWithService: ItemWithService = {
                ...item,
                service_id: service.id,
                service_timestamp: service.timestamp.toDate(),
                customer_names: service.customer_names,
                staff_name: service.staff_name,
              };
              console.log('Processing item:', itemWithService);
              allItems.push(itemWithService);
            });
          }
        });

        console.log('All processed items:', allItems);
        setItems(allItems);
      } catch (error) {
        console.error('載入收付物件明細時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  const getFilteredItems = () => {
    console.log('Filtering items:', items);
    
    return items.filter(item => {
      const itemDate = item.service_timestamp;
      const startDate = new Date(dateRange.start + 'T00:00:00');
      const endDate = new Date(dateRange.end + 'T23:59:59.999');

      console.log('Filtering dates:', {
        itemDate,
        startDate,
        endDate,
        isInRange: itemDate >= startDate && itemDate <= endDate
      });

      const dateMatches = itemDate >= startDate && itemDate <= endDate;
      const categoryMatches = !selectedCategory || item.category === selectedCategory;
      const searchMatches = !searchText || 
        item.customer_names.some(name => name.toLowerCase().includes(searchText.toLowerCase())) ||
        item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
        item.note.toLowerCase().includes(searchText.toLowerCase());

      console.log('Filter results:', {
        dateMatches,
        categoryMatches,
        searchMatches,
        finalResult: dateMatches && categoryMatches && searchMatches
      });

      return dateMatches && categoryMatches && searchMatches;
    });
  };

  const uniqueCategories = Array.from(new Set(items.map(item => item.category)));
  const filteredItems = getFilteredItems();

  if (loading) {
    return <div className="p-4">載入中...</div>;
  }

  return (
    <div className="p-4">
      {/* 篩選器 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              物件類別
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">全部類別</option>
              {uniqueCategories.map(category => (
                <option key={category} value={category}>{category}</option>
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
              placeholder="搜尋客戶名稱、物件名稱或備註"
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
                setSelectedCategory('');
                setSearchText('');
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              重置篩選
            </button>
          </div>
        </div>
      </div>

      {/* 收付物件列表 */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">沒有找到相關的收付物件紀錄</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
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
                  服務人員
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  物件類別
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  物件名稱
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  數量
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  備註
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item, index) => (
                <tr 
                  key={`${item.service_id}-${index}`}
                  onClick={() => router.push(`/services/${item.service_id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(item.service_timestamp, 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.customer_names.join('、')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.staff_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.category === '收取' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.item_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {item.note}
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
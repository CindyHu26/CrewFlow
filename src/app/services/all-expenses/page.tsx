'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Service, Expense } from '@/types/service';
import { serviceDB } from '@/lib/serviceDB';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { userDB } from '@/lib/employeeDB';

interface ExpenseWithService extends Expense {
  service_id: string;
  service_timestamp: Date;
  customer_names: string[];
  staff_name: string;
}

export default function AllExpensesList() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseWithService[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(new Date(), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStaff, setSelectedStaff] = useState<string>('');
  const [staffList, setStaffList] = useState<string[]>([]);
  const [isHR, setIsHR] = useState(false);

  useEffect(() => {
    const loadAllExpenses = async () => {
      const user = getCurrentUser();
      if (!user) return;
      // 取得用戶資料，判斷是否為人資
      const userData = await userDB.getUserById(user.id);
      if (!userData || !userData.departments.includes('人資')) {
        setIsHR(false);
        setLoading(false);
        return;
      }
      setIsHR(true);
      try {
        // 取得所有服務紀錄
        const allServices: Service[] = await serviceDB.getAllServiceRecords();
        // 取得所有服務人員名單
        const staffSet = new Set<string>();
        allServices.forEach(service => {
          if (service.staff_name) staffSet.add(service.staff_name);
        });
        setStaffList(Array.from(staffSet));
        // 整理所有收支明細
        const allExpenses: ExpenseWithService[] = [];
        allServices.forEach(service => {
          if (service.expenses) {
            service.expenses.forEach(expense => {
              allExpenses.push({
                ...expense,
                service_id: service.id,
                service_timestamp: service.timestamp.toDate(),
                customer_names: service.customer_names,
                staff_name: service.staff_name,
              });
            });
          }
        });
        setExpenses(allExpenses);
      } catch (error) {
        console.error('載入所有收支明細時發生錯誤:', error);
      } finally {
        setLoading(false);
      }
    };
    loadAllExpenses();
  }, []);

  if (loading) {
    return <div className="p-4">載入中...</div>;
  }
  if (!isHR) {
    return <div className="p-4 text-red-600">您沒有權限瀏覽此頁面</div>;
  }

  const getFilteredExpenses = () => {
    return expenses.filter(expense => {
      const expenseDate = expense.service_timestamp;
      const startDate = new Date(dateRange.start + 'T00:00:00');
      const endDate = new Date(dateRange.end + 'T23:59:59.999');
      const dateMatches = expenseDate >= startDate && expenseDate <= endDate;
      const categoryMatches = !selectedCategory || expense.category === selectedCategory;
      const staffMatches = !selectedStaff || expense.staff_name === selectedStaff;
      return dateMatches && categoryMatches && staffMatches;
    });
  };

  const calculateTotal = () => {
    const filteredExpenses = getFilteredExpenses();
    const income = filteredExpenses
      .filter(e => e.category === '收入')
      .reduce((sum, e) => sum + e.amount, 0);
    const expense = filteredExpenses
      .filter(e => e.category === '支出')
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      income,
      expense,
      balance: income - expense
    };
  };

  const uniqueCategories = Array.from(new Set(expenses.map(e => e.category)));
  const totals = calculateTotal();
  const filteredExpenses = getFilteredExpenses();

  return (
    <div className="p-4">
      {/* 篩選器 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              收支類別
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
              服務人員
            </label>
            <select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              <option value="">全部人員</option>
              {staffList.map(staff => (
                <option key={staff} value={staff}>{staff}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateRange({
                  start: format(new Date(), 'yyyy-MM-dd'),
                  end: format(new Date(), 'yyyy-MM-dd'),
                });
                setSelectedCategory('');
                setSelectedStaff('');
              }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              重置篩選
            </button>
          </div>
        </div>
      </div>

      {/* 統計摘要 */}
      <div className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-500">總收入</div>
            <div className="text-xl font-semibold text-green-600">${totals.income}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-500">總支出</div>
            <div className="text-xl font-semibold text-red-600">${totals.expense}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-gray-500">結餘</div>
            <div className={`text-xl font-semibold ${totals.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${totals.balance}
            </div>
          </div>
        </div>
      </div>

      {/* 收支明細列表 */}
      {filteredExpenses.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-500">沒有找到相關的收支明細</p>
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
                  類別
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  說明
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredExpenses.map((expense, index) => (
                <tr 
                  key={`${expense.service_id}-${index}`}
                  onClick={() => router.push(`/services/${expense.service_id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(expense.service_timestamp, 'yyyy/MM/dd HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.customer_names.join('、')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {expense.staff_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      expense.category === '收入' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {expense.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${expense.amount}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {expense.description}
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
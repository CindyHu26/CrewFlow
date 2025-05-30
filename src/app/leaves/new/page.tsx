'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, Timestamp, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';
import { User } from '@/types';
import { calculateWorkingHours } from '@/lib/leaveUtils';
import Select from 'react-select';
import Card from '@/components/Card';

interface LeaveFormData {
  userId: string;
  username: string;
  startDateTime: string;
  endDateTime: string;
  type: '特休' | '事假' | '病假' | '公假' | '其他';
  reason: string;
  totalHours: number;
  status: 'pending';
  deputies: string[];  // 修改為代理人陣列
  created_at: Timestamp;
}

export default function NewLeavePage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LeaveFormData>({
    userId: '',
    username: '',
    startDateTime: format(new Date().setHours(8, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    endDateTime: format(new Date().setHours(17, 0, 0, 0), "yyyy-MM-dd'T'HH:mm"),
    type: '特休',
    reason: '',
    totalHours: 8,
    status: 'pending',
    deputies: [],  // 初始化為空陣列
    created_at: Timestamp.now()
  });
  const [error, setError] = useState<string | null>(null);
  const [availableDeputies, setAvailableDeputies] = useState<User[]>([]);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);
  const [approvers, setApprovers] = useState<{
    supervisors: User[];
    managers: User[];
    directors: User[];
  }>({
    supervisors: [],
    managers: [],
    directors: []
  });

  // 將代理人按部門分組（移除部門限制）
  const deputiesByDepartment = availableDeputies.reduce((acc, deputy) => {
    deputy.departments.forEach(dept => {
        if (!acc[dept]) {
          acc[dept] = [];
        }
        if (!acc[dept].find(d => d.id === deputy.id)) {  // 避免重複
          acc[dept].push(deputy);
      }
    });
    return acc;
  }, {} as Record<string, User[]>);

  // 將部門分組，同部門優先
  const sortedDepartmentOptions = Object.entries(deputiesByDepartment)
    .sort(([deptA], [deptB]) => {
      // 如果部門在用戶的部門列表中，優先顯示
      const isDeptAInUserDepts = userDepartments.includes(deptA);
      const isDeptBInUserDepts = userDepartments.includes(deptB);
      
      if (isDeptAInUserDepts && !isDeptBInUserDepts) return -1;
      if (!isDeptAInUserDepts && isDeptBInUserDepts) return 1;
      return deptA.localeCompare(deptB); // 其他情況按字母順序排序
    })
    .map(([dept, deputies]) => ({
      label: dept,
      options: deputies.map(deputy => ({
        value: deputy.id,
        label: `${deputy.name} (${deputy.position})`
      }))
    }));

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const userRef = doc(db, 'users', user.id);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          setFormData(prev => ({
            ...prev,
            userId: user.id,
            username: userData.name
          }));
          setUserDepartments(userData.departments);

          // 查詢所有可用代理人（移除部門限制）
          const usersRef = collection(db, 'users');
          const querySnapshot = await getDocs(usersRef);
          const deputies = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as User))
            .filter(u => u.id !== user.id && u.id !== 'admin');  // 排除自己和 admin
          setAvailableDeputies(deputies);

          // 查詢同部門的主管
          const approversData = {
            supervisors: deputies.filter(u => 
              u.position_level === 2 && // 主任層級
              u.departments.some(dept => userData.departments.includes(dept))
            ),
            managers: deputies.filter(u => 
              u.position_level === 3 && // 經理層級
              u.departments.some(dept => userData.departments.includes(dept))
            ),
            directors: deputies.filter(u => 
              u.position_level === 4 && // 協理層級
              u.departments.some(dept => userData.departments.includes(dept))
            )
          };
          setApprovers(approversData);
        }
      } catch (err) {
        console.error('獲取用戶資料時發生錯誤:', err);
        setError('無法載入用戶資料');
      }
    };

    fetchUserData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (!formData.userId || !formData.username) {
        setError('請先登入');
        return;
      }

      if (formData.totalHours <= 0) {
        setError('請假時數必須大於 0');
        return;
      }

      if (!formData.reason.trim()) {
        setError('請填寫請假原因');
        return;
      }

      if (formData.deputies.length === 0) {
        setError('請選擇至少一位代理人');
        return;
      }

      const startDate = new Date(formData.startDateTime);
      const endDate = new Date(formData.endDateTime);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        setError('請選擇有效的日期時間');
        return;
      }

      if (startDate > endDate) {
        setError('開始時間不能晚於結束時間');
        return;
      }

      const leaveData = {
        type: formData.type,
        startDateTime: Timestamp.fromDate(startDate),
        endDateTime: Timestamp.fromDate(endDate),
        totalHours: formData.totalHours,
        totalDays: Math.round((formData.totalHours / 8) * 100) / 100,
        reason: formData.reason,
        userId: formData.userId,
        username: formData.username,
        deputies: formData.deputies,
        currentApprovers: formData.deputies, // 初始時所有代理人都是當前審核者
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        status: 'pending',
        approvalFlow: {
          deputies: formData.deputies.map(deputyId => ({
            id: deputyId,
            status: 'pending',
            updated_at: Timestamp.now()
          })),
          supervisors: approvers.supervisors.map(supervisor => ({
            id: supervisor.id,
            status: 'pending',
            updated_at: Timestamp.now()
          })),
          managers: approvers.managers.map(manager => ({
            id: manager.id,
            status: 'pending',
            updated_at: Timestamp.now()
          })),
          directors: approvers.directors.map(director => ({
            id: director.id,
            status: 'pending',
            updated_at: Timestamp.now()
          }))
        }
      };

      await addDoc(collection(db, 'leaves'), leaveData);
      router.push('/leaves');
    } catch (err) {
      console.error('送出請假申請時發生錯誤:', err);
      setError('送出請假申請失敗');
    }
  };

  // 當開始時間或結束時間改變時，自動計算時數
  const handleDateTimeChange = (field: 'startDateTime' | 'endDateTime', value: string) => {
    const newFormData = { ...formData, [field]: value };
    const startDate = new Date(newFormData.startDateTime);
    const endDate = new Date(newFormData.endDateTime);

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const hours = calculateWorkingHours(startDate, endDate);
      newFormData.totalHours = hours;
    }

    setFormData(newFormData);
  };

  return (
    <Card className="max-w-3xl mx-auto my-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">新增請假申請</h1>
      {error && (
          <div className="mb-4 p-4 bg-red-50 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}
        <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始日期時間
            </label>
            <input
              type="datetime-local"
              value={formData.startDateTime}
              onChange={(e) => handleDateTimeChange('startDateTime', e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              結束日期時間
            </label>
            <input
              type="datetime-local"
              value={formData.endDateTime}
              onChange={(e) => handleDateTimeChange('endDateTime', e.target.value)}
              min={formData.startDateTime}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請假類型
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as LeaveFormData['type'] })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="特休">特休</option>
              <option value="事假">事假</option>
              <option value="病假">病假</option>
              <option value="公假">公假</option>
              <option value="其他">其他</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請假時數
            </label>
            <input
              type="number"
              value={formData.totalHours}
                onChange={(e) => setFormData({ ...formData, totalHours: Number(e.target.value) })}
                min="0"
                step="0.5"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-sm text-gray-500">
                系統自動計算僅供參考，可自行調整實際請假時數
            </p>
          </div>

            {/* 代理人選擇區塊 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                代理人及職務相關人員選擇
                <span className="text-red-500 ml-1">*</span>
            </label>
              <p className="text-sm text-gray-500 mb-2">
                請選擇一位或多位代理人及職務相關人員。主管職位（主任、經理、協理）會自動加入簽核流程，無需選取為代理人及職務相關人員。
              </p>
              <Select
                isMulti
                options={sortedDepartmentOptions}
                value={formData.deputies.map(id => {
                  const deputy = availableDeputies.find(d => d.id === id);
                  return {
                    value: id,
                    label: deputy ? `${deputy.name} (${deputy.position})` : ''
                  };
                })}
                onChange={(selected) => {
                  setFormData({
                    ...formData,
                    deputies: selected ? selected.map(option => option.value) : []
                  });
                }}
                className="basic-multi-select"
                classNamePrefix="select"
                placeholder="請選擇代理人及職務相關人員..."
                noOptionsMessage={() => "沒有可選的代理人及職務相關人員"}
                isClearable
                isSearchable
              />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            請假原因
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            placeholder="請詳細說明請假原因..."
          />
        </div>

        {/* 顯示審核流程 */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">審核流程：</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>代理人及職務相關人員審核</li>
              {approvers.supervisors.length > 0 && (
                <li>主任層級審核 ({approvers.supervisors.map(s => s.name).join('、')})</li>
              )}
              {approvers.managers.length > 0 && (
                <li>經理層級審核 ({approvers.managers.map(m => m.name).join('、')})</li>
              )}
              {approvers.directors.length > 0 && (
                <li>協理層級審核 ({approvers.directors.map(d => d.name).join('、')})</li>
              )}
          </ol>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            取消
          </button>
          <button
            type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            送出申請
          </button>
        </div>
      </form>
    </Card>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { calculateAnnualLeave } from '@/lib/leaveUtils';
import { userDB } from '@/lib/employeeDB';
import Card from '@/components/Card';

interface Leave {
  id: string;
  type: '特休' | '事假' | '病假' | '其他';
  startDateTime: Date | Timestamp;
  endDateTime: Date | Timestamp;
  totalHours: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  userId: string;
  username: string;
  deputies: string[];
  currentApprover: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  approvalFlow: {
    deputies: Array<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    }>;
    supervisor?: {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    };
    manager?: {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    };
    director?: {
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    };
  };
}

// 新增一個工具函數：取得本年度起訖日
function getCurrentAnnualPeriod(startDate: Date): { periodStart: Date, periodEnd: Date } {
  const now = new Date();
  let periodStart = new Date(startDate);
  let periodEnd = new Date(startDate);
  while (periodEnd <= now) {
    periodStart = new Date(periodEnd);
    periodEnd = new Date(periodStart);
    periodEnd.setFullYear(periodStart.getFullYear() + 1);
  }
  // periodStart 是本年度起始，periodEnd 是下年度起始
  return { periodStart, periodEnd };
}

export default function LeavesPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [annualLeaveInfo, setAnnualLeaveInfo] = useState({
    total: 0,
    used: 0,
    remaining: 0
  });
  const [users, setUsers] = useState<Record<string, { name: string }>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        // 獲取用戶資料以計算特休資訊
        const userData = await userDB.getUserById(user.id);
        let totalAnnualLeave = 0;
        let usedAnnualLeaveDays: number;
        let leavesData: Leave[] = [];
        if (userData && userData.start_date) {
          console.log('當前用戶資料:', userData);
          console.log('用戶名稱:', userData.name);
          let startDate: Date;
          if (typeof userData.start_date.toDate === 'function') {
            startDate = userData.start_date.toDate();
          } else if (userData.start_date.seconds && userData.start_date.nanoseconds) {
            startDate = new Timestamp(
              userData.start_date.seconds,
              userData.start_date.nanoseconds
            ).toDate();
          } else {
            startDate = new Date(userData.start_date.toDate());
          }

          totalAnnualLeave = calculateAnnualLeave(startDate);
          // 取得本年度起訖日
          const { periodStart, periodEnd } = getCurrentAnnualPeriod(startDate);

          // 獲取請假記錄
          const leavesRef = collection(db, 'leaves');
          const q = query(
            leavesRef,
            where('username', '==', userData.name),
            orderBy('created_at', 'desc')
          );

          const querySnapshot = await getDocs(q);
          console.log('查詢條件:', {
            username: userData.name,
            collection: 'leaves'
          });
          console.log('查詢結果數量:', querySnapshot.size);
          leavesData = querySnapshot.docs
            .map(doc => {
            const data = doc.data();
              console.log('單筆請假資料:', data);
            return {
              id: doc.id,
              ...data,
              startDateTime: data.startDateTime instanceof Timestamp ? 
                data.startDateTime.toDate() : 
                new Date(data.startDateTime),
              endDateTime: data.endDateTime instanceof Timestamp ? 
                data.endDateTime.toDate() : 
                new Date(data.endDateTime)
              } as Leave;
            })
            .filter(leave => leave.username === userData.name);

          // 計算本年度已使用特休天數
          const totalAnnualLeaveHours = leavesData
            .filter((leave: Leave) => leave.type === '特休' && leave.status === 'approved')
            .filter((leave: Leave) => leave.startDateTime >= periodStart && leave.startDateTime < periodEnd)
            .reduce((total: number, leave: Leave) => total + leave.totalHours, 0);
          usedAnnualLeaveDays = Math.round((totalAnnualLeaveHours / 8) * 100) / 100;

          setAnnualLeaveInfo({
            total: totalAnnualLeave,
            used: usedAnnualLeaveDays,
            remaining: Math.round((totalAnnualLeave - usedAnnualLeaveDays) * 100) / 100
          });

          setLeaves(leavesData);
          setLoading(false);
          return;
        }

        // 計算特休已使用天數
        const totalAnnualLeaveHours = leavesData
          .filter(leave => leave.type === '特休' && leave.status === 'approved')
          .reduce((total, leave) => total + leave.totalHours, 0);
        
        usedAnnualLeaveDays = Math.round((totalAnnualLeaveHours / 8) * 100) / 100;

        // 設定特休資訊
        if (userData && userData.start_date) {
          let startDate: Date;
          if (typeof userData.start_date.toDate === 'function') {
            startDate = userData.start_date.toDate();
          } else if (userData.start_date.seconds && userData.start_date.nanoseconds) {
            startDate = new Timestamp(
              userData.start_date.seconds,
              userData.start_date.nanoseconds
            ).toDate();
          } else {
            startDate = new Date(userData.start_date.toDate());
          }

          const totalAnnualLeave = calculateAnnualLeave(startDate);
          
          setAnnualLeaveInfo({
            total: totalAnnualLeave,
            used: usedAnnualLeaveDays,
            remaining: Math.round((totalAnnualLeave - usedAnnualLeaveDays) * 100) / 100
          });
        }

        setLeaves(leavesData);
        setLoading(false);
      } catch (err) {
        console.error('獲取資料時發生錯誤:', err);
        setError('無法載入資料');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleDelete = async (leaveId: string) => {
    if (!window.confirm('確定要刪除此請假申請嗎？')) {
      return;
    }

    try {
      setDeletingId(leaveId);
      const leaveRef = doc(db, 'leaves', leaveId);
      await deleteDoc(leaveRef);
      
      // 更新本地狀態
      setLeaves(leaves.filter(leave => leave.id !== leaveId));
    } catch (error) {
      console.error('刪除請假申請時發生錯誤:', error);
      alert('刪除失敗');
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (leave: Leave) => {
    // 檢查是否有人已經審核通過
    const hasApproved = 
      (leave.approvalFlow?.deputies?.some(d => d.status === 'approved') ?? false) ||
      (leave.approvalFlow?.supervisor?.status === 'approved') ||
      (leave.approvalFlow?.manager?.status === 'approved') ||
      (leave.approvalFlow?.director?.status === 'approved');
    
    return leave.status === 'pending' && !hasApproved;
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p className="mt-2 text-sm text-gray-600">載入中...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-8">
        <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">請假紀錄</h1>
          <p className="mt-2 text-sm text-gray-600">
            查看您的所有請假申請記錄
          </p>
        </div>
          <div className="bg-blue-50 p-4 rounded-lg min-w-[300px]">
            <h2 className="text-lg font-semibold text-blue-700 mb-2">特休資訊</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-blue-600">特休天數</p>
                <p className="text-xl font-bold text-blue-800">{annualLeaveInfo.total} 天</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">已使用天數</p>
                <p className="text-xl font-bold text-blue-800">{annualLeaveInfo.used} 天</p>
              </div>
              <div>
                <p className="text-sm text-blue-600">剩餘天數</p>
                <p className="text-xl font-bold text-blue-800">{annualLeaveInfo.remaining} 天</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
        <button
          onClick={() => router.push('/leaves/new')}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          新增請假
        </button>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead>
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                請假類型
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                開始時間
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                結束時間
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                請假時數
              </th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                狀態
              </th>
              <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">操作</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {leaves.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-500">
                  目前沒有請假紀錄
                </td>
              </tr>
            ) : (
              leaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {leave.type}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {leave.startDateTime.toLocaleString('zh-TW')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {leave.endDateTime.toLocaleString('zh-TW')}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {leave.totalHours} 小時
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium
                      ${leave.status === 'approved' ? 'bg-green-50 text-green-700' : 
                        leave.status === 'pending' ? 'bg-yellow-50 text-yellow-700' : 
                        'bg-red-50 text-red-700'}`}>
                      {leave.status === 'approved' ? '已核准' :
                       leave.status === 'pending' ? '待審核' : '已拒絕'}
                    </span>
                  </td>
                  <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                    <div className="flex justify-end space-x-3">
                    <button
                        onClick={() => router.push(`/leaves/${leave.id}`)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      查看詳情
                    </button>
                      {canDelete(leave) && (
                        <button
                          onClick={() => handleDelete(leave.id)}
                          disabled={deletingId === leave.id}
                          className={`text-red-600 hover:text-red-900 ${
                            deletingId === leave.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          {deletingId === leave.id ? '刪除中...' : '刪除'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
} 
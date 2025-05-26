'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { useUsers } from '@/contexts/UserContext';
import { Leave } from '@/types';
import { Timestamp } from 'firebase/firestore';

export default function LeaveDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { getUserById, loading: usersLoading } = useUsers();
  const [leave, setLeave] = useState<Leave | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaveData = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const leaveRef = doc(db, 'leaves', params.id);
        const leaveDoc = await getDoc(leaveRef);

        if (!leaveDoc.exists()) {
          setError('找不到請假記錄');
          setLoading(false);
          return;
        }

        const leaveData = leaveDoc.data() as Leave;
        leaveData.id = leaveDoc.id;
        console.log('請假資料:', leaveData);
        console.log('username:', (leaveData as any).username);
        
        if (leaveData.startDateTime instanceof Date) {
          leaveData.startDateTime = Timestamp.fromDate(leaveData.startDateTime);
        }
        if (leaveData.endDateTime instanceof Date) {
          leaveData.endDateTime = Timestamp.fromDate(leaveData.endDateTime);
        }
        setLeave(leaveData);
        setLoading(false);
      } catch (err) {
        console.error('獲取請假資料時發生錯誤:', err);
        setError('無法載入請假資料');
        setLoading(false);
      }
    };

    fetchLeaveData();
  }, [params.id, router]);

  if (loading || usersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error || '找不到請假記錄'}</div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-50';
      case 'rejected':
        return 'text-red-600 bg-red-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved':
        return '已核准';
      case 'rejected':
        return '已拒絕';
      case 'pending':
        return '審核中';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">請假詳情</h1>
                <p className="mt-1 max-w-2xl text-lg text-gray-500">
                  請假申請的詳細資訊
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(leave.status)}`}>
                {getStatusText(leave.status)}
              </span>
            </div>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">申請人</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(leave as any).username}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">請假類型</dt>
                <dd className="mt-1 text-sm text-gray-900">{leave.type}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">開始時間</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(leave.startDateTime instanceof Timestamp ? 
                      leave.startDateTime.toDate() : 
                    new Date(leave.startDateTime)
                  ).toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">結束時間</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {(leave.endDateTime instanceof Timestamp ? 
                      leave.endDateTime.toDate() : 
                    new Date(leave.endDateTime)
                  ).toLocaleString('zh-TW', {
                    timeZone: 'Asia/Taipei',
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">請假時數</dt>
                <dd className="mt-1 text-sm text-gray-900">{leave.totalHours} 小時</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">請假天數</dt>
                <dd className="mt-1 text-sm text-gray-900">{Math.round((leave.totalHours / 8) * 100) / 100} 天</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">請假原因</dt>
                <dd className="mt-1 text-sm text-gray-900">{leave.reason}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">代理人及職務相關人員</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {leave.deputies?.map(deputyId => {
                    const deputy = getUserById(deputyId);
                    return deputy ? deputy.name : deputyId;
                  }).join('、') || '無'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">審核流程</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <ul className="space-y-2">
                    {leave.approvalFlow?.deputies?.map((deputy, index) => (
                      <li key={deputy.id} className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(deputy.status)}`}>
                          {getStatusText(deputy.status)}
                        </span>
                        <span>代理人及職務相關人員 {index + 1}</span>
                        <span>{getUserById(deputy.id)?.name || deputy.id}</span>
                      </li>
                    ))}
                    {(() => {
                      const approvedSupervisor = leave.approvalFlow?.supervisors?.find(s => s.status === 'approved');
                      const pendingSupervisors = leave.approvalFlow?.supervisors?.filter(s => s.status === 'pending') || [];
                      if (approvedSupervisor) {
                        return (
                          <li className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approvedSupervisor.status)}`}>
                              {getStatusText(approvedSupervisor.status)}
                            </span>
                            <span>主任</span>
                            <span>{getUserById(approvedSupervisor.id)?.name || approvedSupervisor.id}</span>
                          </li>
                        );
                      } else if (pendingSupervisors.length > 0) {
                        return pendingSupervisors.map((supervisor, index) => (
                          <li key={supervisor.id} className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(supervisor.status)}`}>
                              {getStatusText(supervisor.status)}
                            </span>
                            <span>主任 {index + 1}</span>
                            <span>{getUserById(supervisor.id)?.name || supervisor.id}</span>
                          </li>
                        ));
                      }
                      return null;
                    })()}
                    {(() => {
                      const approvedManager = leave.approvalFlow?.managers?.find(m => m.status === 'approved');
                      const pendingManagers = leave.approvalFlow?.managers?.filter(m => m.status === 'pending') || [];
                      if (approvedManager) {
                        return (
                          <li className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approvedManager.status)}`}>
                              {getStatusText(approvedManager.status)}
                            </span>
                            <span>經理</span>
                            <span>{getUserById(approvedManager.id)?.name || approvedManager.id}</span>
                          </li>
                        );
                      } else if (pendingManagers.length > 0) {
                        return pendingManagers.map((manager, index) => (
                          <li key={manager.id} className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(manager.status)}`}>
                              {getStatusText(manager.status)}
                            </span>
                            <span>經理 {index + 1}</span>
                            <span>{getUserById(manager.id)?.name || manager.id}</span>
                          </li>
                        ));
                      }
                      return null;
                    })()}
                    {(() => {
                      const approvedDirector = leave.approvalFlow?.directors?.find(d => d.status === 'approved');
                      const pendingDirectors = leave.approvalFlow?.directors?.filter(d => d.status === 'pending') || [];
                      if (approvedDirector) {
                        return (
                          <li className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(approvedDirector.status)}`}>
                              {getStatusText(approvedDirector.status)}
                            </span>
                            <span>協理</span>
                            <span>{getUserById(approvedDirector.id)?.name || approvedDirector.id}</span>
                          </li>
                        );
                      } else if (pendingDirectors.length > 0) {
                        return pendingDirectors.map((director, index) => (
                          <li key={director.id} className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(director.status)}`}>
                              {getStatusText(director.status)}
                            </span>
                            <span>協理 {index + 1}</span>
                            <span>{getUserById(director.id)?.name || director.id}</span>
                          </li>
                        ));
                      }
                      return null;
                    })()}
                  </ul>
                </dd>
              </div>
            </dl>
          </div>
          <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
            <button
              onClick={() => router.back()}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              返回
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
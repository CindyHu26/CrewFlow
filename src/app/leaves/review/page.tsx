'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getCurrentUser } from '@/lib/auth';
import { format } from 'date-fns';
import { User, Leave } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { calculateAnnualLeave } from '@/lib/leaveUtils';
import Card from '@/components/Card';

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

export default function LeaveReviewPage() {
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [userAnnualLeaveMap, setUserAnnualLeaveMap] = useState<Record<string, { total: number, used: number, remaining: number }>>({});

  useEffect(() => {
    const loadData = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      try {
        // 獲取當前用戶資料
        const currentUserRef = doc(db, 'users', currentUser.id);
        const currentUserDoc = await getDoc(currentUserRef);
        
        if (!currentUserDoc.exists()) {
          router.push('/login');
          return;
        }

        const currentUserData = currentUserDoc.data() as User;
        const userDepartments = currentUserData.departments;

        // 獲取需要當前用戶審核的請假申請
        const q = query(
          collection(db, 'leaves'),
          where('status', '==', 'pending')
        );
        
        const querySnapshot = await getDocs(q);
        const leavesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Leave));

        // 如果是主管，只顯示同部門的請假申請
        let filteredLeaves = leavesData;
        if (currentUserData.position_level > 1) {
          // 先獲取所有申請人的資料
          const applicantIds = new Set(leavesData.map(leave => leave.userId));
          const applicantPromises = Array.from(applicantIds).map(id =>
            getDoc(doc(db, 'users', id))
          );
          const applicantDocs = await Promise.all(applicantPromises);
          const applicantData = applicantDocs.reduce((acc, doc) => {
            if (doc.exists()) {
              acc[doc.id] = doc.data() as User;
            }
            return acc;
          }, {} as Record<string, User>);

          // 過濾同部門的申請
          filteredLeaves = leavesData.filter(leave => {
            const applicant = applicantData[leave.userId];
            if (!applicant) return false;

            // 檢查是否為當前用戶需要審核的申請
            const isCurrentUserApprover = leave.currentApprovers.includes(currentUser.id);
            // 檢查是否為同部門
            const isSameDepartment = applicant.departments.some(dept => userDepartments.includes(dept));
            return isCurrentUserApprover && isSameDepartment;
          });

          // 在記憶體中排序
          filteredLeaves.sort((a, b) => {
            const dateA = a.created_at instanceof Timestamp ? a.created_at.toDate() : new Date(a.created_at);
            const dateB = b.created_at instanceof Timestamp ? b.created_at.toDate() : new Date(b.created_at);
            return dateB.getTime() - dateA.getTime();
          });
        }

        // 載入相關用戶資料
        const userIds = new Set(filteredLeaves.flatMap(leave => [
          leave.userId,
          ...leave.deputies,
          ...(leave.approvalFlow.supervisors ? leave.approvalFlow.supervisors.map(s => s.id) : []),
          ...(leave.approvalFlow.managers ? leave.approvalFlow.managers.map(m => m.id) : []),
          ...(leave.approvalFlow.directors ? leave.approvalFlow.directors.map(d => d.id) : [])
        ].filter(Boolean)));

        const userPromises = Array.from(userIds).map(id =>
          getDoc(doc(db, 'users', id as string))
        );
        const userDocs = await Promise.all(userPromises);
        const userData = userDocs.reduce((acc, doc) => {
          if (doc.exists()) {
            const data = doc.data();
            acc[doc.id] = {
              id: doc.id,
              employee_id: data.employee_id,
              name: data.name,
              password: data.password,
              phone: data.phone,
              start_date: data.start_date,
              position: data.position,
              position_level: data.position_level,
              departments: data.departments,
              annualLeaveUsed: data.annualLeaveUsed
            } as User;
          }
          return acc;
        }, {} as Record<string, User>);

        // 載入所有用戶的特休資訊（修正剩餘特休計算）
        const userAnnualLeaveMap: Record<string, { total: number, used: number, remaining: number }> = {};
        for (const userId of Object.keys(userData)) {
          const user = userData[userId];
          let startDate: Date | null = null;
          if (user.start_date) {
            if (typeof user.start_date.toDate === 'function') {
              startDate = user.start_date.toDate();
            } else if (user.start_date.seconds && user.start_date.nanoseconds) {
              startDate = new Timestamp(user.start_date.seconds, user.start_date.nanoseconds).toDate();
            }
          }
          let totalAnnualLeave = 0;
          let usedAnnualLeaveDays = 0;
          if (startDate) {
            totalAnnualLeave = calculateAnnualLeave(startDate);
            // 取得本年度起訖日
            const { periodStart, periodEnd } = getCurrentAnnualPeriod(startDate);
            // 查詢該員工所有已核准的特休紀錄
            const leavesRef = collection(db, 'leaves');
            const q = query(
              leavesRef,
              where('userId', '==', userId),
              where('type', '==', '特休'),
              where('status', '==', 'approved')
            );
            const querySnapshot = await getDocs(q);
            const totalAnnualLeaveHours = querySnapshot.docs.reduce((total, doc) => {
              const data = doc.data();
              // 僅加總本年度範圍內的請假
              const leaveStart = data.startDateTime instanceof Timestamp ? data.startDateTime.toDate() : new Date(data.startDateTime);
              if (leaveStart >= periodStart && leaveStart < periodEnd) {
                return total + (data.totalHours || 0);
              }
              return total;
            }, 0);
            usedAnnualLeaveDays = Math.round((totalAnnualLeaveHours / 8) * 100) / 100;
          }
          userAnnualLeaveMap[userId] = {
            total: totalAnnualLeave,
            used: usedAnnualLeaveDays,
            remaining: Math.round((totalAnnualLeave - usedAnnualLeaveDays) * 100) / 100
          };
        }
        setUsers(userData);
        setLeaves(filteredLeaves);
        setUserAnnualLeaveMap(userAnnualLeaveMap);
        setLoading(false);
      } catch (error) {
        console.error('載入請假申請時發生錯誤:', error);
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  const handleApprove = async (leaveId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || processing) return;

    try {
      setProcessing(leaveId);
      const leaveRef = doc(db, 'leaves', leaveId);
      const leaveDoc = await getDoc(leaveRef);
      
      if (!leaveDoc.exists()) {
        throw new Error('請假申請不存在');
      }

      const leaveData = { id: leaveDoc.id, ...leaveDoc.data() } as Leave;
      
      // 更新當前審核人的狀態
      const now = Timestamp.now();

      // 找出當前使用者在審核流程中的所有角色
      const roles = [];
      const currentUserData = users[currentUser.id];
      
      if (!currentUserData) {
        throw new Error('找不到當前用戶資料');
      }

      // 根據 position_level 判斷角色
      if (currentUserData.position_level === 1) { // 一般員工
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 2) { // 主任
        roles.push('supervisor');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 3) { // 經理
        roles.push('manager');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 4) { // 協理
        roles.push('director');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      }

      // 檢查是否所有必要的審核都已完成
      const allRequiredApprovalsComplete = () => {
        // 檢查代理人是否全部審核完成
        const allDeputiesApproved = leaveData.approvalFlow.deputies.every(d => d.status === 'approved');
        
        // 如果代理人還沒全部通過，直接返回 false
        if (!allDeputiesApproved) {
          return false;
        }
        
        // 檢查其他層級是否已審核或不需要審核
        // 只要有一個主管通過即可
        const supervisorComplete = leaveData.approvalFlow.supervisors.length === 0 || 
          leaveData.approvalFlow.supervisors.some(s => s.status === 'approved');
        const managerComplete = leaveData.approvalFlow.managers.length === 0 || 
          leaveData.approvalFlow.managers.some(m => m.status === 'approved');
        const directorComplete = leaveData.approvalFlow.directors.length === 0 || 
          leaveData.approvalFlow.directors.some(d => d.status === 'approved');

        return supervisorComplete && managerComplete && directorComplete;
      };

      // 找出下一個需要審核的人
      const approvalOrder = ['deputy', 'supervisor', 'manager', 'director'];
      const pendingApprovers: string[] = [];
      
      // 從當前使用者最高的角色開始找下一個審核人
      const highestRole = roles[roles.length - 1];
      const currentIndex = approvalOrder.indexOf(highestRole);
      
      // 檢查代理人是否全部審核完成
      const allDeputiesApproved = leaveData.approvalFlow.deputies.every(d => d.status === 'approved');
      
      // 如果代理人還沒全部通過，只返回待審核的代理人
      if (!allDeputiesApproved) {
          const pendingDeputies = leaveData.approvalFlow.deputies
            .filter(d => d.status === 'pending')
            .map(d => d.id);
            pendingApprovers.push(...pendingDeputies);
      } else {
        // 代理人全部通過後，才開始檢查主管層級
        for (let i = currentIndex + 1; i < approvalOrder.length; i++) {
          const role = approvalOrder[i];
          if (role === 'supervisor') {
          // 如果主任層級尚未有人通過，則繼續尋找下一個主任
          const hasApprovedSupervisor = leaveData.approvalFlow.supervisors.some(s => s.status === 'approved');
          if (!hasApprovedSupervisor) {
            const pendingSupervisors = leaveData.approvalFlow.supervisors
              .filter(s => s.status === 'pending')
              .map(s => s.id);
            if (pendingSupervisors.length > 0) {
              pendingApprovers.push(...pendingSupervisors);
              break;
            }
          }
          // 如果已有主任通過，則繼續檢查下一層級
          continue;
        } else if (role === 'manager') {
          // 如果經理層級尚未有人通過，則繼續尋找下一個經理
          const hasApprovedManager = leaveData.approvalFlow.managers.some(m => m.status === 'approved');
          if (!hasApprovedManager) {
            const pendingManagers = leaveData.approvalFlow.managers
              .filter(m => m.status === 'pending')
              .map(m => m.id);
            if (pendingManagers.length > 0) {
              pendingApprovers.push(...pendingManagers);
              break;
            }
          }
          // 如果已有經理通過，則繼續檢查下一層級
          continue;
        } else if (role === 'director') {
          // 如果協理層級尚未有人通過，則繼續尋找下一個協理
          const hasApprovedDirector = leaveData.approvalFlow.directors.some(d => d.status === 'approved');
          if (!hasApprovedDirector) {
            const pendingDirectors = leaveData.approvalFlow.directors
              .filter(d => d.status === 'pending')
              .map(d => d.id);
            if (pendingDirectors.length > 0) {
              pendingApprovers.push(...pendingDirectors);
              break;
              }
            }
          }
        }
      }

      const updateData = {
        approvalFlow: leaveData.approvalFlow,
        currentApprovers: pendingApprovers,
        status: allRequiredApprovalsComplete() ? 'approved' : 'pending',
        updated_at: now
      };

      await updateDoc(leaveRef, updateData);

      // 只有在所有審核都通過時才更新特休天數
      if (allRequiredApprovalsComplete() && leaveData.type === '特休') {
        // 計算請假天數
        const startDate = leaveData.startDateTime instanceof Timestamp ? 
          leaveData.startDateTime.toDate() : 
          new Date(leaveData.startDateTime);
        const endDate = leaveData.endDateTime instanceof Timestamp ? 
          leaveData.endDateTime.toDate() : 
          new Date(leaveData.endDateTime);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // 更新用戶的已用特休天數
        const userRef = doc(db, 'users', leaveData.userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data() as User;
          await updateDoc(userRef, {
            annualLeaveUsed: (userData.annualLeaveUsed || 0) + totalDays
          });
        }
      }

      // 更新本地狀態
      setLeaves(leaves.filter(leave => leave.id !== leaveId));
    } catch (error) {
      console.error('審核請假申請時發生錯誤:', error);
      alert('審核失敗');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    const currentUser = getCurrentUser();
    if (!currentUser || processing) return;

    try {
      setProcessing(leaveId);
      const leaveRef = doc(db, 'leaves', leaveId);
      const leaveDoc = await getDoc(leaveRef);
      
      if (!leaveDoc.exists()) {
        throw new Error('請假申請不存在');
      }

      const leaveData = { id: leaveDoc.id, ...leaveDoc.data() } as Leave;
      const now = Timestamp.now();

      // 找出當前使用者在審核流程中的所有角色
      const roles = [];
      const currentUserData = users[currentUser.id];
      
      if (!currentUserData) {
        throw new Error('找不到當前用戶資料');
      }

      // 根據 position_level 判斷角色
      if (currentUserData.position_level === 1) { // 一般員工
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 2) { // 主任
        roles.push('supervisor');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 3) { // 經理
        roles.push('manager');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      } else if (currentUserData.position_level === 4) { // 協理
        roles.push('director');
        // 如果同時是代理人，也加入代理人角色
        if (leaveData.deputies.includes(currentUser.id)) {
          roles.push('deputy');
        }
      }

      // 更新所有相關角色的狀態為拒絕
      roles.forEach(role => {
        if (role === 'deputy') {
          const deputyIndex = leaveData.deputies.indexOf(currentUser.id);
          if (deputyIndex !== -1) {
            leaveData.approvalFlow.deputies[deputyIndex].status = 'rejected';
            leaveData.approvalFlow.deputies[deputyIndex].updated_at = now;
          }
        } else if (role === 'supervisor') {
          const supervisorIndex = leaveData.approvalFlow.supervisors.findIndex(s => s.id === currentUser.id);
          if (supervisorIndex !== -1) {
            leaveData.approvalFlow.supervisors[supervisorIndex].status = 'rejected';
            leaveData.approvalFlow.supervisors[supervisorIndex].updated_at = now;
          }
        } else if (role === 'manager') {
          const managerIndex = leaveData.approvalFlow.managers.findIndex(m => m.id === currentUser.id);
          if (managerIndex !== -1) {
            leaveData.approvalFlow.managers[managerIndex].status = 'rejected';
            leaveData.approvalFlow.managers[managerIndex].updated_at = now;
          }
        } else if (role === 'director') {
          const directorIndex = leaveData.approvalFlow.directors.findIndex(d => d.id === currentUser.id);
          if (directorIndex !== -1) {
            leaveData.approvalFlow.directors[directorIndex].status = 'rejected';
            leaveData.approvalFlow.directors[directorIndex].updated_at = now;
          }
        }
      });
      
      await updateDoc(leaveRef, {
        approvalFlow: leaveData.approvalFlow,
        status: 'rejected',
        updated_at: now
      });

      // 更新本地狀態
      setLeaves(leaves.filter(leave => leave.id !== leaveId));
    } catch (error) {
      console.error('拒絕請假申請時發生錯誤:', error);
      alert('操作失敗');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </Card>
    );
  }

  if (!leaves.length) {
    return (
      <Card className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">目前沒有待審核的請假申請</div>
      </Card>
    );
  }

  return (
    <Card className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-8">請假審核</h1>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {leaves.map((leave) => (
              <li key={leave.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <p className="text-sm font-medium text-indigo-600">
                        {users[leave.userId]?.name} ({users[leave.userId]?.employee_id})
                      </p>
                      <p className="mt-1 sm:mt-0 sm:ml-6 text-sm text-gray-500">
                        {leave.type === '特休' ? '特休' : 
                         leave.type === '病假' ? '病假' : 
                         leave.type === '事假' ? '事假' : 
                         leave.type === '其他' ? '其他' : ''}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        待審核
                      </span>
                    </div>
                  </div>
                  
                    <div className="sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="text-sm text-gray-500">
                        {format(leave.startDateTime instanceof Timestamp ? 
                          leave.startDateTime.toDate() : 
                          new Date(leave.startDateTime), 'yyyy/MM/dd HH:mm')} - 
                        {format(leave.endDateTime instanceof Timestamp ? 
                          leave.endDateTime.toDate() : 
                          new Date(leave.endDateTime), 'yyyy/MM/dd HH:mm')}
                        <span className="ml-2">({leave.totalHours} 小時)</span>
                      </p>
                    </div>
                    {leave.type === '特休' && users[leave.userId]?.start_date && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          剩餘特休：
                          {userAnnualLeaveMap[leave.userId]?.remaining ?? 0} 天
                        </p>
                      </div>
                    )}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        請假原因：{leave.reason}
                      </p>
                    </div>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      審核進度：
                    </p>
                    <ul className="mt-1 space-y-1 text-sm text-gray-500">
                      {leave.approvalFlow.deputies.map((deputy, index) => (
                        <li key={index}>
                          代理人及職務相關人員：{users[deputy.id]?.name} - 
                          {deputy.status === 'pending' ? '待審核' :
                           deputy.status === 'approved' ? '已同意' : '已拒絕'}
                        </li>
                      ))}
                      {(() => {
                        const approvedSupervisor = leave.approvalFlow.supervisors.find(s => s.status === 'approved');
                        const pendingSupervisors = leave.approvalFlow.supervisors.filter(s => s.status === 'pending');
                        if (approvedSupervisor) {
                          return (
                            <li>
                              主任：{users[approvedSupervisor.id]?.name} - 已同意
                            </li>
                          );
                        } else if (pendingSupervisors.length > 0) {
                          return pendingSupervisors.map((supervisor, index) => (
                            <li key={index}>
                              主任：{users[supervisor.id]?.name} - 待審核
                            </li>
                          ));
                        }
                        return null;
                      })()}
                      {(() => {
                        const approvedManager = leave.approvalFlow.managers.find(m => m.status === 'approved');
                        const pendingManagers = leave.approvalFlow.managers.filter(m => m.status === 'pending');
                        if (approvedManager) {
                          return (
                            <li>
                              經理：{users[approvedManager.id]?.name} - 已同意
                            </li>
                          );
                        } else if (pendingManagers.length > 0) {
                          return pendingManagers.map((manager, index) => (
                            <li key={index}>
                              經理：{users[manager.id]?.name} - 待審核
                        </li>
                          ));
                        }
                        return null;
                      })()}
                      {(() => {
                        const approvedDirector = leave.approvalFlow.directors.find(d => d.status === 'approved');
                        const pendingDirectors = leave.approvalFlow.directors.filter(d => d.status === 'pending');
                        if (approvedDirector) {
                          return (
                            <li>
                              協理：{users[approvedDirector.id]?.name} - 已同意
                            </li>
                          );
                        } else if (pendingDirectors.length > 0) {
                          return pendingDirectors.map((director, index) => (
                            <li key={index}>
                              協理：{users[director.id]?.name} - 待審核
                        </li>
                          ));
                        }
                        return null;
                      })()}
                    </ul>
                  </div>
                  {(() => {
                    const user = getCurrentUser();
                    return user && Array.isArray(leave.currentApprovers) && typeof user.id === 'string' && leave.currentApprovers.includes(user.id) && (
                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      onClick={() => handleReject(leave.id)}
                      disabled={processing === leave.id}
                      className={`px-4 py-2 rounded-md text-white ${
                        processing === leave.id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {processing === leave.id ? '處理中...' : '拒絕'}
                    </button>
                    <button
                      onClick={() => handleApprove(leave.id)}
                      disabled={processing === leave.id}
                      className={`px-4 py-2 rounded-md text-white ${
                        processing === leave.id
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {processing === leave.id ? '處理中...' : '同意'}
                    </button>
                  </div>
                    );
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </div>
    </Card>
  );
} 
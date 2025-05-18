import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type LeaveRequest = {
  id: string;
  employee_id: string;
  type: string;
  start_time: string;
  end_time: string;
  reason: string;
};

type Approval = {
  id: string;
  request_id: string;
  approver_id: string;
  status: string;
  comment: string | null;
  reviewed_at: string | null;
  leave_requests: LeaveRequest;
};

type Props = {
  userId: string;
};

export default function MyApprovalList({ userId }: Props) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

    async function fetchData() {
    const { data, error } = await supabase
        .from('leave_approvers')
        .select('*, leave_requests(*)')
        .eq('approver_id', userId)
        .eq('status', 'pending');

    if (error) {
        console.error('讀取審核資料失敗:', error.message);
        alert(`❌ 錯誤：無法載入待審資料\n${error.message}`);
        return;
    }

    if (data) setApprovals(data);
    setLoading(false);
    }

    async function handleApprove(a: Approval, decision: 'approved' | 'rejected') {
    // 1️⃣ 更新 leave_approvers
    const { error: updateError } = await supabase
        .from('leave_approvers')
        .update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        })
        .eq('id', a.id);

    if (updateError) {
        console.error('更新審核狀態失敗:', updateError.message);
        alert(`❌ 錯誤：更新失敗\n${updateError.message}`);
        return;
    }

    // 2️⃣ 查詢是否還有 pending
    const { data: remaining, error: remainingError } = await supabase
        .from('leave_approvers')
        .select('*')
        .eq('request_id', a.request_id)
        .eq('status', 'pending');

    if (remainingError) {
        console.error('查詢剩餘審核失敗:', remainingError.message);
        alert(`⚠️ 查詢失敗\n${remainingError.message}`);
        return;
    }

    // 3️⃣ 若審核完畢或被駁回，更新主表
    if (remaining?.length === 0 && decision === 'approved') {
        const { error: updateMainError } = await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', a.request_id);

        if (updateMainError) {
        console.error('更新請假單狀態失敗:', updateMainError.message);
        alert(`⚠️ 無法更新主表狀態：\n${updateMainError.message}`);
        }
    }

    if (decision === 'rejected') {
        const { error: rejectMainError } = await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', a.request_id);

        if (rejectMainError) {
        console.error('駁回主表更新失敗:', rejectMainError.message);
        alert(`⚠️ 無法駁回主表狀態：\n${rejectMainError.message}`);
        }
    }

    await fetchData(); // 重新載入列表
    }

  if (loading) return <p>載入中...</p>;
  if (approvals.length === 0) return <p>🎉 沒有待審核的請假單</p>;

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📩 我的待審請假單</h2>
      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>請假人</th>
            <th>假別</th>
            <th>起訖時間</th>
            <th>原因</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((a) => (
            <tr key={a.id}>
              <td>{a.leave_requests.employee_id}</td>
              <td>{a.leave_requests.type}</td>
              <td>
                {new Date(a.leave_requests.start_time).toLocaleString()}<br />
                ～ {new Date(a.leave_requests.end_time).toLocaleString()}
              </td>
              <td>{a.leave_requests.reason}</td>
              <td>
                <button onClick={() => handleApprove(a, 'approved')}>✅ 通過</button>
                <button onClick={() => handleApprove(a, 'rejected')}>❌ 駁回</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

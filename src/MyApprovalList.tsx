import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type LeaveRequest = {
  id: string;
  employee_id: string;
  type: string;
  start_time: string;
  end_time: string;
  reason: string;
  users?: {
    username: string;
  };
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
      .select(`
        *,
        leave_requests:leave_approvers_request_id_fkey (
          id,
          employee_id,
          type,
          start_time,
          end_time,
          reason,
          users!employee_id (
            username
          )
        )
      `)
      .eq('approver_id', userId)
      .eq('status', 'pending');

    if (error) {
      console.error('載入錯誤:', error.message);
      alert(`❌ 錯誤：無法載入待審資料\n${error.message}`);
    } else {
      setApprovals(data);
    }
    setLoading(false);
  }

  async function handleApprove(a: Approval, decision: 'approved' | 'rejected') {
    // 1. 更新此筆 leave_approvers
    const { error: updateError } = await supabase
      .from('leave_approvers')
      .update({
        status: decision,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', a.id);

    if (updateError) {
      alert(`❌ 更新失敗：${updateError.message}`);
      console.error(updateError);
      return;
    }

    // 2. 查此請假單是否還有其他未審核
    const { data: remaining, error: remainingError } = await supabase
      .from('leave_approvers')
      .select('*')
      .eq('request_id', a.request_id)
      .eq('status', 'pending');

    if (remainingError) {
      alert(`❌ 查詢失敗：${remainingError.message}`);
      console.error(remainingError);
      return;
    }

    // 3. 更新主表 leave_requests.status
    if (decision === 'rejected') {
      await supabase
        .from('leave_requests')
        .update({ status: 'rejected' })
        .eq('id', a.request_id);
    } else if (remaining?.length === 0 && decision === 'approved') {
      await supabase
        .from('leave_requests')
        .update({ status: 'approved' })
        .eq('id', a.request_id);
    }

    // 4. 重新載入畫面
    fetchData();
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
              <td>{a.leave_requests.users?.username || a.leave_requests.employee_id}</td>
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

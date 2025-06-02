import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type Props = {
  employeeId: string;
};

type LeaveRecord = {
  id: string;
  type: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  reason: string;
  status: string;
};

export default function LeaveHistory({ employeeId }: Props) {
  const [records, setRecords] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeave = async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_time', { ascending: false });

      if (data) {
        setRecords(data);
      }
      setLoading(false);
    };

    fetchLeave();
  }, [employeeId]);

  if (loading) return <p>載入中...</p>;
  if (records.length === 0) return <p>尚無請假紀錄。</p>;

  return (
    <div>
      <h2>📋 我的請假紀錄</h2>
      <table border={1} cellPadding={8}>
        <thead>
          <tr>
            <th>假別</th>
            <th>開始</th>
            <th>結束</th>
            <th>時數</th>
            <th>原因</th>
            <th>狀態</th>
          </tr>
        </thead>
        <tbody>
          {records.map(r => (
            <tr key={r.id}>
              <td>{r.type}</td>
              <td>{new Date(r.start_time).toLocaleString()}</td>
              <td>{new Date(r.end_time).toLocaleString()}</td>
              <td>{r.duration_hours}</td>
              <td>{r.reason}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

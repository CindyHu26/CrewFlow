import { useState } from 'react';
import { supabase } from './supabase';

type Props = {
  employeeId: string;
};

const leaveTypes = [
  '特休', '事假', '病假', '公假', '喪假',
  '婚假', '陪產假', '公傷假', '生理假'
];

export default function LeaveForm({ employeeId }: Props) {
  const [type, setType] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [durationHour, setDurationHour] = useState(0);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');

  const updateDuration = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const h = (e.getTime() - s.getTime()) / 1000 / 60 / 60;
    const rounded = Math.max(0, Math.round(h * 10) / 10);
    setDurationHour(rounded);
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!type || !startTime || !endTime || !reason) {
      setMessage('❌ 請完整填寫所有欄位');
      return;
    }

    if (durationHour <= 0) {
      setMessage('❌ 請假時數必須大於 0');
      return;
    }

    // Step 1: 新增請假主單
    const { data: inserted, error } = await supabase
      .from('leave_requests')
      .insert([{
        employee_id: employeeId,
        type,
        start_time: startTime,
        end_time: endTime,
        duration_hours: durationHour,
        reason,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      setMessage('❌ 送出失敗，請稍後再試');
      return;
    }

    // Step 2: 查 HR 設定的審核人
    const { data: approvers, error: approverError } = await supabase
      .from('leave_approver_map')
      .select('approver_id')
      .eq('employee_id', employeeId);

    if (approverError) {
      console.error('查詢審核人錯誤:', approverError.message);
      setMessage('❌ 查詢審核人失敗');
      return;
    }

    // Step 3: 插入 leave_approvers 表
    const inserts = approvers.map(row => ({
      request_id: inserted.id,
      approver_id: row.approver_id,
      status: 'pending',
      comment: null,
      reviewed_at: null,
    }));

    const { error: insertApproversError } = await supabase
      .from('leave_approvers')
      .insert(inserts);

    if (insertApproversError) {
      console.error('寫入審核表失敗:', insertApproversError.message);
      setMessage('❌ 寫入審核資料失敗');
      return;
    }

    // 成功後清空表單
    setMessage('✅ 已成功送出請假單');
    setType('');
    setStartTime('');
    setEndTime('');
    setDurationHour(0);
    setReason('');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>請假申請表單</h2>

      <label>假別：</label><br />
      <select value={type} onChange={e => setType(e.target.value)}>
        <option value="">請選擇</option>
        {leaveTypes.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select><br /><br />

      <label>開始時間：</label><br />
      <input
        type="datetime-local"
        value={startTime}
        onChange={e => {
          setStartTime(e.target.value);
          updateDuration(e.target.value, endTime);
        }}
      /><br /><br />

      <label>結束時間：</label><br />
      <input
        type="datetime-local"
        value={endTime}
        onChange={e => {
          setEndTime(e.target.value);
          updateDuration(startTime, e.target.value);
        }}
      /><br /><br />

      <label>請假時數（小時）：</label><br />
      <input
        type="number"
        step="0.1"
        min="0"
        value={durationHour}
        onChange={e => setDurationHour(parseFloat(e.target.value))}
      /><br /><br />

      <label>請假原因：</label><br />
      <textarea
        value={reason}
        onChange={e => setReason(e.target.value)}
        rows={3}
        style={{ width: '300px' }}
      /><br /><br />

      <button onClick={handleSubmit}>送出請假單</button>
      {message && (
        <p style={{ color: message.startsWith('✅') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </div>
  );
}

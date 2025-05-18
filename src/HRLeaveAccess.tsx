import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type User = {
  id: string;
  username: string;
};

type ApproverMap = {
  id: string;
  employee_id: string;
  approver_id: string;
};

export default function HRLeaveAccess() {
  const [users, setUsers] = useState<User[]>([]);
  const [approverMap, setApproverMap] = useState<ApproverMap[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data: users } = await supabase.from('users').select('*');
    const { data: map } = await supabase.from('leave_approver_map').select('*');
    if (users && map) {
      setUsers(users);
      setApproverMap(map);
    }
  }

  function getApproversForEmployee(employeeId: string) {
    const approvers = approverMap
      .filter((m) => m.employee_id === employeeId)
      .map((m) => users.find((u) => u.id === m.approver_id)?.username || '(已刪除)');
    return approvers.join(', ');
  }

  function openEditor(userId: string) {
    const current = approverMap
      .filter((m) => m.employee_id === userId)
      .map((m) => m.approver_id);
    setSelectedApprovers(current);
    setEditingId(userId);
  }

  async function saveChanges() {
    if (!editingId) return;

    // 刪除舊的
    await supabase.from('leave_approver_map').delete().eq('employee_id', editingId);

    // 插入新的
    const inserts = selectedApprovers.map((aid) => ({
      employee_id: editingId,
      approver_id: aid,
    }));

    if (inserts.length > 0) {
      await supabase.from('leave_approver_map').insert(inserts);
    }

    setMessage('✅ 已更新成功');
    setEditingId(null);
    await fetchData();
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>🔐 請假審核人設定（HR）</h2>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      <table border={1} cellPadding={10} style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>員工姓名</th>
            <th>審核人員</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>{getApproversForEmployee(user.id)}</td>
              <td>
                <button onClick={() => openEditor(user.id)}>修改</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc' }}>
          <h3>修改審核人員</h3>
          <p>員工：{users.find((u) => u.id === editingId)?.username}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {users
              .filter((u) => u.id !== editingId)
              .map((u) => (
                <label key={u.id}>
                  <input
                    type="checkbox"
                    value={u.id}
                    checked={selectedApprovers.includes(u.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedApprovers([...selectedApprovers, u.id]);
                      } else {
                        setSelectedApprovers(selectedApprovers.filter((id) => id !== u.id));
                      }
                    }}
                  />
                  {u.username}
                </label>
              ))}
          </div>
          <br />
          <button onClick={saveChanges} style={{ marginTop: '1rem' }}>
            💾 儲存
          </button>
        </div>
      )}
    </div>
  );
}

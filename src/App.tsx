import { useState } from 'react';
import Login from './Login';
import Register from './Register';
import LeaveForm from './LeaveForm';
import LeaveHistory from './LeaveHistory';
import HRLeaveAccess from './HRLeaveAccess';
import MyApprovalList from './MyApprovalList';

function App() {
  const [user, setUser] = useState<any>(null);
  const [showRegister, setShowRegister] = useState(false);

  const [activeMain, setActiveMain] = useState<string | null>(null); // 主選單目前點了誰
  const [activeSub, setActiveSub] = useState<'form' | 'history' | 'hr' | 'approvals' | null>(null);

  if (!user) {
    console.log("還沒登入");
    return showRegister ? (
      <>
        <Register onRegisterSuccess={() => setShowRegister(false)} />
        <p>已有帳號？ <button onClick={() => setShowRegister(false)}>前往登入</button></p>
      </>
    ) : (
      <>
        <Login onLogin={setUser} />
        <p>還沒有帳號？ <button onClick={() => setShowRegister(true)}>註冊新帳號</button></p>
      </>
    );
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🎉 歡迎，{user.username}！</h1>

      {/* ▶ 主功能列表 */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => {
          // 切換考勤管理主選單
          if (activeMain === 'attendance') {
            setActiveMain(null);
            setActiveSub(null);
          } else {
            setActiveMain('attendance');
            setActiveSub('form'); // 預設展開第一個功能
          }
        }}>
          {activeMain === 'attendance' ? '▼' : '▶'} 📆 考勤管理
        </button>
      </div>

      {/* ▶ 子功能列表 */}
      {activeMain === 'attendance' && (
        <div style={{ paddingLeft: '2rem', marginBottom: '1rem' }}>
          <button onClick={() => setActiveSub('form')} style={{ marginRight: '1rem' }}>
            ✍️ 填寫請假單
          </button>
          <button onClick={() => setActiveSub('history')} style={{ marginRight: '1rem' }}>
            📋 我的請假記錄
          </button>
          <button onClick={() => setActiveSub('hr')}>
            🔐 審核設定（HR）
          </button>
          <button onClick={() => setActiveSub('approvals')}>
            📩 我的待審請假單
          </button>
        </div>
      )}

      {activeMain === 'attendance' && activeSub === 'form' && (
        <LeaveForm employeeId={user.id} />
      )}
      {activeMain === 'attendance' && activeSub === 'history' && (
        <LeaveHistory employeeId={user.id} />
      )}
      {activeMain === 'attendance' && activeSub === 'hr' && (
        <HRLeaveAccess />
      )}
      {activeMain === 'attendance' && activeSub === 'approvals' && (
        <MyApprovalList userId={user.id} />
      )}


    </div>
  );
}

export default App;

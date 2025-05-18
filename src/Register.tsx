import { useState } from 'react';
import { supabase } from './supabase';

type Props = {
  onRegisterSuccess: () => void;
};

export default function Register({ onRegisterSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async () => {
    // 檢查是否帳號已存在
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (existingUser) {
      setError('該帳號已存在');
      return;
    }

    // 新增帳號
    const { error } = await supabase.from('users').insert([
      {
        username,
        password,
      },
    ]);

    if (error) {
      setError('註冊失敗');
    } else {
      alert('註冊成功，請登入');
      onRegisterSuccess();
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h2>註冊新帳號</h2>
      <input
        placeholder="帳號"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      /><br /><br />
      <input
        placeholder="密碼"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />
      <button onClick={handleRegister}>註冊</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

import { useState } from 'react';
import { supabase } from './supabase';

type Props = {
  onLogin: (user: any) => void;
};

export default function Login({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    const { data, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  
    if (fetchError) {
      console.error('登入錯誤:', fetchError.message);
      setError('登入失敗');
      return;
    }
    
    if (data) {
      onLogin(data);
    } else {
      setError('帳號或密碼錯誤');
    }  
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>登入系統</h2>
      <input
        placeholder="帳號"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      /><br /><br />
      <input
        type="password"
        placeholder="密碼"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      /><br /><br />
      <button onClick={handleLogin}>登入</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

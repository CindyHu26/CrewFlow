import { useEffect, useState } from 'react';
import { supabase } from './supabase';

type Customer = {
  id: string;
  name: string;
  region: string;
};

export default function CustomerManager() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('載入客戶失敗:', error.message);
      setMessage('❌ 載入失敗');
    } else {
      setCustomers(data || []);
    }
  }

  async function handleAdd() {
    setMessage('');
    if (!name || !region) {
      setMessage('❌ 請輸入客戶名稱與區域');
      return;
    }

    const { error } = await supabase.from('customers').insert([{ name, region }]);

    if (error) {
      console.error('新增失敗:', error.message);
      setMessage('❌ 新增失敗：' + error.message);
    } else {
      setMessage('✅ 客戶已新增');
      setName('');
      setRegion('');
      fetchData();
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📋 客戶管理</h2>

      <div style={{ marginBottom: '1rem' }}>
        <label>客戶名稱：</label><br />
        <input value={name} onChange={e => setName(e.target.value)} /><br /><br />

        <label>所屬區域：</label><br />
        <input value={region} onChange={e => setRegion(e.target.value)} /><br /><br />

        <button onClick={handleAdd}>➕ 新增客戶</button>
        {message && <p style={{ color: message.startsWith('✅') ? 'green' : 'red' }}>{message}</p>}
      </div>

      <table border={1} cellPadding={10}>
        <thead>
          <tr>
            <th>客戶名稱</th>
            <th>所屬區域</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

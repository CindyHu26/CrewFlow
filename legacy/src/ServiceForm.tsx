import { useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import SignatureCanvas from 'react-signature-canvas';

type Customer = {
  id: string;
  name: string;
  region: string;
};

type User = {
  id: string;
  username: string;
};

type Props = {
  userId: string;
};

export default function ServiceForm({ userId }: Props) {
  const [serviceTime, setServiceTime] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerRegion, setCustomerRegion] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [content, setContent] = useState('');
  const [message, setMessage] = useState('');
  const sigRef = useRef<SignatureCanvas | null>(null);
  const [photoFiles, setPhotoFiles] = useState<FileList | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: custData } = await supabase.from('customers').select('*');
    const { data: userData } = await supabase.from('users').select('id, username');
    if (custData) setCustomers(custData);
    if (userData) setUsers(userData);
  };

  const handleCustomerChange = (id: string) => {
    setSelectedCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    setCustomerRegion(selected?.region || '');
  };

  const handleWorkerChange = (id: string) => {
    if (selectedWorkers.includes(id)) {
      setSelectedWorkers(selectedWorkers.filter((wid) => wid !== id));
    } else {
      setSelectedWorkers([...selectedWorkers, id]);
    }
  };

  const handleSubmit = async () => {
    setMessage('');
    if (!serviceTime || !selectedCustomerId || selectedWorkers.length === 0) {
      setMessage('❌ 請完整填寫服務時間、客戶、服務人員');
      return;
    }

  const signatureBase64 = sigRef.current
    ? sigRef.current.getCanvas().toDataURL('image/png')
    : null;

  const uploadedUrls: string[] = [];

  if (photoFiles) {
    for (let i = 0; i < photoFiles.length; i++) {
      const file = photoFiles[i];
      const filename = `${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('service-photos')
        .upload(filename, file);

      if (uploadError) {
        console.error('圖片上傳失敗:', uploadError.message);
        setMessage('❌ 有圖片上傳失敗，請重試');
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('service-photos').getPublicUrl(filename);

      if (publicUrl) {
        uploadedUrls.push(publicUrl);
      }
    }
  }

  const { error } = await supabase.from('service_records').insert([{
      service_time: serviceTime,
      customer_id: selectedCustomerId,
      worker_ids: selectedWorkers,
      content,
      signature_data: signatureBase64,
      photos: uploadedUrls,
      created_by: userId,
    }]);

    if (error) {
      console.error('送出失敗:', error.message);
      setMessage('❌ 送出失敗：' + error.message);
    } else {
      setMessage('✅ 已成功送出服務紀錄');
      // 清空表單
      setServiceTime('');
      setSelectedCustomerId('');
      setCustomerRegion('');
      setSelectedWorkers([]);
      setContent('');
      sigRef.current?.clear();
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>📝 新增服務紀錄</h2>

      <label>服務時間：</label><br />
      <input
        type="datetime-local"
        value={serviceTime}
        onChange={e => setServiceTime(e.target.value)}
      /><br /><br />

      <label>客戶：</label><br />
      <select value={selectedCustomerId} onChange={e => handleCustomerChange(e.target.value)}>
        <option value="">請選擇</option>
        {customers.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select><br />
      {customerRegion && <p>📍 區域：{customerRegion}</p>}
      <br />

      <label>服務人員：</label><br />
      {users.map(u => (
        <label key={u.id} style={{ marginRight: '1rem' }}>
          <input
            type="checkbox"
            value={u.id}
            checked={selectedWorkers.includes(u.id)}
            onChange={() => handleWorkerChange(u.id)}
          />
          {u.username}
        </label>
      ))}<br /><br />

      <label>服務內容：</label><br />
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
        style={{ width: '300px' }}
      /><br /><br />

      <label>簽名：</label><br />
      <SignatureCanvas
        penColor="black"
        canvasProps={{ width: 300, height: 100, className: 'sigCanvas', style: { border: '1px solid #ccc' } }}
        ref={sigRef}
      />
      <button onClick={() => sigRef.current?.clear()}>清除簽名</button><br /><br />

      <label>上傳照片：</label><br />
      <input type="file" accept="image/*" multiple onChange={(e) => setPhotoFiles(e.target.files)} /><br /><br />

      {photoFiles && (
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {Array.from(photoFiles).map((file, index) => (
            <div key={index} style={{ fontSize: '0.8rem' }}>
              📷 {file.name}
            </div>
          ))}
        </div>
      )}

      <button onClick={handleSubmit}>📤 送出紀錄</button>
      {message && (
        <p style={{ color: message.startsWith('✅') ? 'green' : 'red' }}>
          {message}
        </p>
      )}
    </div>
  );
}

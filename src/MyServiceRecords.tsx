import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useRef } from 'react';


type Customer = {
  id: string;
  name: string;
  region: string;
};

type Record = {
  id: string;
  service_time: string;
  customer_id: string;
  worker_ids: string[];
  content: string;
  signature_data: string | null;
  created_by: string;
  photos: string[];
  customers?: Customer;
};

type User = {
  id: string;
  username: string;
};

type Props = {
  userId: string;
};

export default function MyServiceRecords({ userId }: Props) {
  const [records, setRecords] = useState<Record[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: recData } = await supabase
      .from('service_records')
      .select(`
        *,
        customers (
          id,
          name,
          region
        )
      `)
      .or(`created_by.eq.${userId},worker_ids.cs.{${userId}}`)
      .order('service_time', { ascending: false });

    const { data: userData } = await supabase.from('users').select('id, username');

    if (recData) setRecords(recData);
    if (userData) setUsers(userData);
  };

  const getUsername = (id: string) => {
    return users.find(u => u.id === id)?.username || id;
  };

  const detailRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!detailRef.current) return;

    // 確保圖片全部載入
    const images = detailRef.current.querySelectorAll('img') || [];
    await Promise.all(
      Array.from(images).map(img => {
        if (!img.complete) {
          return new Promise(resolve => {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          });
        }
        return Promise.resolve(true);
      })
    );

    const canvas = await html2canvas(detailRef.current, {
      useCORS: true,
      allowTaint: false,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`service_record_${expandedId}.pdf`);
  };


  return (
    <div style={{ padding: '2rem' }}>
      <h2>📋 我的服務紀錄</h2>
      {records.length === 0 ? (
        <p>尚無紀錄。</p>
      ) : (
        <table border={1} cellPadding={10} style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>服務時間</th>
              <th>客戶</th>
              <th>區域</th>
              <th>服務人員</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id}>
                <td>{new Date(r.service_time).toLocaleString()}</td>
                <td>{r.customers?.name || r.customer_id}</td>
                <td>{r.customers?.region || '-'}</td>
                <td>{r.worker_ids.map(getUsername).join(', ')}</td>
                <td>
                  <button onClick={() => setExpandedId(r.id === expandedId ? null : r.id)}>
                    {r.id === expandedId ? '▲ 收合' : '▼ 詳細'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {expandedId && (
        <div ref={detailRef} style={{ marginTop: '2rem', border: '1px solid #ccc', padding: '1rem' }}>
          <h3>🧾 詳細內容</h3>
          {(() => {
            const record = records.find(r => r.id === expandedId);
            if (!record) return <p>找不到紀錄</p>;

            return (
              <>
                <p><strong>服務時間：</strong>{new Date(record.service_time).toLocaleString()}</p>
                <p><strong>客戶：</strong>{record.customers?.name}</p>
                <p><strong>區域：</strong>{record.customers?.region}</p>
                <p><strong>服務人員：</strong>{record.worker_ids.map(getUsername).join(', ')}</p>
                <p><strong>內容：</strong><br />{record.content}</p>
                {record.signature_data && (
                  <>
                    <p><strong>簽名：</strong></p>
                    <img
                      src={record.signature_data}
                      alt="簽名"
                      style={{ border: '1px solid #ccc', width: '300px', height: 'auto' }}
                    />
                  </>
                )}
                {record.photos && record.photos.length > 0 && (
                  <>
                    <p><strong>照片：</strong></p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                      {record.photos.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`服務照片 ${idx + 1}`}
                          style={{ width: '200px', border: '1px solid #ccc' }}
                        />
                      ))}
                    </div>
                  </>
                )}

            <button onClick={handleDownloadPdf} style={{ marginTop: '1rem' }}>
              📄 下載 PDF
            </button>
              </>
            );

          })()}

        </div>
      )}
    </div>
  );
}

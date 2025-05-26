'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { serviceDB } from '@/lib/serviceDB';
import { Service, Report } from '@/types/service';
import { format } from 'date-fns';
import GeneratePDF from '@/components/GeneratePDF';

export default function ServiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [service, setService] = useState<Service & { reports?: Report[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadService = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const serviceData = await serviceDB.getServiceRecord(id);
        if (!serviceData) {
          setError('找不到服務紀錄');
          return;
        }
        setService(serviceData);
      } catch (error) {
        console.error('載入服務紀錄時發生錯誤:', error);
        setError('載入服務紀錄失敗');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadService();
    }
  }, [id, router]);

  const handleDelete = async () => {
    try {
      await serviceDB.deleteServiceRecord(id);
      router.push('/services');
    } catch (error) {
      console.error('刪除服務紀錄時發生錯誤:', error);
      alert('刪除失敗');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error || '找不到服務紀錄'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">服務紀錄詳情</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => router.back()}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
            >
              返回我的服務紀錄
            </button>
            <button
              onClick={() => router.push(`/services/edit/${id}`)}
              className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200"
            >
              編輯
            </button>
            <button
              onClick={() => {
                if (window.confirm('確定要刪除這筆服務紀錄嗎？此操作無法復原。')) {
                  handleDelete();
                }
              }}
              className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200"
            >
              刪除
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* 基本資訊 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">基本資訊</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">服務人員 / 同行人員</label>
                <div className="mt-1 text-gray-900">
                  {[service.staff_name, ...(service.partner_names || [])].filter(Boolean).join('、')}
                </div>
              </div>
            </div>
          </div>

          {/* 回報事項 */}
          {service.reports && service.reports.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">回報事項</h2>
              <div className="space-y-4">
                {service.reports.map((report, index) => (
                  <div key={index} className="border p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <span className="font-medium mr-2">{report.type}</span>
                        {report.is_urgent && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">緊急</span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(report.created_at.toDate(), 'yyyy/MM/dd HH:mm')}
                      </span>
                    </div>
                    <div className="text-gray-700 whitespace-pre-wrap">{report.body}</div>
                    {report.handling_note && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">處理備註：</span>
                        <span className="text-gray-700">{report.handling_note}</span>
                      </div>
                    )}
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">狀態：</span>
                      <span className={`${
                        report.status === '已完成' ? 'text-green-600' :
                        report.status === '處理中' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PDF 生成區塊 */}
          <div className="bg-white p-6 rounded-lg shadow">
            <GeneratePDF service={service} />
          </div>

          {/* 照片顯示區塊 */}
          {service.photo_urls && service.photo_urls.length > 0 && (
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">照片</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {service.photo_urls.map((url, index) => {
                  const fileId = url.match(/[?&]id=([^&]+)/)?.[1] || url.match(/\/d\/(.+?)\/view/)?.[1];
                  const directUrl = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1024` : url;
                  
                  return (
                    <div key={index} className="relative group">
                      <img
                        src={directUrl}
                        alt={`照片 ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
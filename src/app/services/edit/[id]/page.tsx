'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { serviceDB } from '@/lib/serviceDB';
import { Service } from '@/types/service';

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceData, setServiceData] = useState<Service | null>(null);

  useEffect(() => {
    const loadService = async () => {
      const user = getCurrentUser();
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        const data = await serviceDB.getServiceRecord(id);
        if (!data) {
          setError('找不到服務紀錄');
          return;
        }
        setServiceData(data);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceData) return;

    try {
      await serviceDB.updateServiceRecord(id, serviceData);
      router.push(`/services/${id}`);
    } catch (error) {
      console.error('更新服務紀錄時發生錯誤:', error);
      setError('更新服務紀錄失敗');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">{error}</div>
      </div>
    );
  }

  if (!serviceData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">找不到服務紀錄</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">編輯服務紀錄</h1>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">服務日期</label>
              <input
                type="date"
                value={serviceData.serviceDate}
                onChange={(e) => setServiceData({ ...serviceData, serviceDate: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">服務內容</label>
              <textarea
                value={serviceData.serviceContent}
                onChange={(e) => setServiceData({ ...serviceData, serviceContent: e.target.value })}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">備註</label>
              <textarea
                value={serviceData.notes || ''}
                onChange={(e) => setServiceData({ ...serviceData, notes: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push(`/services/${id}`)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                取消
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                儲存
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
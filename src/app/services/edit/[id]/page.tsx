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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="text-2xl text-gray-600 mb-4">開發中...</div>
      <div className="flex space-x-4">
        <button
          onClick={() => router.back()}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
        >
          返回
        </button>
        <button
          onClick={() => router.push(`/services/${id}`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          查看服務紀錄
        </button>
      </div>
    </div>
  );
} 
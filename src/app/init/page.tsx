'use client';

import { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { hashPassword } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function InitPage() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  async function initializeUsers() {
    try {
      setStatus('開始初始化...');
      const usersCollection = collection(db, 'users');

      // 檢查是否已有管理員帳號
      const adminQuery = query(usersCollection, where('username', '==', 'admin'));
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        setError('已經初始化過了！');
        return;
      }

      // 建立管理員帳號
      const adminPassword = await hashPassword('admin123');
      await addDoc(usersCollection, {
        username: 'admin',
        password: adminPassword,
        role: 'admin',
        region: 'ALL',
        annualLeaveTotal: 0,
        annualLeaveUsed: 0,
      });
      setStatus('管理員帳號建立完成');

      // 建立經理帳號
      const managerPassword = await hashPassword('manager123');
      await addDoc(usersCollection, {
        username: 'manager',
        password: managerPassword,
        role: 'manager',
        region: 'TAIPEI',
        annualLeaveTotal: 14,
        annualLeaveUsed: 0,
      });
      setStatus('經理帳號建立完成');

      // 建立員工帳號
      const employeePassword = await hashPassword('employee123');
      await addDoc(usersCollection, {
        username: 'employee',
        password: employeePassword,
        role: 'employee',
        region: 'TAIPEI',
        annualLeaveTotal: 14,
        annualLeaveUsed: 0,
      });
      setStatus('員工帳號建立完成');

      setStatus('初始化完成！');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error) {
      console.error('初始化資料時發生錯誤:', error);
      setError('初始化過程發生錯誤');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-center text-3xl font-extrabold text-gray-900">
            系統初始化
          </h2>
        </div>
        
        {error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        ) : status ? (
          <div className="bg-green-50 p-4 rounded-md">
            <p className="text-green-700">{status}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-500 text-center mb-4">
              這將建立系統所需的初始資料，包括預設使用者帳號。
            </p>
            <button
              onClick={initializeUsers}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              開始初始化
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 
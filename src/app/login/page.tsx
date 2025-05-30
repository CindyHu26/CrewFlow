'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getCurrentUser } from '@/lib/auth';
import { collection, setDoc, doc, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { hashPassword } from '@/lib/auth';
import { Timestamp } from 'firebase/firestore';
import Card from '@/components/Card';
import Button from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentUser = getCurrentUser();
    if (currentUser) {
      console.log('用戶已登入，重定向到首頁');
      router.push('/dashboard');
    }
  }, [router]);

  if (!mounted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (isRegistering) {
      // 註冊流程
      try {
        if (password !== confirmPassword) {
          setError('密碼與確認密碼不符');
          setIsLoading(false);
          return;
        }

        // 檢查用戶名是否已存在
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('name', '==', username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          setError('此用戶名已被使用');
          setIsLoading(false);
          return;
        }

        // 檢查員工編號是否已存在
        const employeeDoc = doc(db, 'users', employeeId);
        const employeeSnapshot = await getDocs(query(usersRef, where('employee_id', '==', employeeId)));

        if (!employeeSnapshot.empty) {
          setError('此員工編號已被使用');
          setIsLoading(false);
          return;
        }

        // 建立新用戶
        const createNewUser = async (employeeId: string, name: string, password: string) => {
          try {
            const userRef = collection(db, 'users');
            await addDoc(userRef, {
              employee_id: employeeId,
              name: name,
              password: password,
              phone: '',
              start_date: Timestamp.now(),
              position: '職員',
              position_level: 1,
              departments: ['一般'],
              annualLeaveUsed: 0
            });
            return true;
          } catch (error) {
            console.error('建立用戶時發生錯誤:', error);
            return false;
          }
        };

        // 自動登入
        const user = await login(username, password);
        if (user) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('註冊錯誤:', err);
        setError('註冊失敗，請稍後再試');
      }
    } else {
      // 登入流程
      try {
        console.log('嘗試登入:', username);
        const user = await login(username, password);
        console.log('登入結果:', user);
        
        if (user) {
          router.push('/dashboard');
        } else {
          setError('帳號或密碼錯誤');
        }
      } catch (err) {
        console.error('登入錯誤:', err);
        setError('登入失敗，請稍後再試');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md bg-white/80 dark:bg-gray-800/50">
        <div className="mb-8">
          <h2 className="text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            CrewFlow {isRegistering ? '註冊' : '登入'}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                帳號
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="帳號"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            {isRegistering && (
              <div>
                <label htmlFor="employee_id" className="sr-only">
                  員工編號
                </label>
                <input
                  id="employee_id"
                  name="employee_id"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="員工編號"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            )}
            <div>
              <label htmlFor="password" className="sr-only">
                密碼
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 ${
                  !isRegistering ? 'rounded-b-md' : ''
                } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {isRegistering && (
              <div>
                <label htmlFor="confirmPassword" className="sr-only">
                  確認密碼
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="確認密碼"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
              <p className="text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (isRegistering ? '註冊中...' : '登入中...') : (isRegistering ? '註冊' : '登入')}
            </Button>
            
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
                setPassword('');
                setConfirmPassword('');
                setEmployeeId('');
              }}
              className="w-full"
            >
              {isRegistering ? '已有帳號？返回登入' : '還沒有帳號？立即註冊'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SHA256 } from 'crypto-js';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import Select from 'react-select';

interface User {
  id: string;
  employee_id: string;
  name: string;
  position: string;
  departments: string[];
}

interface UserOption {
  value: string;
  label: string;
  user: User;
}

export default function PasswordPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }

      // 檢查是否為密碼管理員
      if (currentUser.employee_id !== 'P001' || currentUser.name !== 'admin') {
        router.push('/');
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const snapshot = await getDocs(usersRef);
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as User[];

        setUsers(usersList);
      } catch (err) {
        console.error('載入使用者資料時發生錯誤:', err);
        setError('載入使用者資料失敗');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [router]);

  const handleUserChange = (option: UserOption | null) => {
    setSelectedUser(option);
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedUser) {
      setError('請選擇使用者');
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError('請輸入新密碼和確認密碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不符');
      return;
    }

    try {
      const hashedPassword = SHA256(newPassword).toString();
      const userRef = doc(db, 'users', selectedUser.user.id);
      await updateDoc(userRef, {
        password: hashedPassword
      });

      setSuccess('密碼更新成功');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('更新密碼時發生錯誤:', err);
      setError('更新密碼失敗');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  const userOptions: UserOption[] = users.map(user => ({
    value: user.id,
    label: `${user.name} (${user.position})`,
    user: user
  }));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8">密碼管理</h1>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                選擇使用者
              </label>
              <Select
                value={selectedUser}
                onChange={handleUserChange}
                options={userOptions}
                isSearchable
                placeholder="請選擇使用者"
                className="basic-single"
                classNamePrefix="select"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密碼
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showNewPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                確認新密碼
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 p-4 rounded-md">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 p-4 rounded-md">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                更新密碼
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 
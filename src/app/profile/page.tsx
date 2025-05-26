'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { SHA256 } from 'crypto-js';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Timestamp } from 'firebase/firestore';
import { SignatureField } from '@/components/SignaturePad';
import { SignatureData } from '@/types/service';

interface UserProfile {
  id: string;
  employee_id: string;
  name: string;
  phone: string;
  position: string;
  position_level: number;
  departments: string[];
  start_date: Date;
  password: string;
  signature?: SignatureData;
}

const POSITIONS = ['總經理', '協理', '經理', '主任', '一般職員'];
const POSITION_LEVELS = {
  '總經理': 5,
  '協理': 4,
  '經理': 3,
  '主任': 2,
  '一般職員': 1
};
const DEPARTMENTS = ['業務', '人資', '總務', '行政', '服務'];

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const docRef = doc(db, 'users', user.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            ...data,
            id: docSnap.id,
            start_date: data.start_date?.toDate() || new Date(),
            departments: data.departments || []
          } as UserProfile);
        }
      } catch (err) {
        console.error('載入個人資料時發生錯誤:', err);
        setError('載入個人資料失敗');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedProfile({});
    } else {
      setEditedProfile({
        phone: profile?.phone || '',
        position: profile?.position || '',
        position_level: profile?.position_level || 1,
        departments: profile?.departments || [],
      });
    }
    setIsEditing(!isEditing);
  };

  const handleDepartmentChange = (dept: string) => {
    const currentDepts = editedProfile.departments || profile?.departments || [];
    let newDepts: string[];
    
    if (currentDepts.includes(dept)) {
      newDepts = currentDepts.filter(d => d !== dept);
    } else {
      newDepts = [...currentDepts, dept];
    }
    
    setEditedProfile({ ...editedProfile, departments: newDepts });
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (!profile) return;

      // 如果職位有更改，同時更新 position_level
      const updatedProfile = { ...editedProfile };
      if (updatedProfile.position) {
        updatedProfile.position_level = POSITION_LEVELS[updatedProfile.position as keyof typeof POSITION_LEVELS];
      }

      const docRef = doc(db, 'users', profile.id);
      await updateDoc(docRef, {
        ...updatedProfile,
        updated_at: Timestamp.now()
      });

      setProfile({ ...profile, ...updatedProfile });
      setSuccess('個人資料更新成功');
      setIsEditing(false);
    } catch (err) {
      console.error('更新個人資料時發生錯誤:', err);
      setError('更新個人資料失敗');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!profile) return;

    if (!newPassword || !confirmPassword) {
      setError('請輸入新密碼和確認密碼');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新密碼與確認密碼不符');
      return;
    }

    try {
      // 直接更新新密碼（使用 SHA-256 雜湊）
      const newPasswordHash = SHA256(newPassword).toString();
      const docRef = doc(db, 'users', profile.id);
      await updateDoc(docRef, {
        password: newPasswordHash
      });

      setSuccess('密碼更新成功');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('更新密碼時發生錯誤:', err);
      setError('更新密碼失敗');
    }
  };

  // 新增：簽名即時儲存（只存 base64 字串）
  const handleSignatureSave = async (signature: { dataUrl: string } | undefined) => {
    setError(null);
    setSuccess(null);
    if (!profile) return;
    try {
      const docRef = doc(db, 'users', profile.id);
      await updateDoc(docRef, {
        signature: signature?.dataUrl ? { 
          strokes: [], 
          dataUrl: signature.dataUrl as string
        } : undefined,
        updated_at: Timestamp.now()
      });
      setProfile({ 
        ...profile, 
        signature: signature?.dataUrl ? { 
          strokes: [], 
          dataUrl: signature.dataUrl as string
        } : undefined 
      });
      setSuccess('簽名已儲存');
    } catch (err) {
      console.error('儲存簽名時發生錯誤:', err);
      setError('儲存簽名失敗');
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-gray-600">載入中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-2xl text-red-600">無法載入個人資料</div>
      </div>
    );
  }

  // 格式化日期
  const formattedDate = format(profile.start_date, 'yyyy年MM月dd日', { locale: zhTW });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-8">個人資料設定</h1>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* 基本資料區塊 */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-medium">基本資料</h2>
              <button
                onClick={handleEditToggle}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isEditing ? '取消' : '編輯'}
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      員工編號
                    </label>
                    <input
                      type="text"
                      value={profile?.employee_id || ''}
                      disabled
                      className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                    />
                  </div>
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={profile?.name || ''}
                      disabled
                      className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                    />
                  </div>
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      電話
                    </label>
                    <input
                      type="tel"
                      value={editedProfile.phone || profile?.phone || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, phone: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      職位
                    </label>
                    <select
                      value={editedProfile.position || profile?.position || ''}
                      onChange={(e) => setEditedProfile({ ...editedProfile, position: e.target.value })}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      {POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      部門（可複選）
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {DEPARTMENTS.map((dept) => (
                        <div key={dept} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`dept-${dept}`}
                            checked={(editedProfile.departments || profile?.departments || []).includes(dept)}
                            onChange={() => handleDepartmentChange(dept)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`dept-${dept}`} className="ml-2 text-sm text-gray-700">
                            {dept}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4 sm:mb-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      到職日期
                    </label>
                    <input
                      type="date"
                      value={editedProfile.start_date 
                        ? format(new Date(editedProfile.start_date), 'yyyy-MM-dd')
                        : format(profile.start_date, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        setEditedProfile({ 
                          ...editedProfile, 
                          start_date: date 
                        });
                      }}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="mt-4 bg-red-50 p-4 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 bg-green-50 p-4 rounded-md">
                    <p className="text-sm text-green-700">{success}</p>
                  </div>
                )}

                <div className="mt-4">
                  <button
                    type="submit"
                    className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    儲存變更
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="mb-4 sm:mb-0">
                  <dt className="text-sm font-medium text-gray-700 mb-2">員工編號</dt>
                  <dd className="text-sm text-gray-900">{profile?.employee_id}</dd>
                </div>
                <div className="mb-4 sm:mb-0">
                  <dt className="text-sm font-medium text-gray-700 mb-2">姓名</dt>
                  <dd className="text-sm text-gray-900">{profile?.name}</dd>
                </div>
                <div className="mb-4 sm:mb-0">
                  <dt className="text-sm font-medium text-gray-700 mb-2">電話</dt>
                  <dd className="text-sm text-gray-900">{profile?.phone}</dd>
                </div>
                <div className="mb-4 sm:mb-0">
                  <dt className="text-sm font-medium text-gray-700 mb-2">職位</dt>
                  <dd className="text-sm text-gray-900">{profile?.position}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-sm font-medium text-gray-700 mb-2">部門</dt>
                  <dd className="text-sm text-gray-900">
                    {profile?.departments?.join('、') || '未設定'}
                  </dd>
                </div>
                <div className="mb-4 sm:mb-0">
                  <dt className="text-sm font-medium text-gray-700 mb-2">到職日期</dt>
                  <dd className="text-sm text-gray-900">{formattedDate}</dd>
                </div>
              </dl>
            )}
          </div>

          {/* 密碼更改區塊 */}
          <div className="p-4 sm:p-6">
            <h2 className="text-lg font-medium mb-6">更改密碼</h2>
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  新密碼
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                    required
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
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  確認新密碼
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                    required
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
                  className="w-full sm:w-auto flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  更新密碼
                </button>
              </div>
            </form>
          </div>

          {/* 簽名區塊 */}
          <div className="p-4 sm:p-6">
            <h2 className="text-lg font-medium mb-6">個人簽名</h2>
            <div className="space-y-4">
              <SignatureField
                label="個人簽名"
                value={profile?.signature}
                onChange={handleSignatureSave}
              />
              <p className="text-sm text-gray-500">
                此簽名將用於服務紀錄中，您可以隨時更新或移除簽名。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
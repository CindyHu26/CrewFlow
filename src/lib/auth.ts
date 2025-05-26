import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import crypto from 'crypto';
import { User } from '@/types';

let currentUser: User | null = null;

// 使用 SHA-256 進行密碼雜湊
function hashPasswordSync(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function login(name: string, password: string): Promise<User | null> {
  try {
    console.log('開始查詢使用者:', name);
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('name', '==', name));
    const querySnapshot = await getDocs(q);

    console.log('查詢結果:', querySnapshot.empty ? '未找到使用者' : '找到使用者');

    if (querySnapshot.empty) {
      console.log('使用者不存在');
      return null;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    console.log('正在驗證密碼');
    // 將輸入的密碼進行 SHA-256 雜湊後比較
    const hashedPassword = hashPasswordSync(password);
    const isValidPassword = userData.password === hashedPassword;
    
    if (!isValidPassword) {
      console.log('密碼錯誤');
      return null;
    }

    console.log('密碼驗證成功');
    const user = {
      ...userData,
      id: userDoc.id,
      start_date: userData.start_date
    } as User;

    setCurrentUser(user);
    console.log('登入成功，返回使用者資料');
    return user;
  } catch (error) {
    console.error('登入過程發生錯誤:', error);
    throw error;
  }
}

export function getCurrentUser(): User | null {
  try {
    console.log('Getting current user...');
    
    if (typeof window === 'undefined') {
      console.log('Running on server side, returning null');
      return null;
    }

    if (!currentUser) {
      console.log('No current user in memory, checking localStorage...');
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          console.log('Found saved user in localStorage');
          const parsedUser = JSON.parse(savedUser);
          currentUser = parsedUser as User;
          console.log('Successfully parsed user:', currentUser);
        } catch (error) {
          console.error('Error parsing user data:', error);
          localStorage.removeItem('user');
          return null;
        }
      } else {
        console.log('No saved user found in localStorage');
      }
    } else {
      console.log('Found current user in memory:', currentUser);
    }

    if (!currentUser) {
      console.log('No user found, returning null');
      return null;
    }

    // 檢查使用者資料是否完整
    if (!currentUser.name) {
      console.error('User data is incomplete, missing name');
      localStorage.removeItem('user');
      currentUser = null;
      return null;
    }

    console.log('Returning current user:', currentUser);
    return currentUser;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export function setCurrentUser(user: User | null): void {
  try {
    currentUser = user;
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      } else {
        localStorage.removeItem('user');
      }
    }
  } catch (error) {
    console.error('設置當前使用者時發生錯誤:', error);
  }
}

export function logout(): void {
  try {
    currentUser = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('登出時發生錯誤:', error);
  }
}

// 提供給其他模組使用的密碼雜湊函數
export async function hashPassword(password: string): Promise<string> {
  return hashPasswordSync(password);
} 
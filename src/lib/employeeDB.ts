'use client';

import { collection, getDocs, query, where, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { User } from '@/types';

const COLLECTION_NAME = 'users';

export const userDB = {
  // 取得所有使用者資料的快取
  userCache: new Map<string, User>(),

  // 初始化使用者資料快取
  async initializeCache(): Promise<void> {
    try {
      console.log('初始化使用者資料快取...');
      const q = query(collection(db, COLLECTION_NAME));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('DEBUG', data.employee_id, typeof data.start_date, data.start_date);
        
        // 檢查 start_date 的格式（如果有設定的話）
        if (data.start_date) {
          if (typeof data.start_date === 'string') {
            console.error(`警告：使用者 ${data.employee_id} 的 start_date 是字串格式:`, data.start_date);
            return;
          }

          // 確保 start_date 是 Timestamp
          if (!(data.start_date instanceof Timestamp)) {
            console.error(`警告：使用者 ${data.employee_id} 的 start_date 不是 Timestamp:`, data.start_date);
            return;
          }
        }

        const user = {
          id: doc.id,
          ...data,
          start_date: data.start_date || null
        } as User;
        
        if (user.employee_id) {
          this.userCache.set(user.employee_id, user);
        }
      });
      
      console.log(`快取初始化完成，共載入 ${this.userCache.size} 筆使用者資料`);
    } catch (error) {
      console.error('初始化使用者資料快取時發生錯誤:', error);
      throw new Error('無法載入使用者資料');
    }
  },

  // 根據員工編號取得使用者名稱
  getUserName(employeeId: string): string {
    const user = this.userCache.get(employeeId);
    return user ? user.name : employeeId;
  },

  // 批次轉換員工編號為名稱
  getUserNames(employeeIds: string[]): string[] {
    if (!employeeIds) return [];
    return employeeIds.map(id => this.getUserName(id));
  },

  // 根據 ID 取得使用者資料
  async getUserById(userId: string): Promise<User | null> {
    try {
      const docRef = doc(db, COLLECTION_NAME, userId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }

      const data = docSnap.data();
      
      // 檢查 start_date 的格式（如果有設定的話）
      if (data.start_date) {
        if (typeof data.start_date === 'string') {
          console.error(`警告：使用者 ${userId} 的 start_date 是字串格式:`, data.start_date);
          return null;
        }

        // 確保 start_date 是 Timestamp
        if (!(data.start_date instanceof Timestamp)) {
          console.error(`警告：使用者 ${userId} 的 start_date 不是 Timestamp:`, data.start_date);
          return null;
        }
      }

      return {
        id: docSnap.id,
        ...data,
        start_date: data.start_date || null
      } as User;
    } catch (error) {
      console.error('取得使用者資料時發生錯誤:', error);
      return null;
    }
  }
}; 
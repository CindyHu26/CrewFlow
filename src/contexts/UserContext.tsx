'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { collection, query, getDocs, onSnapshot, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';

interface UserContextType {
  users: User[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  getUserById: (id: string) => User | undefined;
  getUserByEmployeeId: (employeeId: string) => User | undefined;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // 使用 useCallback 優化函數效能
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const usersList = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          employee_id: data.employee_id,
          name: data.name,
          phone: data.phone,
          start_date: data.start_date ? data.start_date.toDate() : null,
          departments: data.departments || [],
          position: data.position || '',
          position_level: data.position_level || 0,
        } as User;
      });
      setUsers(usersList);
      setLastUpdate(Date.now());
    } catch (err) {
      console.error('載入用戶資料時發生錯誤:', err);
      setError('載入用戶資料時發生錯誤');
    } finally {
      setLoading(false);
    }
  }, []);

  // 實時監聽用戶資料變更
  useEffect(() => {
    const usersQuery = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(usersQuery, 
      (snapshot: QuerySnapshot<DocumentData>) => {
        const usersList = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            employee_id: data.employee_id,
            name: data.name,
            phone: data.phone,
            start_date: data.start_date ? data.start_date.toDate() : null,
            departments: data.departments || [],
            position: data.position || '',
            position_level: data.position_level || 0,
          } as User;
        });
        setUsers(usersList);
        setLastUpdate(Date.now());
        setLoading(false);
      },
      (err) => {
        console.error('監聽用戶資料時發生錯誤:', err);
        setError('監聽用戶資料時發生錯誤');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 根據 ID 獲取用戶
  const getUserById = useCallback((id: string) => {
    return users.find(user => user.id === id);
  }, [users]);

  // 根據員工編號獲取用戶
  const getUserByEmployeeId = useCallback((employeeId: string) => {
    return users.find(user => user.employee_id === employeeId);
  }, [users]);

  return (
    <UserContext.Provider value={{ 
      users, 
      loading, 
      error, 
      refreshUsers: loadUsers,
      getUserById,
      getUserByEmployeeId
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
} 
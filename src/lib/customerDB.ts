'use client';

import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, deleteDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { Customer, CustomerBase, NewCustomer, User } from '@/types';

const COLLECTION_NAME = 'customers';

export const customerDB = {
  // 新增客戶
  async createCustomer(customer: NewCustomer, currentUser: User): Promise<string> {
    if (!currentUser || !currentUser.employee_id) {
      throw new Error('使用者未登入或資料不完整');
    }

    try {
      const customerData = {
        ...customer,
        created_by: currentUser.employee_id,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        authorized_users: [
          'admin',
          currentUser.employee_id,
          ...customer.internal_staff,
          ...customer.external_staff
        ]
      };

      console.log('準備建立客戶資料:', customerData);
      const docRef = await addDoc(collection(db, COLLECTION_NAME), customerData);
      console.log('客戶資料建立成功, ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('建立客戶資料時發生錯誤:', error);
      throw new Error('建立客戶資料失敗');
    }
  },

  // 更新客戶資料
  async updateCustomer(id: string, data: Partial<Customer>, currentUser: User): Promise<void> {
    if (!currentUser || !currentUser.employee_id) {
      throw new Error('使用者未登入或資料不完整');
    }

    try {
      console.log('準備更新客戶資料:', { id, data });
      const customerRef = doc(db, COLLECTION_NAME, id);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        throw new Error('客戶資料不存在');
      }

      const currentData = customerDoc.data();
      
      // 檢查訪問權限
      if (!currentData.authorized_users.includes(currentUser.employee_id) && 
          !currentData.authorized_users.includes('admin')) {
        throw new Error('無權限修改此客戶資料');
      }

      const authorizedUsers = new Set([
        'admin',
        currentUser.employee_id,
        ...(data.internal_staff || currentData.internal_staff),
        ...(data.external_staff || currentData.external_staff)
      ]);

      const updateData = {
        ...data,
        updated_at: Timestamp.now(),
        authorized_users: Array.from(authorizedUsers)
      };

      console.log('更新資料:', updateData);
      await updateDoc(customerRef, updateData);
      console.log('客戶資料更新成功');
    } catch (error) {
      console.error('更新客戶資料時發生錯誤:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('更新客戶資料失敗');
      }
    }
  },

  // 取得單一客戶資料
  async getCustomer(id: string, currentUser: User): Promise<Customer | null> {
    if (!currentUser || !currentUser.employee_id) {
      throw new Error('使用者未登入或資料不完整');
    }

    try {
      console.log('準備讀取客戶資料:', { id, currentUser: currentUser.employee_id });
      const customerRef = doc(db, COLLECTION_NAME, id);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        console.log('客戶資料不存在');
        return null;
      }

      const data = customerDoc.data();
      console.log('讀取到的客戶資料:', data);
      
      // 檢查訪問權限
      if (!data.authorized_users.includes(currentUser.employee_id) && 
          !data.authorized_users.includes('admin')) {
        throw new Error('無權限訪問此客戶資料');
      }

      const customer = {
        id: customerDoc.id,
        ...data,
        created_at: data.created_at,
        updated_at: data.updated_at
      } as Customer;

      console.log('處理後的客戶資料:', customer);
      return customer;
    } catch (error) {
      console.error('取得客戶資料時發生錯誤:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('取得客戶資料失敗');
      }
    }
  },

  // 取得當前使用者可訪問的客戶列表
  async getAccessibleCustomers(currentUser: User): Promise<Customer[]> {
    try {
      console.log('準備查詢可訪問的客戶資料:', { currentUser: currentUser.employee_id });
      
      if (!currentUser || !currentUser.employee_id) {
        console.error('使用者未登入或資料不完整');
        throw new Error('使用者未登入或資料不完整');
      }

      let q;
      // 如果使用者是經理級以上（position_level > 2），可以看到所有客戶
      if (currentUser.position_level > 2) {
        q = query(
          collection(db, COLLECTION_NAME)
        );
      } else {
        // 一般使用者只能看到被授權的客戶
        q = query(
          collection(db, COLLECTION_NAME),
          where('authorized_users', 'array-contains', currentUser.employee_id)
        );
      }

      console.log('執行查詢...');
      const querySnapshot = await getDocs(q);
      console.log('查詢結果數量:', querySnapshot.size);

      const customers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('處理客戶資料:', { id: doc.id, name: data.name });
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now(),
          authorized_users: data.authorized_users || [],
          internal_staff: data.internal_staff || [],
          external_staff: data.external_staff || [],
          status: data.status || 'active'
        } as Customer;
      });

      // 在記憶體中進行排序
      customers.sort((a, b) => a.name.localeCompare(b.name));

      console.log('返回客戶列表，數量:', customers.length);
      return customers;
    } catch (error) {
      console.error('取得可訪問的客戶列表時發生錯誤:', error);
      throw new Error('取得客戶列表失敗');
    }
  },

  // 更新客戶授權用戶列表
  async updateAuthorizedUsers(customerId: string, authorizedUsers: string[], currentUser: User): Promise<void> {
    if (!currentUser || !currentUser.employee_id) {
      throw new Error('使用者未登入或資料不完整');
    }

    try {
      console.log('準備更新客戶授權用戶:', { customerId, authorizedUsers });
      const customerRef = doc(db, COLLECTION_NAME, customerId);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        throw new Error('客戶資料不存在');
      }

      const data = customerDoc.data();
      
      // 檢查訪問權限
      if (!data.authorized_users.includes(currentUser.employee_id) && 
          !data.authorized_users.includes('admin')) {
        throw new Error('無權限修改此客戶資料');
      }

      // 確保管理員和當前用戶的權限不會被移除
      const finalAuthorizedUsers = new Set([
        'admin',
        currentUser.employee_id,
        ...authorizedUsers
      ]);

      const updateData = {
        authorized_users: Array.from(finalAuthorizedUsers),
        updated_at: Timestamp.now()
      };

      console.log('更新授權用戶資料:', updateData);
      await updateDoc(customerRef, updateData);
      console.log('客戶授權用戶更新成功');
    } catch (error) {
      console.error('更新客戶授權用戶時發生錯誤:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('更新客戶授權用戶失敗');
      }
    }
  },

  // 刪除客戶
  async deleteCustomer(id: string, currentUser: User): Promise<void> {
    if (!currentUser || !currentUser.employee_id) {
      throw new Error('使用者未登入或資料不完整');
    }

    try {
      console.log('準備刪除客戶資料:', { id, currentUser: currentUser.employee_id });
      const customerRef = doc(db, COLLECTION_NAME, id);
      const customerDoc = await getDoc(customerRef);
      
      if (!customerDoc.exists()) {
        throw new Error('客戶資料不存在');
      }

      const data = customerDoc.data();
      
      // 只有管理員或建立者可以刪除客戶資料
      if (currentUser.employee_id !== 'admin' && 
          data.created_by !== currentUser.employee_id) {
        throw new Error('無權限刪除此客戶資料');
      }

      await deleteDoc(customerRef);
      console.log('客戶資料刪除成功');
    } catch (error) {
      console.error('刪除客戶時發生錯誤:', error);
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('刪除客戶失敗');
      }
    }
  },

  // 取得指定服務人員負責的客戶列表
  async getCustomersByStaff(staffId: string): Promise<Customer[]> {
    try {
      console.log('準備查詢服務人員負責的客戶資料:', { staffId });
      
      if (!staffId) {
        console.error('服務人員 ID 為空');
        throw new Error('服務人員 ID 為空');
      }

      const q = query(
        collection(db, COLLECTION_NAME),
        where('authorized_users', 'array-contains', staffId),
        where('status', '==', 'active'),
        orderBy('name')
      );

      console.log('執行查詢...');
      const querySnapshot = await getDocs(q);
      console.log('查詢結果數量:', querySnapshot.size);

      const customers = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('處理客戶資料:', { id: doc.id, name: data.name });
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now(),
          authorized_users: data.authorized_users || [],
          internal_staff: data.internal_staff || [],
          external_staff: data.external_staff || [],
          status: data.status || 'active'
        } as Customer;
      });

      console.log('返回客戶列表，數量:', customers.length);
      return customers;
    } catch (error) {
      console.error('取得服務人員負責的客戶列表時發生錯誤:', error);
      throw new Error('取得客戶列表失敗');
    }
  }
}; 
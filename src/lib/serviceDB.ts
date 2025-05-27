'use client';

import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where, orderBy, Timestamp, serverTimestamp, deleteDoc, runTransaction } from 'firebase/firestore';
import { db as rawDb, storage } from './firebase';
import type { Firestore } from 'firebase/firestore';
import { Service, ServiceFormData, SubItem, Expense, Report } from '@/types/service';
import { User } from '@/types';
import { format } from 'date-fns';
import { User as FirebaseUser } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL, FirebaseStorage } from 'firebase/storage';

const COLLECTION_NAME = 'services';
const SUB_ITEMS_COLLECTION = 'sub_items';
const EXPENSES_COLLECTION = 'expenses';
const REPORTS_COLLECTION = 'reports';
const USERS_COLLECTION = 'users';
const CUSTOMERS_COLLECTION = 'customers';

// 明確標註 db 和 storage 型別
const db: Firestore = rawDb as Firestore;
const firebaseStorage: FirebaseStorage = storage as FirebaseStorage;

// 生成紀錄編號
export function generateServiceId(): string {
  const now = Timestamp.now().toDate();
  const dateStr = format(now, 'yyyyMMdd');
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `SR-${dateStr}-${randomStr}`;
}

export const serviceDB = {
  // 建立服務紀錄
  async createServiceRecord(data: ServiceFormData): Promise<string> {
    try {
      // 檢查客戶名稱
      if (!data.customer_names || data.customer_names.length === 0) {
        throw new Error('請至少選擇一個客戶');
      }

      // 將 service_date 轉換為 Timestamp
      const serviceDate = new Date(data.service_date);
      if (isNaN(serviceDate.getTime())) {
        throw new Error('無效的日期格式');
      }

      const record: Omit<Service, 'id'> = {
        timestamp: Timestamp.fromDate(serviceDate),
        handling_process: data.handling_process || '',
        handling_result: data.handling_result || '',
        customer_id: data.customer_id || '',
        signature: data.signature || '',
        service_feedback_employer: data.service_feedback_employer || '',
        service_feedback_worker: data.service_feedback_worker || '',
        expenses: data.expenses || [],
        sub_items: data.sub_items || [],
        reports: data.reports || [],
        photos: data.photos || [],
        partners: data.partner_names || [],
        nationalities: data.nationalities || [],
        job_types: data.job_types || [],
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        status: data.status || 'draft',
        customer_names: Array.isArray(data.customer_names) ? data.customer_names : [],
        staff_name: data.staff_name || '',
        partner_names: data.partner_names || [],
        photo_urls: data.photo_urls || [],
        worker_name: data.worker_name || '',
        employer_signature: data.employer_signature || '',
        worker_signature: data.worker_signature || '',
        service_signature: data.service_signature || '',
        shared_info: data.shared_info || '',
        total_amount: data.total_amount || 0
      };

      console.log('準備建立服務紀錄:', record);

      const docRef = await addDoc(collection(db, COLLECTION_NAME), record);
      console.log('服務紀錄建立成功，ID:', docRef.id);

      // 建立子表記錄
      if (data.sub_items?.length || data.expenses?.length || data.reports?.length) {
        await Promise.all([
          ...(data.sub_items || []).map(item => 
            addDoc(collection(db, SUB_ITEMS_COLLECTION), {
              ...item,
              service_id: docRef.id,
              created_at: Timestamp.now(),
              updated_at: Timestamp.now()
            })
          ),
          ...(data.expenses || []).map(expense => 
            addDoc(collection(db, EXPENSES_COLLECTION), {
              ...expense,
              service_id: docRef.id,
              created_at: Timestamp.now(),
              updated_at: Timestamp.now()
            })
          ),
          ...(data.reports || []).map(report => 
            addDoc(collection(db, REPORTS_COLLECTION), {
              ...report,
              service_id: docRef.id,
              created_at: Timestamp.now(),
              updated_at: Timestamp.now()
            })
          )
        ]);
      }

      return docRef.id;
    } catch (error) {
      console.error('建立服務紀錄時發生錯誤:', error);
      throw error; // 拋出原始錯誤以便更好地診斷問題
    }
  },

  // 更新服務紀錄
  async updateServiceRecord(id: string, data: Partial<ServiceFormData>): Promise<void> {
    try {
      await runTransaction(db, async (transaction) => {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await transaction.get(docRef);
        
        if (!docSnap.exists()) {
          throw new Error('找不到服務紀錄');
        }

        // 更新主表
        transaction.update(docRef, {
          ...data,
          updated_at: Timestamp.now()
        });

        // 如果有子表資料，更新子表
        if (data.sub_items) {
          await updateSubTables(id, data.sub_items, data.expenses || [], data.reports || []);
        }
      });
    } catch (error) {
      console.error('更新服務紀錄時發生錯誤:', error);
      throw new Error('更新服務紀錄失敗');
    }
  },

  // 取得單一服務紀錄
  async getServiceRecord(id: string): Promise<Service | null> {
    try {
      console.log('開始查詢服務紀錄，ID:', id);
      
      const docRef = doc(db, COLLECTION_NAME, id);
      console.log('準備取得文件...');
      
      const docSnap = await getDoc(docRef);
      console.log('文件存在狀態:', docSnap.exists());
      
      if (!docSnap.exists()) {
        console.log('找不到服務紀錄');
        return null;
      }

      const data = docSnap.data();
      console.log('服務紀錄資料:', data);

      return {
        ...data,
        id: docSnap.id
      } as Service;
    } catch (error) {
      console.error('取得服務紀錄時發生錯誤:', error);
      throw new Error('取得服務紀錄失敗');
    }
  },

  // 取得使用者的服務紀錄列表
  async getUserServiceRecords(staffName: string): Promise<Service[]> {
    try {
      if (!staffName) {
        console.warn('Staff name is empty');
        return [];
      }

      console.log('Fetching service records for staff:', staffName);

      // 查詢主要服務人員的紀錄
      const staffServicesQuery = query(
        collection(db, COLLECTION_NAME),
        where('staff_name', '==', staffName),
        orderBy('timestamp', 'desc')
      );

      // 查詢同行人員的紀錄
      const partnerServicesQuery = query(
        collection(db, COLLECTION_NAME),
        where('partner_names', 'array-contains', staffName),
        orderBy('timestamp', 'desc')
      );

      console.log('Executing queries...');
      // 執行查詢
      const [staffServicesSnapshot, partnerServicesSnapshot] = await Promise.all([
        getDocs(staffServicesQuery),
        getDocs(partnerServicesQuery)
      ]);

      console.log('Staff services count:', staffServicesSnapshot.size);
      console.log('Partner services count:', partnerServicesSnapshot.size);

      // 使用 Map 來去除重複的服務紀錄
      const servicesMap = new Map<string, Service>();
      
      staffServicesSnapshot.docs.forEach(doc => {
        try {
        const data = doc.data();
          console.log('Staff service data:', data);
          
          if (!data.timestamp) {
            console.error('Service record missing timestamp:', data);
            return;
          }

        servicesMap.set(doc.id, {
          ...data,
          id: doc.id,
            timestamp: data.timestamp || Timestamp.now(),
            created_at: data.created_at || Timestamp.now(),
            updated_at: data.updated_at || Timestamp.now(),
            customer_names: data.customer_names || [],
            job_types: data.job_types || [],
            partner_names: data.partner_names || [],
            nationalities: data.nationalities || [],
            expenses: data.expenses || [],
            sub_items: data.sub_items || [],
            reports: data.reports || [],
            photo_urls: data.photo_urls || [],
            status: data.status || 'draft'
        } as Service);
        } catch (error) {
          console.error('Error processing staff service:', error, doc.id);
        }
      });

      partnerServicesSnapshot.docs.forEach(doc => {
        try {
        if (!servicesMap.has(doc.id)) {
          const data = doc.data();
            console.log('Partner service data:', data);
            
            if (!data.timestamp) {
              console.error('Service record missing timestamp:', data);
              return;
            }

          servicesMap.set(doc.id, {
            ...data,
            id: doc.id,
              timestamp: data.timestamp || Timestamp.now(),
              created_at: data.created_at || Timestamp.now(),
              updated_at: data.updated_at || Timestamp.now(),
              customer_names: data.customer_names || [],
              job_types: data.job_types || [],
              partner_names: data.partner_names || [],
              nationalities: data.nationalities || [],
              expenses: data.expenses || [],
              sub_items: data.sub_items || [],
              reports: data.reports || [],
              photo_urls: data.photo_urls || [],
              status: data.status || 'draft'
          } as Service);
          }
        } catch (error) {
          console.error('Error processing partner service:', error, doc.id);
        }
      });

      // 將 Map 轉換為陣列並依時間排序
      const services = Array.from(servicesMap.values());
      console.log('Total services:', services.length);
      
      if (services.length > 0) {
        console.log('First service record:', services[0]);
      }
      
      return services.sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
    } catch (error) {
      console.error('取得使用者服務紀錄時發生錯誤:', error);
      throw new Error('取得使用者服務紀錄失敗');
    }
  },

  // 提交服務紀錄
  async submitServiceRecord(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: 'submitted',
        updated_at: Timestamp.now()
      });
    } catch (error) {
      console.error('提交服務紀錄時發生錯誤:', error);
      throw new Error('提交服務紀錄失敗');
    }
  },

  // 審核服務紀錄
  async reviewServiceRecord(id: string, approved: boolean, reviewNote?: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, {
        status: approved ? 'approved' : 'rejected',
        review_note: reviewNote,
        updated_at: Timestamp.now()
      });
    } catch (error) {
      console.error('審核服務紀錄時發生錯誤:', error);
      throw new Error('審核服務紀錄失敗');
    }
  },

  // 刪除服務紀錄
  async deleteServiceRecord(id: string): Promise<void> {
    try {
      // 刪除主表記錄
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);

      // 刪除相關的子表記錄
      // 1. 刪除收取/交付物件
      const subItemsQuery = query(
        collection(db, SUB_ITEMS_COLLECTION),
        where('service_id', '==', id)
      );
      const subItemsSnapshot = await getDocs(subItemsQuery);
      for (const doc of subItemsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // 2. 刪除收支明細
      const expensesQuery = query(
        collection(db, EXPENSES_COLLECTION),
        where('service_id', '==', id)
      );
      const expensesSnapshot = await getDocs(expensesQuery);
      for (const doc of expensesSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

      // 3. 刪除回報事項
      const reportsQuery = query(
        collection(db, REPORTS_COLLECTION),
        where('service_id', '==', id)
      );
      const reportsSnapshot = await getDocs(reportsQuery);
      for (const doc of reportsSnapshot.docs) {
        await deleteDoc(doc.ref);
      }

    } catch (error) {
      console.error('刪除服務紀錄時發生錯誤:', error);
      throw new Error('刪除服務紀錄失敗');
    }
  },

  // 獲取指定服務人員的服務紀錄（只查詢主要服務人員）
  async getServicesByStaffName(staffName: string): Promise<Service[]> {
    try {
      console.log('Querying services for staff name:', staffName); // 追蹤查詢參數

      if (!staffName) {
        console.warn('Staff name is empty');
        return [];
      }

      const servicesQuery = query(
        collection(db, COLLECTION_NAME),
        where('staff_name', '==', staffName),
        orderBy('timestamp', 'desc')
      );

      console.log('Executing query...'); // 追蹤查詢執行
      const querySnapshot = await getDocs(servicesQuery);
      console.log('Query results count:', querySnapshot.size); // 追蹤結果數量

      const services = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Service data:', { id: doc.id, ...data }); // 追蹤每筆資料
        return {
          id: doc.id,
          ...data
        } as Service;
      });

      return services;
    } catch (error) {
      console.error('取得服務人員服務紀錄時發生錯誤:', error);
      throw new Error('取得服務人員服務紀錄失敗');
    }
  },

  // 獲取指定區域的服務紀錄（包含主要服務人員和同行人員的紀錄）
  async getServicesByTeam(staffNames: string[]): Promise<Service[]> {
    try {
      // 查詢主要服務人員的紀錄
      const staffServicesQuery = query(
        collection(db, COLLECTION_NAME),
        where('staff_name', 'in', staffNames),
        orderBy('timestamp', 'desc')
      );

      // 查詢同行人員的紀錄
      const partnerServicesPromises = staffNames.map(name => 
        getDocs(query(
          collection(db, COLLECTION_NAME),
          where('partner_names', 'array-contains', name),
          orderBy('timestamp', 'desc')
        ))
      );

      // 執行所有查詢
      const [staffServicesSnapshot, ...partnerServicesSnapshots] = await Promise.all([
        getDocs(staffServicesQuery),
        ...partnerServicesPromises
      ]);

      // 使用 Map 來去除重複的服務紀錄
      const servicesMap = new Map<string, Service>();

      // 加入主要服務人員的紀錄
      staffServicesSnapshot.docs.forEach(doc => {
        servicesMap.set(doc.id, {
          id: doc.id,
          ...doc.data()
        } as Service);
      });

      // 加入同行人員的紀錄
      partnerServicesSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          if (!servicesMap.has(doc.id)) {
            servicesMap.set(doc.id, {
              id: doc.id,
              ...doc.data()
            } as Service);
          }
        });
      });

      // 將 Map 轉換為陣列並依時間排序
      return Array.from(servicesMap.values())
        .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
    } catch (error) {
      console.error('取得團隊服務紀錄時發生錯誤:', error);
      throw new Error('取得團隊服務紀錄失敗');
    }
  },

  // 取得所有服務紀錄
  async getAllServiceRecords(): Promise<Service[]> {
    try {
      const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
      return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Service));
    } catch (error) {
      console.error('取得所有服務紀錄時發生錯誤:', error);
      throw new Error('取得所有服務紀錄失敗');
    }
  },

  // 依據多個客戶名稱查詢服務紀錄
  async getServicesByCustomerNames(customerNames: string[]): Promise<Service[]> {
    if (!customerNames || customerNames.length === 0) return [];
    // Firestore 陣列查詢最大 10 個元素，需分批查詢
    const batchSize = 10;
    let allServices: Service[] = [];
    for (let i = 0; i < customerNames.length; i += batchSize) {
      const batch = customerNames.slice(i, i + batchSize);
      const q = query(
        collection(db, COLLECTION_NAME),
        where('customer_names', 'array-contains-any', batch),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const services = querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      } as Service));
      allServices = allServices.concat(services);
    }
    // 去除重複
    const unique = new Map<string, Service>();
    allServices.forEach(s => unique.set(s.id, s));
    return Array.from(unique.values()).sort((a, b) => b.timestamp.toDate().getTime() - a.timestamp.toDate().getTime());
  },

  // 取得指定日期範圍的服務紀錄
  async getServiceRecordsByDateRange(
    startDate: Date,
    endDate: Date,
    currentUser: User
  ): Promise<any[]> {
    try {
      console.log('準備查詢服務紀錄:', {
        startDate,
        endDate,
        currentUser: currentUser.employee_id
      });

      // 先取得日期範圍內的所有服務紀錄
      const q = query(
        collection(db, COLLECTION_NAME),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        where('timestamp', '<=', Timestamp.fromDate(endDate))
      );

      console.log('執行查詢...');
      const querySnapshot = await getDocs(q);
      console.log('查詢結果數量:', querySnapshot.size);

      const records = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('服務紀錄資料:', { 
          id: doc.id, 
          customer_names: data.customer_names,
          timestamp: data.timestamp,
          staff_name: data.staff_name
        });
        return {
          id: doc.id,
          ...data
        };
      });

      return records;
    } catch (error) {
      console.error('取得服務紀錄時發生錯誤:', error);
      throw new Error('取得服務紀錄失敗');
    }
  },

  // 取得員工列表
  async getStaffList(): Promise<Array<{ id: string; name: string; departments?: string[] }>> {
    try {
      console.log('正在取得員工列表...');
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const staffList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{ id: string; name: string; departments?: string[] }>;
      
      console.log('取得員工列表成功:', staffList);
      return staffList;
    } catch (error) {
      console.error('取得員工列表時發生錯誤:', error);
      throw new Error('取得員工列表失敗');
    }
  },

  // 取得客戶列表
  async getCustomerList(): Promise<Array<{ id: string; name: string; category?: string }>> {
    try {
      console.log('正在取得客戶列表...');
      const customerRef = collection(db, 'customers');
      const snapshot = await getDocs(customerRef);
      const customerList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Array<{ id: string; name: string; category?: string }>;
      
      console.log('取得客戶列表成功:', customerList);
      return customerList;
    } catch (error) {
      console.error('取得客戶列表時發生錯誤:', error);
      throw new Error('取得客戶列表失敗');
    }
  },

  // 上傳照片
  async uploadPhotos(files: FileList) {
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const storageRef = ref(firebaseStorage, `services/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        return await getDownloadURL(storageRef);
      });

      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('上傳照片時發生錯誤:', error);
      throw error;
    }
  },

  // 刪除子表資料
  async deleteByServiceId(serviceId: string) {
    try {
      // 刪除子表項目
      const subItemsRef = collection(db, 'sub_items');
      const subItemsQuery = query(subItemsRef, where('service_id', '==', serviceId));
      const subItemsSnapshot = await getDocs(subItemsQuery);
      const subItemsDeletePromises = subItemsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(subItemsDeletePromises);

      // 刪除收支明細
      const expensesRef = collection(db, 'expenses');
      const expensesQuery = query(expensesRef, where('service_id', '==', serviceId));
      const expensesSnapshot = await getDocs(expensesQuery);
      const expensesDeletePromises = expensesSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(expensesDeletePromises);

      // 刪除回報事項
      const reportsRef = collection(db, 'reports');
      const reportsQuery = query(reportsRef, where('service_id', '==', serviceId));
      const reportsSnapshot = await getDocs(reportsQuery);
      const reportsDeletePromises = reportsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(reportsDeletePromises);
    } catch (error) {
      console.error('刪除子表資料時發生錯誤:', error);
      throw error;
    }
  }
};

// 收取/交付物件相關的資料庫操作
export const subItemDB = {
  // 取得服務紀錄的收取/交付物件列表
  async getByServiceId(serviceId: string): Promise<SubItem[]> {
    try {
      const q = query(
        collection(db, SUB_ITEMS_COLLECTION),
        where('service_id', '==', serviceId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          service_id: data.service_id || serviceId,
          category: data.category || '',
          item_name: data.item_name || '',
          quantity: data.quantity || 0,
          note: data.note || '',
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now()
        } as SubItem;
      });
    } catch (error) {
      console.error('取得收取/交付物件列表時發生錯誤:', error);
      throw error;
    }
  },

  // 建立收取/交付物件
  async createSubItem(item: Omit<SubItem, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, SUB_ITEMS_COLLECTION), {
        ...item,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('建立收取/交付物件時發生錯誤:', error);
      throw error;
    }
  }
};

// 收支明細相關的資料庫操作
export const expenseDB = {
  // 取得服務紀錄的收支明細列表
  async getByServiceId(serviceId: string): Promise<Expense[]> {
    try {
      const q = query(
        collection(db, EXPENSES_COLLECTION),
        where('service_id', '==', serviceId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          service_id: data.service_id || serviceId,
          category: data.category || '',
          item: data.item || '',
          amount: data.amount || 0,
          remark: data.remark || '',
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now()
        } as Expense;
      });
    } catch (error) {
      console.error('取得收支明細列表時發生錯誤:', error);
      throw error;
    }
  },

  // 建立收支明細
  async createExpense(expense: Omit<Expense, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, EXPENSES_COLLECTION), {
        ...expense,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('建立收支明細時發生錯誤:', error);
      throw error;
    }
  }
};

// 回報事項相關的資料庫操作
export const reportDB = {
  // 取得服務紀錄的回報事項列表
  async getByServiceId(serviceId: string): Promise<Report[]> {
    try {
      const q = query(
        collection(db, REPORTS_COLLECTION),
        where('service_id', '==', serviceId)
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          service_id: data.service_id || '',
          type: data.type || '',
          content: data.content || '',
          is_urgent: data.is_urgent || false,
          status: data.status || '',
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now()
        } as Report;
      });
      return reports.sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime());
    } catch (error) {
      console.error('取得回報事項列表時發生錯誤:', error);
      throw error;
    }
  },

  // 取得緊急回報事項列表
  async getUrgentReports(): Promise<Report[]> {
    try {
      const q = query(
        collection(db, 'reports'),
        where('is_urgent', '==', true),
        where('status', '==', '待處理')
      );
      const querySnapshot = await getDocs(q);
      const reports = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          service_id: data.service_id || '',
          type: data.type || '',
          content: data.content || '',
          is_urgent: data.is_urgent || false,
          status: data.status || '',
          created_at: data.created_at || Timestamp.now(),
          updated_at: data.updated_at || Timestamp.now()
        } as Report;
      });
      return reports.sort((a, b) => b.created_at.toDate().getTime() - a.created_at.toDate().getTime());
    } catch (error) {
      console.error('取得緊急回報事項列表時發生錯誤:', error);
      throw error;
    }
  },

  // 建立回報事項
  async createReport(report: Omit<Report, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
        ...report,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('建立回報事項時發生錯誤:', error);
      throw error;
    }
  }
};

// 使用者相關的資料庫操作
export const userDB = {
  // 取得所有使用者列表（作為同行人員選項）
  async getUsers(): Promise<{ users: Array<{ id: string; name: string; departments: string[] }> }> {
    try {
      const q = query(
        collection(db, USERS_COLLECTION),
        orderBy('name')
      );
      const querySnapshot = await getDocs(q);
      return {
        users: querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
        id: doc.id,
            name: data.name,
            departments: data.departments || []
          };
        })
      };
    } catch (error) {
      console.error('取得使用者列表時發生錯誤:', error);
      throw error;
    }
  }
};

// 更新子表資料的事務
export const updateSubTables = async (
  serviceId: string,
  sub_items: SubItem[],
  expenses: Expense[],
  reports: Report[]
) => {
  try {
    await runTransaction(db, async (transaction) => {
      // 1. 刪除現有記錄
      const [subItemsQuery, expensesQuery, reportsQuery] = [
        query(collection(db, SUB_ITEMS_COLLECTION), where('service_id', '==', serviceId)),
        query(collection(db, EXPENSES_COLLECTION), where('service_id', '==', serviceId)),
        query(collection(db, REPORTS_COLLECTION), where('service_id', '==', serviceId))
      ];

      const [subItemsSnap, expensesSnap, reportsSnap] = await Promise.all([
        getDocs(subItemsQuery),
        getDocs(expensesQuery),
        getDocs(reportsQuery)
      ]);

      // 2. 刪除現有記錄
      const deletePromises = [
        ...subItemsSnap.docs.map(doc => transaction.delete(doc.ref)),
        ...expensesSnap.docs.map(doc => transaction.delete(doc.ref)),
        ...reportsSnap.docs.map(doc => transaction.delete(doc.ref))
      ];

      // 3. 建立新記錄
      const now = Timestamp.now();
      const createPromises = [
        ...sub_items.map(item => {
          const newDocRef = doc(collection(db, SUB_ITEMS_COLLECTION));
          return transaction.set(newDocRef, {
            ...item,
            service_id: serviceId,
            created_at: now,
            updated_at: now
          });
        }),
        ...expenses.map(expense => {
          const newDocRef = doc(collection(db, EXPENSES_COLLECTION));
          return transaction.set(newDocRef, {
            ...expense,
            service_id: serviceId,
            created_at: now,
            updated_at: now
          });
        }),
        ...reports.map(report => {
          const newDocRef = doc(collection(db, REPORTS_COLLECTION));
          return transaction.set(newDocRef, {
            ...report,
            service_id: serviceId,
            created_at: now,
            updated_at: now
          });
        })
      ];

      // 4. 執行所有操作
      await Promise.all([...deletePromises, ...createPromises]);
    });
  } catch (error) {
    console.error('更新子表時發生錯誤:', error);
    throw new Error('更新子表失敗');
  }
}; 
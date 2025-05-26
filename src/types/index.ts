import { Timestamp } from 'firebase/firestore';
import { SignatureData } from './service';

export interface User {
  id: string;
  employee_id: string;
  name: string;
  password: string;
  phone: string;
  start_date?: Timestamp | null;
  position: string;
  position_level: number;
  departments: string[];
  annualLeaveUsed?: number;
  signature?: SignatureData; // 使用者簽名
}

export interface Leave {
  id: string;
  type: '特休' | '事假' | '病假' | '其他';
  startDateTime: Date | Timestamp;
  endDateTime: Date | Timestamp;
  totalHours: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  userId: string;
  username: string;
  deputies: string[];
  currentApprovers: string[];
  created_at: Timestamp;
  updated_at: Timestamp;
  approvalFlow: {
    deputies: Array<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    }>;
    supervisors: Array<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    }>;
    managers: Array<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    }>;
    directors: Array<{
      id: string;
      status: 'pending' | 'approved' | 'rejected';
      updated_at?: Timestamp;
    }>;
  };
}

export interface Service {
  id: string;
  userId: string;
  username: string;
  customerId: string;
  customerName: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  images: string[]; // Google Drive URLs
  signature: string; // Base64 or Google Drive URL
  status: 'draft' | 'synced';
  created_at: Timestamp;
  updated_at: Timestamp;
}

// 基本客戶資料介面
export interface CustomerBase {
  name: string;  // 只有名稱是必填
  code?: string;
  county?: string;
  district?: string;
  address?: string;
  owner?: string;
  contact?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  category: '工廠' | '個人' | '養護機構';  // 保持必填，因為有預設值
  internal_staff: string[];  // 保持必填，因為預設為空陣列
  external_staff: string[];  // 保持必填，因為預設為空陣列
  status: 'active' | 'inactive';  // 保持必填，因為有預設值
}

// 完整的客戶資料介面，包含系統欄位
export interface Customer {
  id: string;
  code?: string;
  name: string;
  category: '工廠' | '個人' | '養護機構';
  internal_staff: string[];
  external_staff: string[];
  authorized_users: string[];
  status: 'active' | 'inactive';
  owner?: string;
  contact?: string;
  phone?: string;
  fax?: string;
  mobile?: string;
  county?: string;
  district?: string;
  address?: string;
  created_at: Timestamp;
  updated_at: Timestamp;
}

// 用於建立新客戶的介面
export type NewCustomer = Omit<Customer, 'id'> & {
  created_by: string;
}; 
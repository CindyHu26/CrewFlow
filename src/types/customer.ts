import { Timestamp } from 'firebase/firestore';

export interface Customer {
  id: string;
  name: string;
  code?: string;
  phone?: string;
  address?: string;
  category: '工廠' | '個人' | '養護機構';
  internal_staff: string[];
  external_staff: string[];
  authorized_users: string[];
  status: 'active' | 'inactive';
  created_at: Date | Timestamp;
  updated_at: Date | Timestamp;
  created_by?: string;
  updated_by?: string;
}

export interface NewCustomer {
  name: string;
  phone: string;
  address: string;
} 
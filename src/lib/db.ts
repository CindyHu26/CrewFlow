import Dexie, { Table } from 'dexie';
import { Service } from '@/types';

export class CrewFlowDatabase extends Dexie {
  services!: Table<Service>;

  constructor() {
    super('CrewFlowDB');
    this.version(1).stores({
      services: '++id, userId, customerId, status, serviceDate'
    });
  }
}

export const db = new CrewFlowDatabase();

// 同步功能
export async function syncServices() {
  const offlineServices = await db.services
    .where('status')
    .equals('draft')
    .toArray();

  // TODO: 實作與 Firestore 同步的邏輯
  // 1. 上傳圖片到 Google Drive
  // 2. 更新 Firestore 記錄
  // 3. 更新本地狀態為 'synced'
} 
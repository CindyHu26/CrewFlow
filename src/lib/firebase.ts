'use client';

import { initializeApp } from "firebase/app";
import { getFirestore, initializeFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// 檢查環境變數
let hasConfigError = false;
Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    console.error(`Firebase 配置錯誤: ${key} 未設定`);
    hasConfigError = true;
  }
});

if (hasConfigError) {
  console.error('Firebase 配置不完整，請檢查環境變數');
}

// Initialize Firebase
let app;
try {
  console.log('正在初始化 Firebase...');
  app = initializeApp(firebaseConfig);
  console.log('Firebase 初始化成功');
} catch (error) {
  console.error('Firebase 初始化失敗:', error);
  throw error;
}

// Initialize Firebase services
let db: Firestore;
try {
  console.log('正在初始化 Firestore...');
  db = initializeFirestore(app, {
    experimentalForceLongPolling: false,
    experimentalAutoDetectLongPolling: true
  }) as Firestore;
  console.log('Firestore 初始化成功');
} catch (error) {
  console.error('Firestore 初始化失敗:', error);
  throw error;
}

// Initialize Storage
let storage: FirebaseStorage;
try {
  console.log('正在初始化 Storage...');
  storage = getStorage(app);
  console.log('Storage 初始化成功');
} catch (error) {
  console.error('Storage 初始化失敗:', error);
  throw error;
}

// 確保只在客戶端初始化 auth
let auth;
if (typeof window !== 'undefined') {
  try {
    console.log('正在初始化 Auth...');
    auth = getAuth();
    if (!auth) {
      auth = getAuth(app);
    }
    console.log('Auth 初始化成功');
  } catch (error) {
    console.error('Auth 初始化失敗:', error);
    auth = getAuth(app);
  }
}

// 啟用離線持久化
if (typeof window !== 'undefined') {
  console.log('正在啟用離線持久化...');
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('無法啟用離線持久化：多個分頁同時開啟');
    } else if (err.code === 'unimplemented') {
      console.warn('當前瀏覽器不支援離線持久化');
    } else {
      console.error('啟用離線持久化時發生錯誤:', err);
    }
  });
}

export { db, storage, auth }; 
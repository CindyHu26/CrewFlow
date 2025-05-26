import { Timestamp } from 'firebase/firestore';
import { differenceInMonths, differenceInHours, isWeekend, format } from 'date-fns';

interface Tenure {
  years: number;
  months: number;
}

/**
 * 計算到職年資
 * @param startDate 到職日期
 * @returns 年資資訊
 */
function calculateTenure(startDate: Date | Timestamp): Tenure {
  const start = startDate instanceof Date ? startDate : startDate.toDate();
  const now = new Date();
  const totalMonths = differenceInMonths(now, start);
  
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12
  };
}

/**
 * 格式化年資顯示
 * @param startDate 到職日期
 * @returns 格式化的年資字串
 */
export function formatYearsOfService(startDate: Date | Timestamp): string {
  const { years, months } = calculateTenure(startDate);
  
  if (years === 0) {
    return `${months} 個月`;
  } else if (months === 0) {
    return `${years} 年`;
  } else {
    return `${years} 年 ${months} 個月`;
  }
}

/**
 * 根據台灣勞基法計算年假天數
 * @param startDate 到職日期（Date 或 Timestamp）
 * @returns 年假天數
 */
export function calculateAnnualLeave(startDate: Date | Timestamp): number {
  const { years, months } = calculateTenure(startDate);
  const totalYears = years + (months / 12);

  if (totalYears < 0.5) return 0;
  if (totalYears < 1) return 3;
  if (totalYears < 2) return 7;
  if (totalYears < 3) return 10;
  if (totalYears < 5) return 14;
  if (totalYears < 10) return 15;
  if (totalYears < 11) return 16;
  if (totalYears < 12) return 17;
  if (totalYears < 13) return 18;
  if (totalYears < 14) return 19;
  if (totalYears < 15) return 20;
  if (totalYears < 16) return 21;
  if (totalYears < 17) return 22;
  if (totalYears < 18) return 23;
  if (totalYears < 19) return 24;
  if (totalYears < 20) return 25;
  if (totalYears < 21) return 26;
  if (totalYears < 22) return 27;
  if (totalYears < 23) return 28;
  if (totalYears < 24) return 29;
  return 30;
}

/**
 * 計算兩個日期時間之間的工作時數
 * @param startDateTime 開始日期時間
 * @param endDateTime 結束日期時間
 * @returns 工作時數（小時）
 */
export function calculateWorkingHours(startDate: Date | Timestamp, endDate: Date | Timestamp): number {
  // 確保日期是 Date 物件
  const start = startDate instanceof Date ? startDate : startDate.toDate();
  const end = endDate instanceof Date ? endDate : endDate.toDate();

  // 如果是同一天
  if (start.getDate() === end.getDate() && 
      start.getMonth() === end.getMonth() && 
      start.getFullYear() === end.getFullYear()) {
    if (isWeekend(start)) {
      return 0;
    }
    return (end.getHours() + end.getMinutes() / 60) - (start.getHours() + start.getMinutes() / 60);
  }

  // 如果是跨天的情況
  let totalHours = 0;
  let currentDate = new Date(start);

  while (currentDate <= end) {
    if (!isWeekend(currentDate)) {
      const dayStart = new Date(currentDate);
      const dayEnd = new Date(currentDate);
      
      // 設定當天的開始和結束時間
      if (currentDate.getDate() === start.getDate()) {
        // 第一天：從請假開始時間到當天結束
        dayStart.setHours(start.getHours(), start.getMinutes(), 0);
        dayEnd.setHours(17, 0, 0); // 假設工作到下午 5 點
      } else if (currentDate.getDate() === end.getDate()) {
        // 最後一天：從早上開始到請假結束時間
        dayStart.setHours(8, 0, 0); // 假設早上 8 點開始
        dayEnd.setHours(end.getHours(), end.getMinutes(), 0);
      } else {
        // 中間的天數：全天計算（8 小時）
        totalHours += 8;
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      // 計算當天的時數
      const hoursInDay = (dayEnd.getHours() + dayEnd.getMinutes() / 60) - 
                        (dayStart.getHours() + dayStart.getMinutes() / 60);
      totalHours += Math.max(0, hoursInDay);
    }
    
    // 移到下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return totalHours;
}

/**
 * 生成請假編號
 * @returns 請假編號
 */
export function generateLeaveId(): string {
  const now = Timestamp.now().toDate();
  const dateStr = format(now, 'yyyyMMdd');
  const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `LR-${dateStr}-${randomStr}`;
}

/**
 * 檢查日期是否在有效範圍內
 * @param date 要檢查的日期
 * @param startDate 開始日期
 * @param endDate 結束日期
 * @returns 是否在有效範圍內
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * 格式化日期時間
 * @param date 要格式化的日期
 * @returns 格式化的日期時間字串
 */
export function formatDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

/**
 * 格式化日期
 * @param date 要格式化的日期
 * @returns 格式化的日期字串
 */
export function formatDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 計算請假天數
 * @param startDate 開始日期
 * @param endDate 結束日期
 * @returns 請假天數
 */
export function calculateLeaveDays(startDate: Date | Timestamp, endDate: Date | Timestamp): number {
  const hours = calculateWorkingHours(startDate, endDate);
  return Math.ceil(hours / 8); // 一天以 8 小時計
} 
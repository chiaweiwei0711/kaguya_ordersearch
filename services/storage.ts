// 倉儲倒數／倉儲費 —— 整站唯一算式（瓦多 2026-09-19 定）
// 每團各自從自己的抵台日起算：抵台日＝第 0 天，免費 30 天；第 31 天起每天 5 元、直接加進尾款；
// 收費滿 90 天（抵台後第 121 天起）視為放棄。改政策改這三個常數就好，前端所有畫面跟著變。
import { Order } from '../types';

export const FREE_DAYS = 30;
export const FEE_PER_DAY = 5;
export const FEE_DAYS = 90;                       // 收費期長度
export const ABANDON_DAY = FREE_DAYS + FEE_DAYS;  // 第 121 天起視為放棄

export type StorageState = 'free' | 'soon' | 'overdue' | 'abandoned';

export interface StorageInfo {
  arrival: Date;
  freeUntil: Date;        // 最後一天免費（抵台日＋30）
  dayIndex: number;       // 今天是抵台後第幾天（抵台日＝0）
  freeLeft: number;       // 還剩幾天免費（<0 表示已逾期）
  overdueDays: number;    // 已逾期幾天（0 表示還沒逾期）
  fee: number;            // 目前累計倉儲費
  daysToAbandon: number;  // 再幾天視為放棄（逾期後才有意義）
  state: StorageState;
  label: string;          // 短標籤（卡片膠囊用）
  detail: string;         // 長說明（訂單詳情用）
  className: string;      // 膠囊配色（沿用 Soft Pop 三色）
}

// Sheet 裡的日期有 2026/9/1、2026-09-01、含時間等寫法；只取年月日、用本地午夜比，避免時區把一天算成兩天
const parseLocalDate = (s?: string): Date | null => {
  if (!s) return null;
  const m = String(s).match(/(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
  if (!m) { const d = new Date(s); return isNaN(d.getTime()) ? null : new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  return new Date(+m[1], +m[2] - 1, +m[3]);
};
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const md = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`;

export const getStorageInfo = (arrivalDate?: string, today: Date = new Date()): StorageInfo | null => {
  const arrival = parseLocalDate(arrivalDate);
  if (!arrival) return null;
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayIndex = Math.floor((t0.getTime() - arrival.getTime()) / 86400000);
  const freeLeft = FREE_DAYS - dayIndex;
  const overdueDays = Math.max(0, dayIndex - FREE_DAYS);
  const fee = Math.min(overdueDays, FEE_DAYS) * FEE_PER_DAY;
  const freeUntil = addDays(arrival, FREE_DAYS);
  const daysToAbandon = ABANDON_DAY - dayIndex;

  let state: StorageState, label: string, className: string;
  if (dayIndex >= ABANDON_DAY) {
    state = 'abandoned'; label = `逾期 ${overdueDays} 天・已達放棄期限`; className = 'bg-[#1a1a1a] text-white';
  } else if (overdueDays > 0) {
    state = 'overdue';
    label = daysToAbandon <= 7 ? `逾期 ${overdueDays} 天・再 ${daysToAbandon} 天視為放棄` : `逾期 ${overdueDays} 天・倉儲費 +$${fee}`;
    className = 'bg-[#f8a3f4] text-white';
  } else if (freeLeft <= 5) {
    state = 'soon'; label = `剩 ${freeLeft} 天免費`; className = 'bg-[#fff170] text-black';
  } else {
    state = 'free'; label = `剩 ${freeLeft} 天可併單`; className = 'bg-[#3ac0bf] text-white';
  }
  const detail = overdueDays > 0
    ? `${md(arrival)} 抵台・免費保管至 ${md(freeUntil)}・已逾期 ${overdueDays} 天，倉儲費 $${fee}（第 ${FREE_DAYS + 1} 天起每天 $${FEE_PER_DAY}）`
    : `${md(arrival)} 抵台・免費保管至 ${md(freeUntil)}・還有 ${freeLeft} 天`;
  return { arrival, freeUntil, dayIndex, freeLeft, overdueDays, fee, daysToAbandon, state, label, detail, className };
};

// 這張訂單現在要收的倉儲費（已出貨的不再變動；出貨當下的金額由後台凍結進 Sheet）
export const storageFeeOf = (order: Pick<Order, 'arrivalDate' | 'isShipped'>): number => {
  if (order.isShipped) return 0;
  return getStorageInfo(order.arrivalDate)?.fee ?? 0;
};

// 賣貨便要下單的金額＝原尾款（含二補）＋倉儲費
export const balanceWithFee = (order: Pick<Order, 'arrivalDate' | 'isShipped' | 'balanceDue'>): number =>
  order.balanceDue + storageFeeOf(order);

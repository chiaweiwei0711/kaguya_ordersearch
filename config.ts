
import { ColumnMapping } from "./types";

// ==========================================
// 設定區
// ==========================================

export const APP_CONFIG = {
  // Google Apps Script 網址
  API_URL: "https://script.google.com/macros/s/AKfycbzyWKTJDGviJrR5pBmcKSvn7ar2-FsYYuaElCUKWVOjmj5W-XvNq8G9hZgi6VrowKYx/exec", 

  // 賣貨便通用賣場連結 (當需要付尾款時，會引導顧客去這裡)
  MAIHUOBIAN_URL: "https://myship.7-11.com.tw/general/detail/GM2410034450510",

  // 官方 LINE 連結 (顯示在詳情頁)
  LINE_URL: "https://lin.ee/cfEklUi",

  // 欄位對應 (Mapping) - 對應您的 Google Sheet 標題
  COLUMN_MAPPING: {
    id: "訂單ID",
    source: "訂單來源",
    customerPhone: "社群名稱", // 使用社群名稱作為主要查詢 ID
    
    itemName: "登記商品",
    quantity: "總數量",
    groupName: "團名",
    
    // --- 金額設定 ---
    productTotal: "商品金額",   
    depositAmount: "匯款金額", 
    balanceDue: "餘款",       
    
    // --- 狀態設定 ---
    isReconciled: "對賬", // TRUE / FALSE
    isShipped: "出貨",    // TRUE / FALSE
    shippingStatus: "狀態", // e.g., 已抵台, 25天左右
    
    shippingDate: "出貨日期",
  } as ColumnMapping
};

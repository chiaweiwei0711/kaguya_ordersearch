import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem } from "../types";

// 模擬資料 (當 API 沒連上時顯示)
const MOCK_ORDERS: Order[] = [
  {
    id: "MOCK-1",
    source: "一般預購",
    customerName: "MOCK USER",
    customerPhone: "範例小美",
    groupName: "進巨三麗鷗1-3彈",
    items: [{ name: "里維大隻娃+1", price: 830, quantity: 1 }],
    totalQuantity: 1,
    productTotal: 830,
    depositAmount: 730,
    balanceDue: 100,
    status: OrderStatus.PENDING,
    shippingStatus: "已抵台",
    isShipped: false,
    shippingDate: "",
    createdAt: "2023-10-27"
  }
];

// Helper: 生成穩定的 ID (Content Hash)
// 解決 Google Sheet 行數浮動導致 ID 改變的問題
const generateStableId = (row: any, map: any): string => {
  // 將 團名 + 社群名稱 + 商品名 + 金額 串接起來當作唯一識別
  // 只要內容不改，ID 就不會變，就算插入新行數也不影響
  const rawString = `${row[map.groupName]}-${row[map.customerPhone]}-${row[map.itemName]}-${row[map.productTotal]}-${row[map.depositAmount]}`;
  
  // 簡單的 Hash 函數 (轉成 Base64)
  try {
    return btoa(unescape(encodeURIComponent(rawString))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  } catch (e) {
    return `ROW-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper: 標準化字串 (移除空白、轉小寫) 用於模糊搜尋
const normalizeString = (str: string): string => {
  if (!str) return "";
  // 移除所有空白 (space, tab, newline) 並轉小寫
  return String(str).replace(/\s+/g, '').toLowerCase();
};

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  if (!APP_CONFIG.API_URL) return MOCK_ORDERS.filter(o => o.customerPhone === query);

  try {
    // API 端還是傳送原始 query，讓 GAS 做初步篩選 (如果有的話)
    const response = await fetch(`${APP_CONFIG.API_URL}?phone=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`連線失敗 (${response.status})。請確認 Apps Script 部署為「任何人 (Anyone)」可讀取。`);
    }

    const data = await response.json();

    if (data.status === "error") {
      throw new Error(data.message || "Google Sheet 發生錯誤");
    }

    if (data.status !== "success") {
      return [];
    }

    const rawRows = data.data;
    const map = APP_CONFIG.COLUMN_MAPPING;
    const ordersMap = new Map<string, Order>();

    // 前端再次進行「強力模糊搜尋」
    // 因為 GAS 可能只是簡單的 indexOf，這裡我們把空白都拿掉再比對一次
    const normalizedQuery = normalizeString(query);

    rawRows.forEach((row: any) => {
      // 1. 檢查是否符合搜尋條件 (忽略空白)
      const customerNickName = String(row[map.customerPhone] || "");
      const normalizedTarget = normalizeString(customerNickName);
      
      // 如果搜尋字串不在目標暱稱內，且目標暱稱也不在搜尋字串內，就跳過
      if (!normalizedTarget.includes(normalizedQuery) && !normalizedQuery.includes(normalizedTarget)) {
        return; 
      }

      // 2. 生成穩定 ID
      const orderId = generateStableId(row, map);
      
      // 判斷對賬狀態 (TRUE 為已付款, FALSE/Empty 為待付款)
      const isReconciledRaw = String(row[map.isReconciled] || "").toUpperCase();
      const isReconciled = isReconciledRaw === "TRUE";
      
      // 判斷狀態
      let status = isReconciled ? OrderStatus.PAID : OrderStatus.PENDING;
      
      // 判斷出貨狀態
      const isShippedRaw = String(row[map.isShipped] || "").toUpperCase();
      const isShipped = isShippedRaw === "TRUE";

      // 金額處理
      const parseMoney = (val: any) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        return Number(String(val).replace(/[$,]/g, '')) || 0;
      };

      const productTotal = parseMoney(row[map.productTotal]);
      const balanceDue = parseMoney(row[map.balanceDue]);
      let depositAmount = parseMoney(row[map.depositAmount]);

      if (depositAmount === 0 && productTotal > 0) {
        depositAmount = productTotal - balanceDue;
      }

      const totalQuantity = Number(row[map.quantity]) || 1;

      const item: OrderItem = {
        name: String(row[map.itemName] || "代購商品"),
        price: productTotal,
        quantity: totalQuantity
      };

      if (ordersMap.has(orderId)) {
        const existing = ordersMap.get(orderId)!;
        existing.items.push(item);
      } else {
        ordersMap.set(orderId, {
          id: orderId,
          source: String(row[map.source] || ""),
          customerName: customerNickName,
          customerPhone: customerNickName,
          groupName: String(row[map.groupName] || ""),
          items: [item],
          totalQuantity: totalQuantity,
          productTotal: productTotal,
          depositAmount: depositAmount,
          balanceDue: balanceDue,
          status: status,
          shippingStatus: String(row[map.shippingStatus] || ""),
          isShipped: isShipped,
          shippingDate: String(row[map.shippingDate] || ""),
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
    });

    return Array.from(ordersMap.values());

  } catch (error: any) {
    console.error("Fetch Error:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("無法連線到資料庫。請確認 Google Apps Script URL 正確且權限為「任何人」。");
    }
    throw error;
  }
};

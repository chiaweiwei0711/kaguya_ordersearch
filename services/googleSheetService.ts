
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

// Helper 1: 強力清洗 (只保留中英數日文，移除所有符號)
const normalizeStrict = (str: string): string => {
  if (!str) return "";
  return String(str)
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\u3040-\u309f\u30a0-\u30ff]/g, '')
    .toLowerCase();
};

// Helper 2: 基本清洗 (只移除空格，保留符號) - 用於純符號暱稱
const normalizeBasic = (str: string): string => {
  if (!str) return "";
  return String(str).replace(/\s+/g, '').toLowerCase();
};

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  if (!APP_CONFIG.API_URL) return MOCK_ORDERS.filter(o => o.customerPhone === query);

  try {
    // API 端還是傳送原始 query，但我們主要依賴前端過濾
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

    // 準備搜尋鍵值
    // 1. 取得「強力清洗版」搜尋詞 (無符號)
    const queryStrict = normalizeStrict(query);
    // 2. 取得「基本清洗版」搜尋詞 (含符號，無空格)
    const queryBasic = normalizeBasic(query);

    // 如果連基本清洗後都是空的，直接回傳空
    if (!queryBasic) {
      return [];
    }

    rawRows.forEach((row: any) => {
      const customerNickName = String(row[map.customerPhone] || "");
      
      let isMatch = false;

      // --- 智慧比對邏輯 ---
      if (queryStrict.length > 0) {
        // 情境 A: 搜尋詞包含文字/數字 (例如 "Kaguya :)")
        // 使用「強力清洗」比對： DB("Kaguya ❤️") -> "kaguya" === QUERY("Kaguya :)") -> "kaguya"
        const targetStrict = normalizeStrict(customerNickName);
        if (targetStrict === queryStrict) {
          isMatch = true;
        }
      } else {
        // 情境 B: 搜尋詞全是符號 (例如 ":)")，強力清洗後變空字串
        // 使用「基本清洗」比對： DB(":)") -> ":)" === QUERY(":)") -> ":)"
        const targetBasic = normalizeBasic(customerNickName);
        if (targetBasic === queryBasic) {
          isMatch = true;
        }
      }

      if (!isMatch) {
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

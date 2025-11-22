import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem } from "../types";

// 模擬資料
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
const generateStableId = (row: any, map: any): string => {
  const rawString = `${row[map.groupName]}-${row[map.customerPhone]}-${row[map.itemName]}-${row[map.productTotal]}-${row[map.depositAmount]}`;
  try {
    return btoa(unescape(encodeURIComponent(rawString))).replace(/[^a-zA-Z0-9]/g, '').substring(0, 12);
  } catch (e) {
    return `ROW-${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Helper: 全形轉半形 (解決輸入法差異)
const toHalfWidth = (str: string) => {
  return str.replace(/[\uff01-\uff5e]/g, function(ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  }).replace(/\u3000/g, ' ');
};

// Helper: 提取核心文字 (移除符號與空白，轉小寫)
const getCoreText = (str: string) => {
  // 只保留：中文、日文(平假/片假)、英文、數字
  return str.replace(/[^\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7afa-zA-Z0-9]/g, '').toLowerCase();
};

// Helper: 檢查是否包含 CJK (中日韓)
const hasCJK = (str: string) => {
  return /[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(str);
};

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  if (!APP_CONFIG.API_URL) return MOCK_ORDERS.filter(o => o.customerPhone === query);

  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?phone=${encodeURIComponent(query)}`);
    
    if (!response.ok) {
      throw new Error(`連線失敗 (${response.status})`);
    }

    const data = await response.json();

    if (data.status !== "success") return [];

    const rawRows = data.data;
    const map = APP_CONFIG.COLUMN_MAPPING;
    const ordersMap = new Map<string, Order>();

    // 1. 處理搜尋關鍵字
    const queryHalf = toHalfWidth(query).trim(); // 轉半形
    const queryCore = getCoreText(queryHalf);    // 取核心文字 (無符號)
    const queryIsCJK = hasCJK(queryCore);        // 判斷是否含中文/日文

    // 2. 如果連核心文字都沒有 (例如只搜 ":)"), 則使用原始字串(去空白)比對
    const isSymbolSearch = queryCore.length === 0;
    const queryRawNoSpace = queryHalf.replace(/\s+/g, '').toLowerCase();

    rawRows.forEach((row: any) => {
      const customerNickName = String(row[map.customerPhone] || "");
      const targetHalf = toHalfWidth(customerNickName);
      const targetCore = getCoreText(targetHalf);
      
      let isMatch = false;

      if (isSymbolSearch) {
        // 模式 A: 純符號搜尋 (e.g. ":)")
        // 邏輯: 去除空白後完全相等
        const targetRawNoSpace = targetHalf.replace(/\s+/g, '').toLowerCase();
        if (targetRawNoSpace === queryRawNoSpace) isMatch = true;
      } else {
        if (queryIsCJK) {
          // 模式 B: 中日文模糊搜尋 (e.g. "黎黎")
          // 邏輯: 核心文字使用 Includes (包含)
          // 效果: "黎黎" 可以搜到 "黎黎:)", "黎黎二號"
          if (targetCore.includes(queryCore)) isMatch = true;
        } else {
          // 模式 C: 英文/數字精確搜尋 (e.g. "v")
          // 邏輯: 核心文字使用 Equals (相等)
          // 效果: "v" === "v" (Match), "victon" !== "v" (No Match)
          // 效果: "Kaguya" === "Kaguya" (Match "Kaguya ❤️")
          if (targetCore === queryCore) isMatch = true;
        }
      }

      if (!isMatch) return;

      // --- 以下為資料組裝 (維持不變) ---
      const orderId = generateStableId(row, map);
      const isReconciledRaw = String(row[map.isReconciled] || "").toUpperCase();
      const isReconciled = isReconciledRaw === "TRUE";
      let status = isReconciled ? OrderStatus.PAID : OrderStatus.PENDING;
      const isShippedRaw = String(row[map.isShipped] || "").toUpperCase();
      const isShipped = isShippedRaw === "TRUE";

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
      throw new Error("無法連線到資料庫。");
    }
    throw error;
  }
};

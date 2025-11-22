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

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  if (!APP_CONFIG.API_URL) return MOCK_ORDERS.filter(o => o.customerPhone === query);

  try {
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

    rawRows.forEach((row: any) => {
      // 使用原本的 ID 邏輯，若無 ID 則使用 Random
      // 注意：如果 Excel 沒有填 ID，隨機 ID 會導致勾選框在重新整理時重置，這是正常的
      const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
      
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
          customerName: String(row[map.customerPhone]),
          customerPhone: String(row[map.customerPhone]),
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

    // --- 基礎模糊搜尋邏輯 ---
    // 1. 去除搜尋關鍵字的前後空白，並轉小寫
    const normalizedQuery = query.trim().toLowerCase();

    return Array.from(ordersMap.values()).filter(o => {
        // 2. 去除資料庫暱稱的前後空白，並轉小寫
        const normalizedTarget = String(o.customerPhone).trim().toLowerCase();
        // 3. 進行完全比對 (Equal)
        // 這能確保 'v' 不會搜到 'victon'，但 'Kaguya' 能搜到 'kaguya'
        return normalizedTarget === normalizedQuery;
    });

  } catch (error: any) {
    console.error("Fetch Error:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("無法連線到資料庫。請確認 Google Apps Script URL 正確且權限為「任何人」。");
    }
    throw error;
  }
};

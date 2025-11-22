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

    // 嚴格搜尋：去除前後空白
    const exactQuery = query.trim();

    if (!exactQuery) return [];

    rawRows.forEach((row: any) => {
      const customerNickName = String(row[map.customerPhone] || "").trim();
      
      // 嚴格比對：完全一樣才算 (Case Sensitive)
      // 如果您希望 "abc" 能搜到 "ABC"，可以改成 customerNickName.toLowerCase() === exactQuery.toLowerCase()
      if (customerNickName !== exactQuery) {
        return;
      }

      // --- 資料組裝 ---
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

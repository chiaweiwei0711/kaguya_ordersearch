
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
      const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
      
      // 判斷對賬狀態 (TRUE 為已付款, FALSE/Empty 為待付款)
      const isReconciledRaw = String(row[map.isReconciled] || "").toUpperCase();
      const isReconciled = isReconciledRaw === "TRUE";
      
      // 判斷狀態
      // 這裡將 PENDING 的顯示文字改為 "尚未付款"
      let status = isReconciled ? OrderStatus.PAID : OrderStatus.PENDING;
      
      // 判斷出貨狀態 (讀取 "出貨" 欄位)
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
      // 匯款金額 (訂金) = 商品金額 - 餘款 (因為有時候匯款金額欄位可能沒填或是填錯，用算式最準，或者直接讀取)
      // 但根據您的表格，"匯款金額" 欄位是存在的，我們先讀取它
      let depositAmount = parseMoney(row[map.depositAmount]);

      // 如果匯款金額是 0 但總額 > 0 且餘款 > 0，嘗試自動回推訂金
      if (depositAmount === 0 && productTotal > 0) {
        depositAmount = productTotal - balanceDue;
      }

      const totalQuantity = Number(row[map.quantity]) || 1;

      const item: OrderItem = {
        name: String(row[map.itemName] || "代購商品"),
        price: productTotal, // 單價暫用總價顯示
        quantity: totalQuantity
      };

      if (ordersMap.has(orderId)) {
        // 處理同一訂單 ID 多筆資料的情況 (如果有)
        const existing = ordersMap.get(orderId)!;
        existing.items.push(item);
      } else {
        ordersMap.set(orderId, {
          id: orderId,
          source: String(row[map.source] || ""),
          customerName: String(row[map.customerPhone]), // 使用社群名稱
          customerPhone: String(row[map.customerPhone]),
          groupName: String(row[map.groupName] || ""),
          
          items: [item],
          totalQuantity: totalQuantity,
          
          productTotal: productTotal,
          depositAmount: depositAmount,
          balanceDue: balanceDue,
          
          status: status,
          shippingStatus: String(row[map.shippingStatus] || ""), // e.g. 已抵台
          isShipped: isShipped, // e.g. TRUE/FALSE
          shippingDate: String(row[map.shippingDate] || ""),
          
          createdAt: new Date().toISOString().split('T')[0] // 暫無日期欄位，用今日
        });
      }
    });

    return Array.from(ordersMap.values()).filter(o => o.customerPhone === query);

  } catch (error: any) {
    console.error("Fetch Error:", error);
    if (error.message === "Failed to fetch") {
      throw new Error("無法連線到資料庫。請確認 Google Apps Script URL 正確且權限為「任何人」。");
    }
    throw error;
  }
};

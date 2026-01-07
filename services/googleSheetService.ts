import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

// 重要公告判定關鍵字
const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// 🚀 核心修改：移除所有 Cache 變數，改為直接請求
export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  try {
    // 1. 如果沒有輸入，直接回傳空 (節省流量)
    if (!query.trim()) return [];

    console.log(`正在雲端搜尋: ${query} ... ☁️`);
    
    // 2. 傳送參數給後端 (?search=xxx)
    // 記得：這裡的參數名稱要跟 GAS 裡的 e.parameter.search 對應
    const url = `${APP_CONFIG.API_URL}?search=${encodeURIComponent(query.trim())}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`連線失敗 (${response.status})`);
    
    const data = await response.json();
    if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
    
    // 如果後端沒回傳 data (例如沒搜到)，就回傳空陣列
    if (!data.data) return [];

    const rawRows = data.data;
    const map = APP_CONFIG.COLUMN_MAPPING;
    const ordersMap = new Map<string, Order>();

    // 3. 資料轉換邏輯 (維持你原本的邏輯不變)
    rawRows.forEach((row: any) => {
        const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
        // 增強抓取邏輯保留
        let customerPhoneRaw = row[map.customerPhone] || row["社群名稱"] || row[1]; 
        const customerPhone = String(customerPhoneRaw || "");
        
        const isReconciled = String(row[map.isReconciled] || "").toUpperCase() === "TRUE";
        const status = isReconciled ? OrderStatus.PAID : OrderStatus.PENDING;
        const isShipped = String(row[map.isShipped] || "").toUpperCase() === "TRUE";

        const parseMoney = (val: any) => Number(String(val || 0).replace(/[$,]/g, '')) || 0;
        const productTotal = parseMoney(row[map.productTotal]);
        const balanceDue = parseMoney(row[map.balanceDue]);
        const depositAmount = parseMoney(row[map.depositAmount]) || (productTotal - balanceDue);
        const totalQuantity = Number(row[map.quantity]) || 1;
        const paymentMethod = String(row[map.paymentMethod] || row["付款方式"] || "匯款");

        const item: OrderItem = {
          name: String(row[map.itemName] || "代購商品"),
          price: productTotal,
          quantity: totalQuantity
        };

        if (ordersMap.has(orderId)) {
          ordersMap.get(orderId)!.items.push(item);
        } else {
          ordersMap.set(orderId, {
            id: orderId,
            source: String(row[map.source] || ""),
            customerName: customerPhone,
            customerPhone: customerPhone,
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
            paymentMethod: paymentMethod,
            createdAt: new Date().toISOString().split('T')[0]
          });
        }
    });

    return Array.from(ordersMap.values());

  } catch (error) {
    console.error("Fetch Error:", error);
    // 失敗時回傳空陣列，避免畫面炸開
    return [];
  }
};

// ... (fetchAnnouncements 保持原本的，不需要動，這裡就不重複貼了，請保留原本的)
// ... (incrementAnnouncementLike 保持原本的，不需要動)
// 請記得把你檔案下方原本的 fetchAnnouncements 和 incrementAnnouncementLike 留著！

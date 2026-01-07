import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

// 重要公告判定關鍵字
const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// --- 1. 訂單搜尋 (後端真實搜尋版) ---
export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  try {
    // 如果沒有輸入，直接回傳空 (節省流量)
    if (!query.trim()) return [];

    console.log(`正在雲端搜尋: ${query} ... ☁️`);
    
    // 傳送參數給後端 (?search=xxx)
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

    // 資料轉換邏輯
    rawRows.forEach((row: any) => {
        const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
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
    return [];
  }
};

// --- 2. 抓取公告 (原本的功能，補回來) ---
export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=announcements`);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== "success") return [];

    return data.data.map((item: any, index: number) => {
      const dateObj = new Date(item.date);
      const formattedDate = isNaN(dateObj.getTime()) 
        ? String(item.date || "").replace(/-/g, '/') 
        : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
      
      const title = item.title || "";
      const isImportant = IMPORTANT_KEYWORDS.some(kw => title.includes(kw));

      return {
        id: item.id || `news-${index}`,
        date: formattedDate,
        title: title,
        content: item.content || "",
        likes: Number(item.likes || 0),
        isImportant: isImportant
      };
    });
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
};

// --- 3. 公告按讚 (原本的功能，補回來，這就是報錯的原因！) ---
export const incrementAnnouncementLike = async (newsId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=like&id=${encodeURIComponent(newsId)}`, {
      method: 'POST'
    });
    const result = await response.json();
    return result.status === 'success';
  } catch (e) {
    console.error("Like API Error:", e);
    return false;
  }
};

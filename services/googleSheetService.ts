import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

// 重要公告判定關鍵字
const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// 🚀 1. 新增：用來「記住」訂單資料的變數 (快取)
let CACHED_ORDERS: Order[] | null = null;
let LAST_FETCH_TIME = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 快取有效時間：5分鐘 (5分鐘內搜尋都不用重新下載)

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  try {
    const now = Date.now();

    // 🚀 2. 檢查：如果有快取且還沒過期，就直接用記住的資料 (不用連線！)
    if (CACHED_ORDERS && (now - LAST_FETCH_TIME < CACHE_DURATION)) {
      console.log("使用快取資料 (秒搜) ⚡️");
    } else {
      // 沒有快取，或是過期了，才真的去連線下載
      console.log("重新下載資料中... 🐢");
      const response = await fetch(APP_CONFIG.API_URL);

      if (!response.ok) throw new Error(`連線失敗 (${response.status})`);
      const data = await response.json();
      if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
      if (data.status !== "success") return [];

      const rawRows = data.data;
      const map = APP_CONFIG.COLUMN_MAPPING;
      const ordersMap = new Map<string, Order>();

      rawRows.forEach((row: any) => {
        const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
        let customerPhoneRaw = row[map.customerPhone] || row["社群名稱"] || row[1]; // 增強抓取
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

      // 🚀 3. 將整理好的資料存入快取變數
      CACHED_ORDERS = Array.from(ordersMap.values());
      LAST_FETCH_TIME = now;
    }

    // 🚀 4. 前端篩選 (這裡永遠都是用記憶體裡的資料來找，所以超級快)
    // 如果 query 是空的，就回傳空陣列 (避免一開始顯示全部訂單)
    if (!query.trim()) return [];

    const normalizedQuery = query.trim().toLowerCase();
    
    // 從快取中篩選
    return (CACHED_ORDERS || []).filter(o => 
      String(o.customerPhone).trim().toLowerCase() === normalizedQuery
    );

  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

// ... (以下 fetchAnnouncements 維持不變)
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

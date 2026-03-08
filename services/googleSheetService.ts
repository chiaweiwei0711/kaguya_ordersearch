import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// --- 1. 訂單搜尋 (超級防呆嚴格過濾版) ---
export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  try {
    if (!query.trim()) return [];

    console.log(`正在雲端搜尋: ${query} ... ☁️`);
    const url = `${APP_CONFIG.API_URL}?search=${encodeURIComponent(query.trim())}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`連線失敗 (${response.status})`);
    
    const data = await response.json();
    if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
    if (!data.data) return [];

    const rawRows = data.data;
    const map = APP_CONFIG.COLUMN_MAPPING;
    const ordersMap = new Map<string, Order>();
    const queryLower = query.toLowerCase().trim();

    rawRows.forEach((row: any) => {
        const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
        
        // 🌟 【防呆機制】：只掃描所有可能裝著「社群暱稱」的欄位
        const possibleNames = [
          String(row[map.customerPhone] || ""),
          String(row["社群名稱"] || ""),
          String(row["暱稱"] || ""),
          String(row.name || ""),
          String(row[2] || ""),
          String(row[1] || "")
        ].map(s => s.toLowerCase());

        // 如果連暱稱欄位都對不上，代表是無關的訂單(例如金額剛好537)，直接丟棄！
        const isNameMatch = possibleNames.some(nameVal => nameVal.includes(queryLower));
        if (!isNameMatch) return;

        let customerPhoneRaw = row[map.customerPhone] || row["社群名稱"] || row.name || row[2] || row[1]; 
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
        const arrivalDate = String(row[map.arrivalDate] || "");

        const item: OrderItem = {
          name: String(row[map.itemName] || "代購商品"),
          price: productTotal,
          quantity: totalQuantity
        };

        if (ordersMap.has(orderId)) {
          ordersMap.get(orderId)!.items.push(item);
        } else {
          ordersMap.set(orderId, {
            id: orderId, source: String(row[map.source] || ""), customerName: customerPhone, customerPhone: customerPhone,
            groupName: String(row[map.groupName] || ""), items: [item], totalQuantity: totalQuantity, productTotal: productTotal,
            depositAmount: depositAmount, balanceDue: balanceDue, status: status, shippingStatus: String(row[map.shippingStatus] || ""),
            isShipped: isShipped, shippingDate: String(row[map.shippingDate] || ""), paymentMethod: paymentMethod, arrivalDate: arrivalDate,
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

// --- 2. 抓取公告 ---
export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=announcements`);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== "success") return [];
    return data.data.map((item: any, index: number) => {
      const dateObj = new Date(item.date);
      const formattedDate = isNaN(dateObj.getTime()) ? String(item.date || "").replace(/-/g, '/') : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
      const title = item.title || "";
      return { id: item.id || `news-${index}`, date: formattedDate, title: title, content: item.content || "", likes: Number(item.likes || 0), isImportant: IMPORTANT_KEYWORDS.some(kw => title.includes(kw)) };
    });
  } catch (error) { return []; }
};

// --- 3. 公告按讚 ---
export const incrementAnnouncementLike = async (newsId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=like&id=${encodeURIComponent(newsId)}`, { method: 'POST' });
    const result = await response.json();
    return result.status === 'success';
  } catch (e) { return false; }
};

// --- 4. 透過 LINE ID 取得會員暱稱 (自動登入用) ---
export const fetchNicknameByLineId = async (lineId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=getNickname&lineId=${encodeURIComponent(lineId)}`);
    const data = await response.json();
    if (data.status === 'success' && data.nickname) {
      return data.nickname;
    }
    return null;
  } catch (e) {
    console.error("LIFF Fetch Nickname Error:", e);
    return null;
  }
};

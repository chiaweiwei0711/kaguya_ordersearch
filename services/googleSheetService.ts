
import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

// 重要公告判定關鍵字 - 只要標題包含以下字眼就會顯示「重要」紅標籤
const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?phone=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`連線失敗 (${response.status})`);
    const data = await response.json();
    if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
    if (data.status !== "success") return [];

    const rawRows = data.data;
    const map = APP_CONFIG.COLUMN_MAPPING;
    const ordersMap = new Map<string, Order>();

    rawRows.forEach((row: any) => {
      const orderId = String(row[map.id] || `UNKNOWN-${Math.random()}`);
      let customerPhoneRaw = row[map.customerPhone] || row["社群名稱"];
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

    const normalizedQuery = query.trim().toLowerCase();
    return Array.from(ordersMap.values()).filter(o => String(o.customerPhone).trim().toLowerCase() === normalizedQuery);
  } catch (error) {
    console.error("Fetch Error:", error);
    throw error;
  }
};

export const fetchAnnouncements = async (): Promise<Announcement[]> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=announcements`);
    if (!response.ok) return [];
    const data = await response.json();
    if (data.status !== "success") return [];

    return data.data.map((item: any, index: number) => {
      const dateObj = new Date(item.date);
      const formattedDate = isNaN(dateObj.getTime()) 
        ? item.date.replace(/-/g, '/') 
        : `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;
      
      const isImportant = IMPORTANT_KEYWORDS.some(kw => item.title.includes(kw));

      return {
        id: item.id || `news-${index}`, // 優先使用試算表的 ID，若無則生成
        date: formattedDate,
        title: item.title,
        content: item.content,
        likes: Number(item.likes || 0),
        isImportant: isImportant
      };
    });
  } catch (error) {
    console.error("News Fetch Error:", error);
    return [];
  }
};

/**
 * 增加公告按讚數
 * @param newsId 公告 ID
 */
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

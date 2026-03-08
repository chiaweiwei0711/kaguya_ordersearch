import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

// 重要公告判定關鍵字
const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

fetchOrdersFromSheet

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

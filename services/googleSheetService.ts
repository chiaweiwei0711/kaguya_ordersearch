import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";

const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// 查單 GAS 偶爾會回 Google 的錯誤頁（HTML）或空回應，那不是客人沒單。
// 以前一失敗就回空陣列 → 畫面寫「目前沒有相關訂單」，客人以為單不見了（2026-09-14 吃吃案例）。
// 現在：一次請求最多等 30 秒；失敗就靜靜再打，最多 3 次；全部失敗才丟 SearchFailedError，畫面回到搜尋框請他再按一次。
export class SearchFailedError extends Error {}

const fetchOrdersRaw = async (query: string): Promise<any[]> => {
  const url = `${APP_CONFIG.API_URL}?search=${encodeURIComponent(query.trim())}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const response = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    if (!response.ok) throw new Error(`連線失敗 (${response.status})`);
    const data = await response.json();     // 回 HTML 錯誤頁時這行會丟錯 → 交給外面重試
    if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
    return Array.isArray(data.data) ? data.data : [];
  } finally { clearTimeout(timer); }
};

// --- 1. 訂單搜尋 (超級防呆嚴格過濾版) ---
export const fetchOrdersFromSheet = async (query: string): Promise<Order[]> => {
  if (!query.trim()) return [];
  console.log(`正在雲端搜尋: ${query} ... ☁️`);
  let rawRows: any[] | null = null;
  let lastErr: any = null;
  for (let attempt = 0; attempt < 3 && rawRows === null; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 800 * attempt));
    try { rawRows = await fetchOrdersRaw(query); }
    catch (e) { lastErr = e; console.warn(`查單第 ${attempt + 1} 次沒成功，重試`, e); }
  }
  if (rawRows === null) throw new SearchFailedError(String((lastErr && lastErr.message) || lastErr || "search failed"));
  try {
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
      const domesticShipping = parseMoney(row[map.domesticShipping]);
      const internationalShipping = parseMoney(row[map.internationalShipping]);
      const notes = String(row[map.notes] || "").trim();

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
          domesticShipping: domesticShipping, internationalShipping: internationalShipping, notes: notes,
          createdAt: new Date().toISOString().split('T')[0]
        });
      }
    });
    return Array.from(ordersMap.values());
  } catch (error) {
    console.error("解析訂單資料失敗:", error);   // 資料格式問題才會到這裡（連線問題已在上面重試過），照舊回空
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
// --- 💖 傳送按讚訊號給 GAS 後台 (完美對接版) ---
export const incrementAnnouncementLike = async (newsId: string) => {
  try {
    // 💡 配合 GAS 的 doPost，必須使用 POST 方法
    // 💡 必須使用 URLSearchParams，這樣 GAS 的 e.parameter 才抓得到資料！
    const response = await fetch(APP_CONFIG.API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        type: 'like',     // 🎯 對應妳 GAS 裡的 type === "like"
        id: newsId        // 🎯 傳送 "news-0", "news-1" 給後端解析
      })
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('按讚 API 呼叫失敗:', error);
    throw error;
  }
};

// --- 4. 透過 LINE ID 取得會員暱稱 (自動登入用) ---
export const fetchNicknameByLineId = async (lineId: string): Promise<string | null> => {
  try {
    const response = await fetch(`${APP_CONFIG.API_URL}?type=getNickname&lineId=${encodeURIComponent(lineId)}`);
    const data = await response.json();

    if (data.status === 'success' && data.nickname) {
      return data.nickname;
    }
    // 沒綁定是正常情況（讓他自己打暱稱查），不能跳 alert 嚇客人（2026-08-09 只改了 App.tsx，這裡漏掉）
    console.warn('[LIFF] 查綁定暱稱：', data && data.message);
    return null;
  } catch (e) {
    console.warn('[LIFF] 查綁定暱稱連線失敗：', String(e));
    return null;
  }
};

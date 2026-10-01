import { APP_CONFIG } from "../config";
import { Order, OrderStatus, OrderItem, Announcement } from "../types";
import { gasGet } from "./edge";
import { setFeeEnabled } from "./storage";

const IMPORTANT_KEYWORDS = ["重要", "通知", "延遲", "公告", "提醒", "緊急", "注意"];

// 查單 GAS 偶爾會回 Google 的錯誤頁（HTML）或空回應，那不是客人沒單。
// 以前一失敗就回空陣列 → 畫面寫「目前沒有相關訂單」，客人以為單不見了（2026-09-14 吃吃案例）。
// 現在：一次請求最多等 30 秒；失敗就靜靜再打，最多 3 次；全部失敗才丟 SearchFailedError，畫面回到搜尋框請他再按一次。
export class SearchFailedError extends Error {}

const fetchOrdersRaw = async (query: string): Promise<any[]> => {
  // 先走 Netlify 邊緣快取（60 秒），失敗才直接打 GAS；回 HTML 錯誤頁會丟錯 → 交給外面重試
  const data = await gasGet("query", { search: query.trim() }, { timeoutMs: 30000 });
  if (data.status === "error") throw new Error(data.message || "Google Sheet 發生錯誤");
  // 倉儲費開關跟著每次查單回來（後台選單一按就變），沒帶就當關著
  setFeeEnabled(data.feeOn === true);
  return Array.isArray(data.data) ? data.data : [];
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
          orderKey: String(row["訂單鍵"] || ""),
          // 後台免除／改過的倉儲費。空字串＝沒動過（要照算），0＝真的被清 0，兩者不能混為一談
          storageFeeAdjust: (row["倉儲費調整"] === "" || row["倉儲費調整"] === null || row["倉儲費調整"] === undefined)
            ? undefined : Number(row["倉儲費調整"]),
          // 已在賣貨便下單的日子：倉儲費凍結在這天（後台賣貨便核對也是這樣算），網站要顯示「已下單」
          placedDate: String(row["下單日期"] || ""),
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
    const data = await gasGet("query", { type: "announcements" }, { timeoutMs: 15000 });   // 邊緣快取 5 分鐘
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

// --- 3.5 下單意向：跳去賣貨便之前，先把「他勾了哪幾筆」記給後台 ---
// 以前是等瓦多匯入賣貨便 xlsx 之後「用金額反推」客人付了哪幾團 —— 那本來就是猜的：
// 很多團尾款都是 100，湊得出好幾組解；退而求其次靠客人貼的明細，但賣貨便有字數限制、
// 買多的人貼不全，而且是靜默失敗（後台不會知道自己猜錯）。
// 改成按下按鈕的當下就把答案送出去，比對時直接查。
//
// 刻意做成「送不出去也不擋跳轉」：這只是讓後台比對更準，不是付款流程的一環，
// 絕對不能因為這支 API 慢或掛掉就讓客人下不了單。
export const reportShipIntent = async (
  nick: string,
  orders: { orderKey?: string; groupName: string }[],
  amount: number
): Promise<void> => {
  try {
    const keys = orders.map(o => (o.orderKey || "").trim()).filter(Boolean);
    if (!nick || keys.length === 0) return;            // 舊單沒有訂單鍵就不送，後台會退回推論
    const groups = orders.map(o => o.groupName).join("、").slice(0, 300);
    await fetch(APP_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        type: "shipIntent",
        nick,
        keys: keys.join(","),
        amount: String(Math.round(amount)),
        groups,
      }),
      keepalive: true,        // 送出後馬上跳轉去賣貨便，要讓請求在頁面卸載後還能送完
    });
  } catch (e) {
    console.warn("[下單意向] 送出失敗，後台會退回用金額推論：", e);
  }
};

// --- 4. 透過 LINE ID 取得會員暱稱 (自動登入用) ---
export const fetchNicknameByLineId = async (lineId: string): Promise<string | null> => {
  try {
    const data = await gasGet("query", { type: "getNickname", lineId }, { timeoutMs: 15000 });   // 邊緣快取 2 分鐘

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

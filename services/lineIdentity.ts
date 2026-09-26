// LINE 身分（LIFF）—— 填單頁用來認客人：自動帶入綁定暱稱，外面來的人給一顆「用 LINE 登入」。
//
// 客人進站的路不只一條，而且不是每條都拿得到身分，所以這支把情況分成三種：
//   ready       已經有身分（官賴點進來、或按過登入）→ 直接帶暱稱
//   can-login   LIFF 起得來但還沒登入（外部瀏覽器、IG／Threads 點進來）→ 可以請他按登入
//   unavailable LIFF 根本起不來（社群 OpenChat 點一般網址、init 失敗）→ 什麼都不做，維持手打
//
// 鐵則：瀏覽商品永遠不擋、永遠不跳錯誤視窗。2026-08 踩過一次——init 失敗的錯誤視窗
// 把從社群點進來的客人擋在填單頁前面，所以 unavailable 這條一定要安靜。
import liff from "@line/liff";
import { fetchNicknameByLineId } from "./googleSheetService";

// 正式 LIFF。要在本機或臨時網址測登入時，建一個「開發用 LIFF」把它的 Endpoint 指到那個網址，
// 然後在 .env.local 寫 VITE_LIFF_ID=<開發用 LIFF ID> 就好——不要去改正式 LIFF 的 Endpoint，
// 那會讓線上客人的登入跳到開發網址。
export const LIFF_ID = (import.meta as any).env?.VITE_LIFF_ID || "2009367290-DGz77pHN";

export type LineStatus = "ready" | "can-login" | "unavailable";

export interface LineIdentity {
  status: LineStatus;
  inClient?: boolean;         // 在 LINE App 裡面開的（社群／官賴點進來）＝自己人，送出前不擋
  userId?: string;
  nickname?: string | null;   // 會員表查到的社群暱稱；登入了但沒綁定就是 null
}

// 一個 session 只問一次，多個元件共用同一個結果
let cached: Promise<LineIdentity> | null = null;

export const getLineIdentity = (): Promise<LineIdentity> => {
  if (cached) return cached;
  cached = (async () => {
    try {
      await liff.init({ liffId: LIFF_ID });
      const inClient = (() => { try { return liff.isInClient(); } catch { return false; } })();
      if (!liff.isLoggedIn()) return { status: "can-login", inClient };
      const profile = await liff.getProfile();
      const nickname = await fetchNicknameByLineId(profile.userId);
      return { status: "ready", inClient, userId: profile.userId, nickname };
    } catch (e) {
      // 社群點進來會走到這裡。預期中的情況，不是錯誤 → 只留 console，畫面什麼都不做。
      console.warn("[LIFF] 拿不到 LINE 身分，填單頁維持手打暱稱：", String(e));
      return { status: "unavailable" };
    }
  })();
  return cached;
};

// 是不是官方帳號的好友（要先登入才問得到）。
// 查不出來就回 null → 呼叫端當作「不擋」，寧可放一單過去，也不要把付錢的客人鎖在外面。
export const checkFriendship = async (): Promise<boolean | null> => {
  try {
    const r = await liff.getFriendship();
    return !!r.friendFlag;
  } catch (e) {
    console.warn("[LIFF] 查好友狀態失敗，不擋：", String(e));
    return null;
  }
};

// 登出：家人共用手機、或想換帳號時用。登出後這個 session 的身分快取也要清掉。
export const logoutLine = () => {
  try { liff.logout(); } catch (e) { console.warn("[LIFF] 登出失敗：", String(e)); }
  cached = null;
  window.location.reload();
};

// 請客人登入：登入完回到他原本在看的那一團（不會被丟回首頁）
// Add friend option 設成 aggressive 時，授權畫面會順便問要不要加官方帳號好友。
export const loginWithLine = () => {
  try {
    liff.login({ redirectUri: window.location.href });
  } catch (e) {
    console.warn("[LIFF] 無法啟動登入：", String(e));
  }
};

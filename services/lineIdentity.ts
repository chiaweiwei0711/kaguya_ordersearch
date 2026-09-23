// LINE 身分（LIFF）—— 填單頁用來「自動帶入客人綁定的暱稱」，讓他不用再手打一次。
//
// 為什麼不強制登入：客人進站的路不只一條，而且不是每條都拿得到 LIFF 身分——
//   官賴（1:1 聊天）點連結 → liff.init 成功，拿得到 userId
//   社群（OpenChat）點連結 → liff.init 會失敗（2026-08 踩過：錯誤視窗把客人擋在填單頁前面）
//   外部瀏覽器／電腦   → 沒登入，拿不到
// 所以這支的原則是「拿得到就順手帶入，拿不到完全安靜」，永遠不擋人、不跳錯誤視窗。
import liff from "@line/liff";
import { fetchNicknameByLineId } from "./googleSheetService";

const LIFF_ID = "2009367290-DGz77pHN";   // 與查單頁同一個 LIFF（App.tsx）

export interface LineIdentity {
  userId: string;
  nickname: string | null;   // 會員表查到的社群暱稱；沒綁定就是 null
}

// 一個 session 只問一次，多個元件共用同一個結果
let cached: Promise<LineIdentity | null> | null = null;

export const getLineIdentity = (): Promise<LineIdentity | null> => {
  if (cached) return cached;
  cached = (async () => {
    try {
      await liff.init({ liffId: LIFF_ID });
      if (!liff.isLoggedIn()) return null;            // 外部瀏覽器沒登入＝正常，不主動導去登入
      const profile = await liff.getProfile();
      const nickname = await fetchNicknameByLineId(profile.userId);
      return { userId: profile.userId, nickname };
    } catch (e) {
      // 社群點進來會走到這裡。這是預期中的情況，不是錯誤 → 只留 console，畫面什麼都不做。
      console.warn("[LIFF] 拿不到 LINE 身分，填單頁維持手打暱稱：", String(e));
      return null;
    }
  })();
  return cached;
};

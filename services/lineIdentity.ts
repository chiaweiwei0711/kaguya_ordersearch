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
import { APP_CONFIG } from "../config";
import { gasGet } from "./edge";

// LIFF 一個 app 只能綁一個 Endpoint，而 LINE 會拿網址去比對——網址對不上就直接 400。
// 所以正式站與測試站必須是兩個不同的 LIFF app。
// 這裡用「網域」在執行時決定用哪一個：同一份 build 上正式站用正式 LIFF、
// 上 netlify.app 預覽站用開發 LIFF。不能用 build 時的環境變數，因為預覽與正式是同一次 build。
const PROD_LIFF_ID = "2009367290-DGz77pHN";
// 開發用 LIFF：Endpoint 指到 main--kaguyagoods-order-search.netlify.app（2026-09-26 建）
// LIFF ID 不是機密（本來就會打包進前端），直接寫死比設環境變數簡單，
// 而且下面的網域判斷保證正式站永遠不會用到它。
const DEV_LIFF_ID = (import.meta as any).env?.VITE_LIFF_ID || "2009367290-c5lGu3Xc";

export const LIFF_ID = (() => {
  try {
    const h = window.location.hostname;
    if (h.endsWith(".netlify.app") && DEV_LIFF_ID) return DEV_LIFF_ID;
  } catch (_) {}
  return PROD_LIFF_ID;
})();

export type LineStatus = "ready" | "can-login" | "unavailable";

export interface LineIdentity {
  status: LineStatus;
  inClient?: boolean;         // 在 LINE App 裡面開的（社群／官賴點進來）＝自己人，送出前不擋
  userId?: string;
  nickname?: string | null;   // 會員表查到的社群暱稱；登入了但沒綁定就是 null
  displayName?: string;       // LINE 本名 —— 讓客人一眼確認「這是我的 LINE 帳號沒錯」
  picture?: string;           // LINE 大頭貼
}

// 一個 session 只問一次，多個元件共用同一個結果
let cached: Promise<LineIdentity> | null = null;

// ── 身分變了要通知畫面（配對領到卡、卡被判無效…）。各頁收到就重問一次身分 ──
const identitySubs = new Set<() => void>();
export const onIdentityChange = (cb: () => void) => { identitySubs.add(cb); return () => { identitySubs.delete(cb); }; };
const notifyIdentity = () => { cached = null; identitySubs.forEach((f) => { try { f(); } catch { /* 單一頁出錯不影響別頁 */ } }); };

// ── 會員卡（2026-10-02，瓦多 9/30 拍板 B）──
// LINE 只用來「認人」一次：登入成功就拿 LIFF token 去 api-script 換一張 90 天的卡（type=session），
// 之後來訪先看卡，不再靠 LIFF 那個 12 小時就過期的登入。卡每天來訪會自動換新（往後推 90 天）。
// 卡由 GAS 簽名，前端改不了內容；卡只用來帶暱稱，安全性跟打暱稱查單等價。
const CARD_KEY = "kg_session";
const DAY = 24 * 3600 * 1000;
interface Card { u: string; n: string; d?: string; p?: string; iat: number; exp: number }
interface Stored { token: string; card: Card }
const readCard = (): Stored | null => {
  try {
    const s = JSON.parse(localStorage.getItem(CARD_KEY) || "null");
    if (s && typeof s.token === "string" && s.card && s.card.u && s.card.exp > Date.now()) return s;
  } catch { /* 讀不到就當沒卡 */ }
  return null;
};
const saveCard = (token: string, card: Card) => { try { localStorage.setItem(CARD_KEY, JSON.stringify({ token, card })); } catch { /* 存不了下次就再登一次 */ } };
const clearCard = () => { try { localStorage.removeItem(CARD_KEY); } catch { /* */ } };

// 會員卡走 POST 直打 GAS（不經邊緣快取：token 不能出現在網址上，也不能被快取）
const postSession = async (params: Record<string, string>): Promise<any> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const r = await fetch(APP_CONFIG.API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ type: "session", ...params }),
      signal: ctrl.signal,
    });
    return JSON.parse(await r.text());
  } catch (e) {
    console.warn("[會員卡] 連線失敗：", String(e));
    return null;
  } finally { clearTimeout(t); }
};

// ── 配對登入：主畫面 web app 用 ──
// iPhone 主畫面的 web app 收不到 LINE 登入的回程（LINE 一律送回 Safari），而且跟 Safari 的儲存空間不通。
// 做法：web app 產一組配對碼、開瀏覽器去登入（網址帶 ?kgpair=），瀏覽器那邊登好就把卡交給 GAS 暫放 10 分鐘，
// web app 每幾秒問一次「登好了沒」，領到卡就自己變成已登入——客人切回 web app 就好，不用再按。
const PAIR_KEY = "kg_pair";
const PAIR_TTL = 10 * 60 * 1000;
export type PairState = null | "waiting" | "handed" | "failed";
let pairState: PairState = null;
const pairSubs = new Set<(s: PairState) => void>();
export const subscribePair = (cb: (s: PairState) => void) => { pairSubs.add(cb); cb(pairState); return () => { pairSubs.delete(cb); }; };
const setPairState = (s: PairState) => { pairState = s; pairSubs.forEach((f) => f(s)); };

// 瀏覽器這一端：網址上的配對碼。要在任何「清網址」之前讀走，所以一載入就讀。
const URL_PAIR = (() => {
  try { const p = new URLSearchParams(window.location.search).get("kgpair") || ""; return /^[a-f0-9]{32}$/.test(p) ? p : ""; } catch { return ""; }
})();
let pairHanded = false;
// 卡發好之後，如果這頁是被 web app 叫來登入的，就順便把卡交出去
const handPair = (r: any) => {
  if (!URL_PAIR || pairHanded) return;
  pairHanded = true;
  setPairState(r && r.status === "success" ? "handed" : "failed");
};

const isStandalone = () => {
  try { return (navigator as any).standalone === true || window.matchMedia("(display-mode: standalone)").matches; } catch { return false; }
};
const readPair = (): { p: string; t: number } | null => {
  try {
    const s = JSON.parse(localStorage.getItem(PAIR_KEY) || "null");
    if (s && /^[a-f0-9]{32}$/.test(s.p) && Date.now() - s.t < PAIR_TTL) return s;
    if (s) localStorage.removeItem(PAIR_KEY);
  } catch { /* */ }
  return null;
};
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let polling = false;
const pollPair = async () => {
  clearTimeout(pollTimer);
  const pr = readPair();
  if (!pr) { if (pairState === "waiting") setPairState(null); return; }
  if (polling) return;
  if (document.visibilityState === "visible") {
    polling = true;
    try {
      const r = await gasGet("query", { type: "pairPoll", pair: pr.p }, { timeoutMs: 15000 });
      if (r && r.status === "success" && r.token && r.card) {
        saveCard(r.token, r.card);
        try { localStorage.removeItem(PAIR_KEY); } catch { /* */ }
        setPairState(null);
        notifyIdentity();
        return;
      }
    } catch (e) { console.warn("[配對] 這次沒問到，等等再問：", String(e)); }
    finally { polling = false; }
  }
  pollTimer = setTimeout(pollPair, 3000);
};
if (typeof document !== "undefined") {
  // 客人從 Safari 切回 web app 的那一刻馬上問，不用等下一輪
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && pairState === "waiting") pollPair(); });
}
const openPairBrowser = (p: string) => {
  const u = new URL(loginRedirectUri());
  u.searchParams.set("kgpair", p);
  window.open(u.toString(), "_blank");
};
const startPairing = () => {
  const p = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  try { localStorage.setItem(PAIR_KEY, JSON.stringify({ p, t: Date.now() })); } catch { /* */ }
  openPairBrowser(p);
  setPairState("waiting");
  pollPair();
};
// 提示條上的「重新開啟」：同一組配對碼再開一次瀏覽器（客人不小心關掉時用）
export const reopenPairing = () => { const pr = readPair(); if (pr) openPairBrowser(pr.p); else startPairing(); };
export const cancelPairing = () => {
  try { localStorage.removeItem(PAIR_KEY); } catch { /* */ }
  clearTimeout(pollTimer);
  setPairState(null);
};
export const dismissPairNotice = () => setPairState(null);

// 「按兩次才登得進去」（2026-10-02 查明）：
// LIFF 按登入時會把一張暫存（code verifier）存在「按的那個瀏覽器」裡，
// 但手機上 LINE 會先跳 LINE app 確認，再用系統預設瀏覽器（iPhone＝Safari）把人送回來。
// 從主畫面 web app、IG／Threads、Chrome 按的，回來的 Safari 裡沒有那張暫存 → LIFF 安靜放棄，看起來只是重整一下；
// 第二次是在 Safari 裡按的，暫存跟回程同一個瀏覽器才成功。
// 所以：回程網址上有 LINE 給的 code、卻沒登入成功，就在這個瀏覽器自動再發起一次，客人只要按一次。
// 被 web app 叫來登入的分頁（帶 kgpair）也是一打開就自動發起登入。
// 防無限迴圈：3 分鐘內最多自動 2 次。記在 localStorage——LINE app 送回來常是新分頁，sessionStorage 會歸零。
const RETRY_KEY = "kg_liff_autoretry";
const isLineReturn = () => {
  try { const q = new URLSearchParams(window.location.search); return q.has("code") && q.has("liffClientId"); } catch { return false; }
};
const mayAutoRetry = (): boolean => {
  try {
    const s = JSON.parse(localStorage.getItem(RETRY_KEY) || "null");
    const fresh = s && Date.now() - s.t < 3 * 60 * 1000;
    const n = fresh ? s.n : 0;
    if (n >= 2) return false;
    localStorage.setItem(RETRY_KEY, JSON.stringify({ n: n + 1, t: fresh ? s.t : Date.now() }));
    return true;
  } catch { return false; }
};
// 登入完要回來的網址：目前這頁，但拿掉上一輪的 OAuth 參數（帶著舊 code 回來會被當成又一次回程）。kgpair 要留著。
const loginRedirectUri = () => {
  try {
    const u = new URL(window.location.href);
    ["code", "state", "liffClientId", "liffRedirectUri", "liff.state"].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch { return window.location.href; }
};

export const getLineIdentity = (): Promise<LineIdentity> => {
  if (cached) return cached;
  cached = (async () => {
    const stored = readCard();
    let inited = false;
    try { await liff.init({ liffId: LIFF_ID }); inited = true; }
    catch (e) { console.warn("[LIFF] init 失敗：", String(e)); }
    const inClient = inited && (() => { try { return liff.isInClient(); } catch { return false; } })();

    // ① LINE 認得他（LINE 裡面開、或剛登入回來）→ 以 LINE 為準，順手把卡發好／換好（背景跑，不擋畫面）
    if (inited && liff.isLoggedIn()) {
      try {
        const profile = await liff.getProfile();
        const same = stored && stored.card.u === profile.userId;
        if (!same || (URL_PAIR && !pairHanded)) {
          const at = liff.getAccessToken();
          if (at) postSession({ accessToken: at, ...(URL_PAIR ? { pair: URL_PAIR } : {}) }).then((r) => {
            if (r && r.status === "success") saveCard(r.token, r.card);
            handPair(r);
          });
        }
        const nickname = same && stored!.card.n ? stored!.card.n : await fetchNicknameByLineId(profile.userId);
        return { status: "ready", inClient, userId: profile.userId, nickname, displayName: profile.displayName, picture: profile.pictureUrl };
      } catch (e) {
        // 外部瀏覽器的 LIFF 登入只撐 12 小時：過期後 isLoggedIn() 還是 true，但拿不到資料 → 往下看卡
        console.warn("[LIFF] LINE 登入已過期：", String(e));
      }
    }

    // ② 手上有卡 → 直接認出來。卡發出超過一天、或還沒綁暱稱，就背景問 GAS 換新卡（驗簽＋續期＋更新暱稱）
    if (stored) {
      const c = stored.card;
      if ((URL_PAIR && !pairHanded) || !c.n || Date.now() - c.iat > DAY) {
        postSession({ token: stored.token, ...(URL_PAIR && !pairHanded ? { pair: URL_PAIR } : {}) }).then((r) => {
          if (r && r.status === "success") {
            saveCard(r.token, r.card);
            if (r.card.n !== c.n) notifyIdentity();          // 暱稱變了（剛綁定）→ 畫面重問一次
          } else if (r && r.message === "invalid") {
            clearCard(); notifyIdentity();                    // 卡不合法 → 丟掉，畫面回到「用 LINE 登入」
          }
          handPair(r);
        });
      }
      return { status: "ready", inClient, userId: c.u, nickname: c.n || null, displayName: c.d, picture: c.p };
    }

    // 社群點進來（LIFF 起不來）也沒卡：預期中的情況，不是錯誤 → 安靜維持手打。
    if (!inited) return { status: "unavailable" };

    // ③ 還沒登入。剛從 LINE 回來卻沒成功、或是被 web app 叫來登入的分頁 → 自動發起一次
    if ((isLineReturn() || URL_PAIR) && mayAutoRetry()) {
      try { liff.login({ redirectUri: loginRedirectUri() }); } catch (e) { console.warn("[LIFF] 自動登入啟動失敗：", String(e)); }
      // 頁面正在跳去 LINE：畫面維持「確認身分中」，萬一沒跳走，8 秒後才給登入鈕
      await new Promise((r) => setTimeout(r, 8000));
    }
    return { status: "can-login", inClient };
  })();
  return cached;
};

// 重新問一次身分（丟掉這個 session 的快取）。
// 用在「從 bfcache 還原」的時候：客人在別頁按過登入，返回上一頁時瀏覽器會把整頁狀態原封還原，
// 畫面於是又長出「用 LINE 登入」——其實他早就登入了，只是那份 React state 是登入前的。
export const refreshLineIdentity = (): Promise<LineIdentity> => {
  cached = null;
  return getLineIdentity();
};

// 登入回來後把網址上的 OAuth 參數清掉（code / state / liffClientId…）。
// 不清的話網址很醜，重新整理還會拿舊的 code 再跑一次授權流程。
export const cleanLineRedirectParams = () => {
  try {
    const u = new URL(window.location.href);
    // 只在 liff.init() 之後呼叫；LIFF 靠 code/state 換 token，提早清掉會讓登入無聲失敗。
    // kgpair 一載入就被讀走了（URL_PAIR），這裡清掉沒關係
    const junk = ['code', 'state', 'liffClientId', 'liffRedirectUri', 'liff.state', 'kgpair'];
    let hit = false;
    junk.forEach((k) => { if (u.searchParams.has(k)) { u.searchParams.delete(k); hit = true; } });
    if (hit) window.history.replaceState(window.history.state, '', u.pathname + (u.search === '?' ? '' : u.search) + u.hash);
    return hit;
  } catch { return false; }
};

// 是不是官方帳號的好友（要先登入才問得到）。
// 查不出來就回 null → 呼叫端當作「不擋」，寧可放一單過去，也不要把付錢的客人鎖在外面。
// 只靠會員卡認出來的人（LINE 登入已過期）問不到，也是回 null 不擋。
export const checkFriendship = async (): Promise<boolean | null> => {
  try {
    const r = await liff.getFriendship();
    return !!r.friendFlag;
  } catch (e) {
    console.warn("[LIFF] 查好友狀態失敗，不擋：", String(e));
    return null;
  }
};

// 登出：家人共用手機、或想換帳號時用。卡也一起丟掉，登出後這個 session 的身分快取也要清掉。
export const logoutLine = () => {
  clearCard();
  try { localStorage.removeItem(PAIR_KEY); } catch { /* */ }
  try { liff.logout(); } catch (e) { console.warn("[LIFF] 登出失敗：", String(e)); }
  cached = null;
  window.location.reload();
};

// 請客人登入：登入完回到他原本在看的那一團（不會被丟回首頁）
// Add friend option 設成 aggressive 時，授權畫面會順便問要不要加官方帳號好友。
// 主畫面 web app 收不到回程 → 改走配對登入（見上面）。
export const loginWithLine = () => {
  if (isStandalone()) { startPairing(); return; }
  try {
    // 過期的舊登入先清掉，不然 LIFF 以為已登入、按了沒反應
    if (liff.isLoggedIn()) liff.logout();
    liff.login({ redirectUri: loginRedirectUri() });
  } catch (e) {
    console.warn("[LIFF] 無法啟動登入：", String(e));
  }
};

// web app 被系統關掉再打開：配對還沒過期就接著等
if (typeof window !== "undefined" && readPair() && !readCard()) { setPairState("waiting"); pollPair(); }

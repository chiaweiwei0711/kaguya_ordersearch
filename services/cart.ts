// 選購清單（跨團暫存）
//
// 為什麼不是「購物車」的一般作法：我們沒有結帳。填單送出之後是手動打訂單 →
// 查詢 → 付款 → 到貨下單，錢不在網站上收。所以這裡的清單只是「還沒送出的填單」，
// 送出時仍然是一團一筆寫進收單表（後端完全不動）。
//
// 一律用「團代號」當 key，絕不用團名：團名在後台會被改、會加註記，
// 2026-09 的「尚未結單」誤判就是栽在團名字串比對。
import { GroupTeam, GroupCartItem } from "../types";

export interface CartTeam {
  code: string;
  name: string;
  closeAt: string;
  cover?: string;
  items: GroupCartItem[];
  pay: string;
  addedAt: number;
}

const KEY = "kgy_cart_v1";
const listeners = new Set<() => void>();

export const loadCart = (): Record<string, CartTeam> => {
  try {
    const raw = localStorage.getItem(KEY);
    const m = raw ? JSON.parse(raw) : {};
    return m && typeof m === "object" ? m : {};
  } catch { return {}; }
};

const write = (m: Record<string, CartTeam>) => {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { console.warn("[cart] 寫入失敗：", String(e)); }
  listeners.forEach((f) => { try { f(); } catch (_) {} });
};

// 同一團再加入＝整組覆蓋（客人回到那一團改數量，看到的就是他現在選的）
export const putTeam = (team: GroupTeam, items: GroupCartItem[], pay: string, cover?: string) => {
  const m = loadCart();
  if (!items.length) delete m[team.code];
  else m[team.code] = { code: team.code, name: team.name, closeAt: team.closeAt, cover, items, pay, addedAt: Date.now() };
  write(m);
};

export const removeTeam = (code: string) => { const m = loadCart(); delete m[code]; write(m); };
export const removeTeams = (codes: string[]) => { const m = loadCart(); codes.forEach((c) => delete m[c]); write(m); };
export const clearCart = () => write({});

export const teamInCart = (code: string): CartTeam | undefined => loadCart()[code];
export const cartTeams = (): CartTeam[] => Object.values(loadCart()).sort((a, b) => a.addedAt - b.addedAt);
export const cartTeamCount = () => Object.keys(loadCart()).length;
export const cartItemCount = () => cartTeams().reduce((s, t) => s + t.items.reduce((n, i) => n + i.qty, 0), 0);
export const cartTotal = (t: CartTeam) => t.items.reduce((s, i) => s + i.qty * i.price, 0);

export const subscribeCart = (cb: () => void) => {
  listeners.add(cb);
  // 另一個分頁也在改 → 跟著更新
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb(); };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
};

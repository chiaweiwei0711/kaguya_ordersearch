import { APP_CONFIG } from "../config";

// 讀取一律先走 Netlify 邊緣快取（netlify/edge-functions/gas.js），失敗才直接打 GAS。
// 呼叫端自己的重試邏輯照舊；本機開發（localhost）沒有這層，直接打 GAS。
export type Upstream = "order" | "query";
const EDGE: Record<Upstream, string> = { order: "/api/order", query: "/api/query" };
const DIRECT: Record<Upstream, string> = { order: APP_CONFIG.ORDER_API_URL, query: APP_CONFIG.API_URL };
const isLocal = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

export interface GasOpts { timeoutMs?: number; fresh?: boolean }

const fetchJson = async (url: string, ms: number): Promise<any> => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    const txt = await r.text();
    let d: any;
    try { d = JSON.parse(txt); } catch { throw new Error("non-json"); }     // GAS 錯誤頁／HTML → 丟錯給呼叫端重試
    if (!d || typeof d !== "object") throw new Error("bad response");
    if (r.status >= 500) throw new Error("edge " + r.status);                 // 邊緣層說 Google 沒回 → 退回直打
    if (r.status === 404 && d.message === "not found") throw new Error("no-edge");
    return d;
  } finally { clearTimeout(t); }
};

export const gasGet = async (up: Upstream, params: Record<string, string>, opts: GasOpts = {}): Promise<any> => {
  const ms = opts.timeoutMs ?? 20000;
  const qs = new URLSearchParams(params);
  if (!isLocal) {
    const q2 = new URLSearchParams(qs);
    if (opts.fresh) q2.set("fresh", "1");
    try { return await fetchJson(`${EDGE[up]}?${q2.toString()}`, ms); }
    catch (e) { console.warn("[edge] 退回直接打 GAS：", String(e)); }
  }
  return await fetchJson(`${DIRECT[up]}?${qs.toString()}`, ms);
};

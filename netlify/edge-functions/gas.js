// Netlify 邊緣快取層（2026-09-17 第一階段）
// 客人「讀」資料先來這裡：/api/order → 收單 GAS、/api/query → 查單 GAS。
// 為什麼：Google Apps Script 的入口（script.google.com 那兩跳）晚上常一波卡 8～60 秒、或直接回錯誤頁，
//         程式本身只要 0.5 秒。這層把 Google 的答案記在 Netlify 的 CDN 上 20～300 秒（各接口不同），
//         期間所有人直接拿、不用再敲 Google；過期後先給舊的、背景再去拿新的（stale-while-revalidate）。
// 不經過這層的：送單、付款回報、按讚（都是 POST 寫入）、我的 Mac 的重印／預溫／探測。
// ?fresh=1 ＝ 這一次不要快取（客人剛送完單看自己的人數／填單明細用）。
const UPSTREAM = {
  "/api/order": "https://script.google.com/macros/s/AKfycbyHf4PKNb8GHBJKSmBkQUKr-3Oc1lilpg55eNQFmHQJmKhONdGNFj7R0C3GyUfL1Y_u-Q/exec",
  "/api/query": "https://script.google.com/macros/s/AKfycbzyWKTJDGviJrR5pBmcKSvn7ar2-FsYYuaElCUKWVOjmj5W-XvNq8G9hZgi6VrowKYx/exec",
};
// 每種資料可以讓所有人共用幾秒（0＝不快取）
const TTL = {
  "/api/order": { live: 20, teamStat: 20, itemStats: 20, stats: 30, teamItems: 60, listTeams: 60, "pre-orderform": 60 },
  "/api/query": { search: 60, checkNick: 60, getNickname: 120, announcements: 300 },
};
const UPSTREAM_TIMEOUT_MS = 26000;   // Google 卡波時最多等這麼久；等不到回 504，前端會自己退回直接打 GAS

const headersFor = (ttl) => ({
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=0, must-revalidate",             // 瀏覽器不要自己留，一律問 Netlify
  "netlify-cdn-cache-control": ttl > 0
    ? `public, durable, s-maxage=${ttl}, stale-while-revalidate=3600`   // durable＝全球節點共用一份
    : "no-store",
  "x-edge-ttl": String(ttl),
});
const json = (obj, status, ttl) => new Response(JSON.stringify(obj), { status, headers: headersFor(ttl) });

export default async (req) => {
  const url = new URL(req.url);
  const up = UPSTREAM[url.pathname];
  if (!up || req.method !== "GET") return json({ status: "error", message: "not found" }, 404, 0);
  const fresh = url.searchParams.get("fresh") === "1";
  url.searchParams.delete("fresh");
  const type = url.searchParams.get("type") || (url.searchParams.has("search") ? "search" : "");
  const ttl = fresh ? 0 : ((TTL[url.pathname] || {})[type] ?? 0);
  const qs = url.searchParams.toString();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const r = await fetch(up + (qs ? "?" + qs : ""), { signal: ctrl.signal, redirect: "follow", headers: { accept: "application/json,text/plain,*/*" } });
    const text = await r.text();
    let ok = false;
    try { const j = JSON.parse(text); ok = !!j && typeof j === "object"; } catch (_) { ok = false; }
    if (!ok) return json({ status: "error", message: "upstream", http: r.status }, 502, 0);   // Google 回錯誤頁 → 不快取，前端退回直打
    return new Response(text, { status: 200, headers: headersFor(ttl) });
  } catch (_) {
    return json({ status: "error", message: "upstream timeout" }, 504, 0);
  } finally { clearTimeout(timer); }
};

export const config = { path: ["/api/order", "/api/query"], cache: "manual" };

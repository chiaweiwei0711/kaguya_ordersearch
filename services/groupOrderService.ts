import { APP_CONFIG } from "../config";
import { GroupTeam, GroupProduct, GroupCartItem, MySubmission } from "../types";

// 靜態檔（CDN）是否已過期：fetchTeams 時比對「靜態檔版號 vs 試算表版號」，
// 過期＝她剛改過團/商品 → 之後抓商品明細一律走 GAS 拿最新的，不吃舊靜態檔。
let staticStale = true;   // 還沒比對前一律當過期（寧可慢一點也不給客人看到舊價格）
let lastProducts: GroupProduct[] = [];   // 搜尋索引（來自靜態檔），背景更新時沿用

// 開團表一列 → 前端 GroupTeam（靜態檔與 GAS live 共用同一套欄位轉換）
const mapTeam = (t: any): GroupTeam => ({
  code: String(t["團代號"] ?? "").trim(),
  name: String(t["團名"] ?? "").trim(),
  status: String(t["狀態"] ?? "").trim(),
  closeAt: String(t["結單時間"] ?? "").trim(),
  openAt: String(t["開團日期"] ?? "").trim(),
  shipInfo: String(t["發貨"] ?? "").trim(),
  note: String(t["備註"] ?? "").trim(),
  purchased: t["訂購完成"] === true || ["1", "true", "TRUE", "是", "✓", "v", "V"].includes(String(t["訂購完成"] ?? "").trim()),
  cover: String(t["封面圖"] ?? "").trim(),
  tags: String(t["標籤"] ?? "").split(/[、,，/｜|]+/).map((x: string) => x.trim()).filter(Boolean),
  joinPeople: Number(t["跟團人數"]) || 0,
  joinQty: Number(t["跟團件數"]) || 0,
});

export interface TeamsPayload {
  teams: GroupTeam[];
  products: GroupProduct[];
}

/**
 * 讀「開團表」＋商品輕量索引（收單 GAS 的 ?type=listTeams&lite=1）
 *
 * 列表頁只需要「搜尋用的品名」跟「封面圖」，不需要 4944 件商品的價格/規格/多圖。
 * 後端因此把一團的品名串成一個字串、只帶第一張圖，整包從 1.4MB 降到約 250KB。
 * 這裡再把索引還原成「一團一筆」的 GroupProduct，讓列表頁、搜尋、作品標籤的程式碼都不用改。
 * 真正的商品明細等客人點進某一團才用 fetchTeamItems 抓。
 */
// 讀取來源二選一：CDN 靜態檔（秒開、無上限）優先，失敗才退回 GAS（2026-08-12 讀取雪崩事故後的架構）
const fetchTeamsRaw = async (): Promise<any> => {
  try {
    const sres = await fetch(`${APP_CONFIG.STATIC_API_URL}/teams.json`, { cache: "no-cache" });
    if (sres.ok) {
      const sdata = await sres.json();
      if (sdata.status === "success" && Array.isArray(sdata.teams) && sdata.teams.length) return sdata;
    }
  } catch (_) { /* CDN 抓不到 → 退回 GAS */ }
  staticStale = true;      // 連靜態檔都沒有 → 全部走 GAS
  const res = await fetch(`${APP_CONFIG.ORDER_API_URL}?type=listTeams&lite=1`);
  if (!res.ok) throw new Error(`連線失敗 (${res.status})`);
  return await res.json();
};

// onLive：live（即時團表）回來後才呼叫，用來更新畫面。首屏不等它 → 頁面永遠秒開。
export const fetchTeams = async (onLive?: (p: TeamsPayload) => void): Promise<TeamsPayload> => {
  try {
    const data = await fetchTeamsRaw();
    if (data.status !== "success") return { teams: [], products: [] };

    let teams: GroupTeam[] = (data.teams || [])
      .map(mapTeam)
      .filter((t: GroupTeam) => t.code);

    // 跟團人數是即時數字、不能吃靜態檔——另打 GAS 輕量端點（下單當下會刷新），2.5 秒抓不到就先用靜態檔裡的舊值
    // 先用上次成功的 live 快照補一次（localStorage，0 成本），首屏就能看到最近一次的新團/人數
    const mergeLive = (raw: any[], base: GroupTeam[]): GroupTeam[] => {
      const liveTeams: GroupTeam[] = raw.map(mapTeam).filter((t: GroupTeam) => t.code);
      if (!liveTeams.length) return base;
      const byCode = new Map(base.map((t) => [t.code, t]));
      // live 是團列表的真相（新團會出現、刪掉的團會消失）；靜態值只當補漏
      return liveTeams.map((lt) => {
        const st = byCode.get(lt.code);
        return st ? { ...st, ...lt } : lt;
      });
    };
    try {
      const cached = JSON.parse(localStorage.getItem("kg_live") || "null");
      if (Array.isArray(cached) && cached.length) teams = mergeLive(cached, teams);
    } catch (_) {}

    // 背景抓 live：不擋首屏，回來後用 onLive 更新畫面（新團、狀態、人數、封面都會補上）
    if (onLive) {
      (async () => {
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 8000);
          const lres = await fetch(`${APP_CONFIG.ORDER_API_URL}?type=live`, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!lres.ok) return;
          const ld = await lres.json();
          if (ld.status !== "success" || !Array.isArray(ld.teams) || !ld.teams.length) return;
          // 版號一致＝靜態檔與試算表同步 → 商品明細可以吃 CDN（秒開）；不一致代表她剛改過 → 走 GAS 拿最新
          staticStale = !(data && data.ver && ld.ver && String(data.ver) === String(ld.ver));
          try { localStorage.setItem("kg_live", JSON.stringify(ld.teams)); } catch (_) {}
          onLive({ teams: mergeLive(ld.teams, teams), products: lastProducts });
        } catch (_) { /* GAS 忙 → 畫面維持靜態檔內容，不影響使用 */ }
      })();
    }

    // lite 模式：一團一筆合成商品（品名串在一起給搜尋／標籤用，圖給封面用）
    if (Array.isArray(data.index)) {
      lastProducts = data.index.map((x: any) => ({
        team: String(x.t ?? "").trim(),
        category: "",
        no: "",
        name: String(x.n ?? ""),
        img: String(x.c ?? ""),
        images: [],
        price: 0,
      }));
      return { teams, products: lastProducts };
    }

    const products: GroupProduct[] = (data.items || [])
      .map((it: any) => {
        // 「圖URL」一格可放多張：用空白／換行分隔 → 拆成陣列；只放一張＝跟以前一樣
        const images = String(it["圖URL"] ?? "").trim().split(/\s+/).filter(Boolean);
        return {
          team: String(it["團代號"] ?? "").trim(),
          category: String(it["類別"] ?? "").trim(),
          no: it["編號"] ?? "",
          name: String(it["品名"] ?? "").trim(),
          img: images[0] ?? "",
          images,
          price: Number(it["價格"]) || 0,
          star: it["★"] === 1 || it["★"] === true || String(it["★"] ?? "").trim() === "1",
          spec: String(it["規格"] ?? "").trim(),
        };
      })
      .filter((p: GroupProduct) => p.team && p.category);

    return { teams, products };
  } catch (e) {
    console.error("fetchTeams error:", e);
    return { teams: [], products: [] };
  }
};

// 單一團的商品明細：客人點進填單頁才抓，避免列表頁背著全部商品
export const fetchTeamItems = async (code: string): Promise<GroupProduct[]> => {
  const c = String(code || "").trim();
  if (!c) return [];
  let data: any = null;
  // 靜態檔跟試算表同步時才吃 CDN（秒開）；她剛改過東西（版號不同）就直接走 GAS，確保價格/品項是最新的
  if (!staticStale) {
    try {
      const sres = await fetch(`${APP_CONFIG.STATIC_API_URL}/items/${encodeURIComponent(c)}.json`, { cache: "no-cache" });
      if (sres.ok) {
        const sdata = await sres.json();
        if (sdata.status === "success" && Array.isArray(sdata.items) && sdata.items.length) data = sdata;
      }
    } catch (_) { /* CDN 沒這團 → 退回 GAS */ }
  }
  if (!data) {
    try {
      const res = await fetch(`${APP_CONFIG.ORDER_API_URL}?type=teamItems&team=${encodeURIComponent(c)}`);
      if (res.ok) {
        const gd = await res.json();
        if (gd.status === "success") data = gd;
      }
    } catch (_) { /* GAS 掛了 → 下面用靜態檔頂著，總比開不了好 */ }
  }
  if (!data) {
    const sres2 = await fetch(`${APP_CONFIG.STATIC_API_URL}/items/${encodeURIComponent(c)}.json`, { cache: "no-cache" });
    if (!sres2.ok) throw new Error(`連線失敗 (${sres2.status})`);
    data = await sres2.json();
  }
  if (data.status !== "success") return [];
  return (data.items || [])
    .map((it: any) => {
      const images = String(it["圖URL"] ?? "").trim().split(/\s+/).filter(Boolean);
      return {
        team: String(it["團代號"] ?? "").trim(),
        category: String(it["類別"] ?? "").trim(),
        no: it["編號"] ?? "",
        name: String(it["品名"] ?? "").trim(),
        img: images[0] ?? "",
        images,
        price: Number(it["價格"]) || 0,
        star: it["★"] === 1 || it["★"] === true || String(it["★"] ?? "").trim() === "1",
        spec: String(it["規格"] ?? "").trim(),
      };
    })
    .filter((p: GroupProduct) => p.team && p.category);
};

// 送出訂單 → 收單 GAS 的 doPost（URLSearchParams 表單式，跟「按讚」同款，拿得到回應、不卡 CORS）
export const submitGroupOrder = async (
  team: GroupTeam,
  nick: string,
  items: GroupCartItem[],
  pay: string = "匯款"
): Promise<{ ok?: boolean; [k: string]: any }> => {
  const res = await fetch(APP_CONFIG.ORDER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      type: "submitGroupOrder",
      team: team.code,
      teamName: team.name,
      nick: nick,
      pay: pay,
      items: JSON.stringify(items),
    }),
  });
  return res.json();
};

// 查「我已送出的填單」(收單 GAS 的 ?type=pre-orderform&nick=...)
// 回傳一筆 = 一次送出；品項可能存成 JSON 字串或陣列，兩種都吃
export const fetchMySubmissions = async (nick: string): Promise<MySubmission[]> => {
  const q = nick.trim();
  if (!q) return [];
  const res = await fetch(`${APP_CONFIG.ORDER_API_URL}?type=pre-orderform&nick=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error(`連線失敗 (${res.status})`);
  const data = await res.json();
  if (data.status !== "success" || !Array.isArray(data.submissions)) return [];

  return (data.submissions || [])
    .map((s: any): MySubmission => {
      let items: GroupCartItem[] = [];
      try {
        const raw = s["品項"] ?? s.items;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (Array.isArray(parsed)) {
          items = parsed.map((it: any) => ({
            type: String(it.type ?? it["類別"] ?? "").trim(),
            label: String(it.label ?? it["品名"] ?? "").trim(),
            qty: Number(it.qty ?? it["數量"]) || 0,
            price: Number(it.price ?? it["價格"]) || 0,
          }));
        }
      } catch { items = []; }

      const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
      return {
        team: String(s["團代號"] ?? s.team ?? "").trim(),
        teamName: String(s["團名"] ?? s.teamName ?? "").trim(),
        time: String(s["時間"] ?? s.time ?? "").trim(),
        items,
        subtotal,
      };
    })
    .filter((s: MySubmission) => s.team && s.items.length);
};

// 從結單時間算剩餘天數（向上取整；過期或無效回 0）
export const daysLeft = (closeAt: string): number => {
  if (!closeAt) return 0;
  const end = new Date(closeAt).getTime();
  if (isNaN(end)) return 0;
  const diff = end - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / 86400000);
};

// 後台只有兩種狀態：開團中 / 已結單，且「已結單」是看結單時間到了沒自動算的。
// 所以這裡也比照：狀態被標結單，或結單時間已過，都算結單。
export const isOpen = (team: GroupTeam): boolean => {
  if (["已關閉", "關閉", "結束", "已結單"].includes(team.status)) return false;
  if (team.closeAt) {
    const end = new Date(team.closeAt).getTime();
    if (!isNaN(end) && end <= Date.now()) return false; // 結單時間到了就自動結單
  }
  return true;
};

// 「今日／明日結單」判斷：比日曆日。
// 不能用 daysLeft（ceil 制：明晚結單的團在今天早上會算成 2 天）。
export const closingSoon = (team: GroupTeam): "today" | "tomorrow" | null => {
  if (!team.closeAt || !isOpen(team)) return null;
  const end = new Date(team.closeAt);
  if (isNaN(end.getTime())) return null;
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day(end) - day(new Date())) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  return null;
};

// 日期格式化成 M/D HH:mm（結單時間是 00:00 整就只顯示日期）
export const fmtMDHM = (s?: string): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  const p = (n: number) => String(n).padStart(2, "0");
  const hm = d.getHours() || d.getMinutes() ? ` ${p(d.getHours())}:${p(d.getMinutes())}` : "";
  return `${d.getMonth() + 1}/${d.getDate()}${hm}`;
};

// 日期格式化成 M/D（吃 ISO 或一般日期字串；無法解析就原樣回傳）
export const fmtMD = (s?: string): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

// 日期格式化成 YYYY-MM-DD
export const fmtYMD = (s?: string): string => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

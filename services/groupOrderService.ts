import { APP_CONFIG } from "../config";
import { GroupTeam, GroupProduct, GroupCartItem } from "../types";

export interface TeamsPayload {
  teams: GroupTeam[];
  products: GroupProduct[];
}

// 讀「開團表 + 開團商品」(收單 GAS 的 ?type=listTeams)
export const fetchTeams = async (): Promise<TeamsPayload> => {
  try {
    const res = await fetch(`${APP_CONFIG.ORDER_API_URL}?type=listTeams`);
    if (!res.ok) throw new Error(`連線失敗 (${res.status})`);
    const data = await res.json();
    if (data.status !== "success") return { teams: [], products: [] };

    const teams: GroupTeam[] = (data.teams || [])
      .map((t: any) => ({
        code: String(t["團代號"] ?? "").trim(),
        name: String(t["團名"] ?? "").trim(),
        status: String(t["狀態"] ?? "").trim(),
        closeAt: String(t["結單時間"] ?? "").trim(),
        openAt: String(t["開團日期"] ?? "").trim(),
        shipInfo: String(t["發貨"] ?? "").trim(),
        note: String(t["備註"] ?? "").trim(),
      }))
      .filter((t: GroupTeam) => t.code);

    const products: GroupProduct[] = (data.items || [])
      .map((it: any) => ({
        team: String(it["團代號"] ?? "").trim(),
        category: String(it["類別"] ?? "").trim(),
        no: it["編號"] ?? "",
        name: String(it["品名"] ?? "").trim(),
        img: String(it["圖URL"] ?? "").trim(),
        price: Number(it["價格"]) || 0,
        star: it["★"] === 1 || it["★"] === true || String(it["★"] ?? "").trim() === "1",
      }))
      .filter((p: GroupProduct) => p.team && p.category);

    return { teams, products };
  } catch (e) {
    console.error("fetchTeams error:", e);
    return { teams: [], products: [] };
  }
};

// 送出訂單 → 收單 GAS 的 doPost（URLSearchParams 表單式，跟「按讚」同款，拿得到回應、不卡 CORS）
export const submitGroupOrder = async (
  team: GroupTeam,
  nick: string,
  items: GroupCartItem[]
): Promise<{ ok?: boolean; [k: string]: any }> => {
  const res = await fetch(APP_CONFIG.ORDER_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      type: "submitGroupOrder",
      team: team.code,
      teamName: team.name,
      nick: nick,
      items: JSON.stringify(items),
    }),
  });
  return res.json();
};

// 從結單時間算剩餘天數（向上取整；過期或無效回 0）
export const daysLeft = (closeAt: string): number => {
  if (!closeAt) return 0;
  const end = new Date(closeAt).getTime();
  if (isNaN(end)) return 0;
  const diff = end - Date.now();
  return diff <= 0 ? 0 : Math.ceil(diff / 86400000);
};

export const isOpen = (team: GroupTeam): boolean =>
  team.status !== "已關閉" && team.status !== "關閉" && team.status !== "結束";

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

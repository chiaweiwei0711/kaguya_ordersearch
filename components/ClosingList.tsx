import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, AlarmClock, ShoppingBag } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { closingSoon, fmtMDHM, fmtYMD } from "../services/groupOrderService";
import { usePullToRefresh } from "./usePullToRefresh";

interface Props {
  teams: GroupTeam[];
  products: GroupProduct[];
  loading?: boolean;
  onSelect: (code: string) => void; // 進該團填單頁
  onBack: () => void;               // 返回首頁
  onAll: () => void;                // 去看全部開團列表
  onRefresh?: () => Promise<any> | any; // 下拉重整：重抓團表
}

// 倒數：這頁的重點就是「快來不及了」，數字真的在走比靜態文字有用。
// 不到 1 小時才顯示到秒（那時候秒數才有意義）；其他時候只到分，免得整片數字亂閃。
const useTick = (on: boolean) => {
  const [, set] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => set((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [on]);
};

const countdown = (closeAt: string) => {
  const end = new Date(closeAt).getTime();
  if (!end) return null;
  const ms = end - Date.now();
  if (ms <= 0) return { text: "已結單", urgent: true, over: true };
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h >= 1) return { text: `剩 ${h} 小時 ${m} 分`, urgent: h < 6, over: false };
  return { text: `剩 ${m}:${String(sec).padStart(2, "0")}`, urgent: true, over: false };
};

// 明日結單專頁（#/closing，可直接發連結到群組）：列出今明兩天要收單的團
const ClosingList: React.FC<Props> = ({ teams, products, loading, onSelect, onBack, onAll, onRefresh }) => {
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(onRefresh);
  useTick(true);   // 每秒重畫，倒數才會動
  const list = teams
    .map((t) => ({ t, when: closingSoon(t) }))
    .filter((x): x is { t: GroupTeam; when: "today" | "tomorrow" } => x.when !== null)
    .sort((a, b) => (a.when === b.when ? 0 : a.when === "today" ? -1 : 1));

  const imgOf = (code: string) => products.find((p) => p.team === code && p.img)?.img;

  return (
    <div ref={ptrRef} className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto overscroll-y-contain">
      {ptrIndicator}
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 pt-20 pb-8 relative">
        <h2 className="text-[#283d3e] font-[900] text-3xl sm:text-4xl tracking-widest text-center mb-6 mt-8 flex items-center justify-center gap-2.5">
          <AlarmClock className="w-8 h-8 stroke-[2.5px] text-[#e46b58]" />
          即將結單
        </h2>

        {loading && <p className="text-center text-[#283d3e]/60 font-bold py-8">載入中…</p>}

        {!loading && list.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[#283d3e]/70 font-bold mb-5">今明兩天沒有要結單的團</p>
            <button onClick={onAll} className="bg-[#49d5df] text-[#283d3e] font-[900] px-7 py-3 rounded-full active:opacity-60 transition-all">
              看全部開團
            </button>
          </div>
        )}

        {/* 跟填單專區（開團列表）同一種卡：兩欄格狀、正方形封面、結單狀態貼在圖上。
            原本是一列一列的條列式，跟那邊不一致，瓦多要求統一。 */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {list.map(({ t, when }) => {
            const img = imgOf(t.code);
            const cd = countdown(t.closeAt);
            return (
              <button
                key={t.code}
                onClick={() => onSelect(t.code)}
                className="text-left rounded-2xl overflow-hidden flex flex-col border-2 border-transparent bg-white active:opacity-60 transition-all"
              >
                <div className="relative aspect-square bg-[#e9f5f6]">
                  {img
                    ? <img src={img} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-[#283d3e]/25 stroke-[2px]" /></div>}
                  <span className={`absolute top-2 left-2 text-[12px] font-[900] px-3 py-1 rounded-full inline-flex items-center gap-1.5 before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shrink-0 ${
                    when === "today" ? "bg-white text-[#e46b58] before:bg-[#e46b58]" : "bg-white text-[#283d3e] before:bg-[#49d5df]"
                  }`}>
                    {when === "today" ? "今日結單" : "明日結單"}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <div className="font-[900] text-[13.5px] leading-tight line-clamp-3 min-h-[51px] text-[#283d3e]">{t.name}</div>
                  <div className="mt-auto pt-1 flex flex-wrap gap-1.5">
                    {cd && (
                      <span className={`text-[11px] font-[900] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 tabular-nums before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shrink-0 ${
                        cd.urgent ? "bg-[#fdecea] text-[#c4362a] before:bg-[#e46b58] motion-safe:before:animate-pulse" : "bg-[#f0f4f4] text-[#283d3e] before:bg-[#e46b58]"
                      }`}>{cd.text}</span>
                    )}
                    {(t.joinPeople ?? 0) > 0 && (
                      <span className="text-[11px] font-[900] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 bg-[#fce7f3] text-[#a3346b] before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:shrink-0 before:bg-[#e868a0]">{t.joinPeople} 人跟團</span>
                    )}
                  </div>
                  <span className="text-[12px] font-[900] text-[#e46b58] leading-none">{fmtMDHM(t.closeAt)} 止</span>
                  {t.openAt && <span className="text-[12px] font-bold text-black/65">開團日期：{fmtYMD(t.openAt)}</span>}
                </div>
              </button>
            );
          })}
        </div>

        {!loading && list.length > 0 && (
          <button
            onClick={onAll}
            className="mt-6 ml-auto flex items-center text-[#283d3e] font-[900] text-lg border-b-[3px] border-[#283d3e] hover:opacity-70 active:translate-x-1 transition"
          >
            看全部開團 <ChevronRight className="ml-1 w-5 h-5 stroke-[3px]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ClosingList;

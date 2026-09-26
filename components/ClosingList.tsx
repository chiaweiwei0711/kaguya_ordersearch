import React from "react";
import { ChevronLeft, ChevronRight, AlarmClock, ShoppingBag } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { closingSoon, fmtMDHM } from "../services/groupOrderService";
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

// 明日結單專頁（#/closing，可直接發連結到群組）：列出今明兩天要收單的團
const ClosingList: React.FC<Props> = ({ teams, products, loading, onSelect, onBack, onAll, onRefresh }) => {
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(onRefresh);
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

        <div className="space-y-3">
          {list.map(({ t, when }) => {
            const img = imgOf(t.code);
            return (
              <button
                key={t.code}
                onClick={() => onSelect(t.code)}
                className="w-full text-left bg-white rounded-2xl p-3 flex items-center gap-3.5 active:opacity-60 transition-all"
              >
                <div className="w-20 h-20 rounded-xl bg-[#e9f5f6] overflow-hidden shrink-0 flex items-center justify-center">
                  {img
                    ? <img src={img} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    : <ShoppingBag className="w-8 h-8 text-[#283d3e]/30 stroke-[2px]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-block text-[11px] font-[900] px-2.5 py-0.5 rounded-full mb-1 ${when === "today" ? "bg-[#e46b58] text-[#283d3e]" : "bg-[#283d3e] text-white"}`}>
                    {when === "today" ? "今日結單" : "明日結單"}
                  </span>
                  <div className="font-[900] text-[#283d3e] text-base leading-snug line-clamp-2">{t.name}</div>
                  <div className="text-[12px] font-[900] text-[#e46b58] mt-1">{fmtMDHM(t.closeAt)} 止</div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#283d3e] stroke-[3px] shrink-0" />
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

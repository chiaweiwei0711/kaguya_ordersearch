import React from "react";
import { ChevronLeft, ChevronRight, AlarmClock, ShoppingBag } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { closingSoon, fmtMDHM } from "../services/groupOrderService";

interface Props {
  teams: GroupTeam[];
  products: GroupProduct[];
  loading?: boolean;
  onSelect: (code: string) => void; // 進該團填單頁
  onBack: () => void;               // 返回首頁
  onAll: () => void;                // 去看全部開團列表
}

// 明日結單專頁（#/closing，可直接發連結到群組）：列出今明兩天要收單的團
const ClosingList: React.FC<Props> = ({ teams, products, loading, onSelect, onBack, onAll }) => {
  const list = teams
    .map((t) => ({ t, when: closingSoon(t) }))
    .filter((x): x is { t: GroupTeam; when: "today" | "tomorrow" } => x.when !== null)
    .sort((a, b) => (a.when === b.when ? 0 : a.when === "today" ? -1 : 1));

  const imgOf = (code: string) => products.find((p) => p.team === code && p.img)?.img;

  return (
    <div className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-8 relative">
        <button onClick={onBack} aria-label="返回" className="absolute top-6 left-6 w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <h2 className="text-[#4c59a1] font-[900] text-3xl sm:text-4xl tracking-widest text-center mb-6 mt-8 flex items-center justify-center gap-2.5">
          <AlarmClock className="w-8 h-8 stroke-[2.5px] text-[#f43f5e]" />
          即將結單
        </h2>

        {loading && <p className="text-center text-[#4c59a1]/60 font-bold py-8">載入中…</p>}

        {!loading && list.length === 0 && (
          <div className="text-center py-10">
            <p className="text-[#4c59a1]/70 font-bold mb-5">今明兩天沒有要結單的團</p>
            <button onClick={onAll} className="bg-[#3ac0bf] text-white font-[900] px-7 py-3 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all">
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
                className="w-full text-left bg-white rounded-2xl p-3 flex items-center gap-3.5 shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all"
              >
                <div className="w-20 h-20 rounded-xl bg-[#eef0fa] overflow-hidden shrink-0 flex items-center justify-center">
                  {img
                    ? <img src={img} alt={t.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    : <ShoppingBag className="w-8 h-8 text-[#4c59a1]/30 stroke-[2px]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`inline-block text-[11px] font-[900] px-2.5 py-0.5 rounded-full mb-1 ${when === "today" ? "bg-[#f43f5e] text-white" : "bg-[#4c59a1] text-white"}`}>
                    {when === "today" ? "今日結單" : "明日結單"}
                  </span>
                  <div className="font-[900] text-[#4c59a1] text-base leading-snug line-clamp-2">{t.name}</div>
                  <div className="text-[12px] font-[900] text-[#f43f5e] mt-1">{fmtMDHM(t.closeAt)} 止</div>
                </div>
                <ChevronRight className="w-5 h-5 text-[#4c59a1] stroke-[3px] shrink-0" />
              </button>
            );
          })}
        </div>

        {!loading && list.length > 0 && (
          <button
            onClick={onAll}
            className="mt-6 ml-auto flex items-center text-[#4c59a1] font-[900] text-lg border-b-[3px] border-[#4c59a1] hover:opacity-70 active:translate-x-1 transition"
          >
            看全部開團 <ChevronRight className="ml-1 w-5 h-5 stroke-[3px]" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ClosingList;

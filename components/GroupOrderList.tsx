import React from "react";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { GroupTeam } from "../types";
import { daysLeft, isOpen, fmtYMD } from "../services/groupOrderService";

interface Props {
  teams: GroupTeam[];
  onSelect: (code: string) => void;
  loading?: boolean;
  preview?: boolean;     // 首頁預覽模式（黃色圓角卡）
  onMore?: () => void;   // 預覽的 More 進完整列表
  onBack?: () => void;   // 列表頁返回首頁
}

const GroupOrderList: React.FC<Props> = ({ teams, onSelect, loading, preview, onMore, onBack }) => {
  // 開團中優先，再依開團日期新→舊（最新團置頂）
  const sorted = [...teams].sort((a, b) =>
    (Number(isOpen(b)) - Number(isOpen(a))) ||
    (new Date(b.openAt || 0).getTime() - new Date(a.openAt || 0).getTime())
  );
  const shown = preview ? sorted.slice(0, 3) : sorted;

  const inner = (
    <>
      {!preview && onBack && (
        <button
          onClick={onBack}
          aria-label="返回"
          className="absolute top-6 left-6 w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>
      )}

      <h2 className={`text-[#4c59a1] font-[900] text-3xl sm:text-4xl tracking-widest text-center mb-6 ${!preview && onBack ? "mt-8" : ""}`}>
        {preview ? "開團訂購表" : "訂購填單專區"}
      </h2>

      {loading && <p className="text-center text-[#4c59a1]/60 font-bold py-8">讀取中… ☁️</p>}
      {!loading && shown.length === 0 && <p className="text-center text-[#4c59a1]/70 font-bold py-8">目前沒有開團 🥲</p>}

      <div className="space-y-3">
        {shown.map((t) => {
          const open = isOpen(t);
          const left = daysLeft(t.closeAt);
          return (
            <button
              key={t.code}
              onClick={() => open && onSelect(t.code)}
              disabled={!open}
              className={`w-full text-left rounded-2xl px-5 py-4 min-h-[64px] flex items-center justify-between gap-3 transition ${
                open ? "bg-white shadow-sm border-2 border-transparent active:scale-[0.98]" : "bg-gray-100 border-2 border-transparent opacity-70 cursor-default"
              }`}
            >
              <div className="min-w-0">
                <div className={`font-[900] text-base truncate ${open ? "text-[#4c59a1]" : "text-gray-400"}`}>{t.name}</div>
                {open && (
                  <span className="inline-block mt-1.5 text-[11px] font-[900] text-white bg-[#f43f5e] px-2.5 py-0.5 rounded-full">剩餘 {left} 天結單</span>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className={`text-sm font-[900] px-4 py-1.5 rounded-full ${open ? "bg-[#3ac0bf] text-white" : "bg-[#2b2b2b] text-white"}`}>
                  {open ? "開團中" : "已結單"}
                </span>
                {t.openAt && <span className="text-black font-bold text-sm">{fmtYMD(t.openAt)}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {preview && onMore && sorted.length > 0 && (
        <button
          onClick={onMore}
          className="mt-6 ml-auto flex items-center text-[#4c59a1] font-[900] text-lg border-b-[3px] border-[#4c59a1] hover:opacity-70 active:translate-x-1 transition"
        >
          More... <ArrowRight className="ml-1 w-5 h-5 stroke-[3px]" />
        </button>
      )}
    </>
  );

  // 首頁預覽：黃色圓角卡（夾在 NEWS/SNS 之間）
  if (preview) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-[#fff170] rounded-[40px] px-5 sm:px-7 py-8 relative">{inner}</div>
      </div>
    );
  }
  // 列表頁：整頁鋪滿黃色
  return (
    <div className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-8 relative">{inner}</div>
    </div>
  );
};

export default GroupOrderList;

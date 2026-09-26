import React from "react";
import { ChevronRight } from "lucide-react";

// 區塊統一文法 —— 量自 movic／ensky／KADOKAWA／AMNIBUS／JUMP SHOP／Anime Store 六家，
// 沒有一家例外：標題 →（標籤列）→ 網格 →「看全部」按鈕。
// 顏色一律繼承父層，所以同一顆元件放在藍紫底或淺底上都成立，換配色時不用改這裡。

export const SectionHead: React.FC<{ en: string; title: string; count?: number }> = ({ en, title, count }) => (
  <div className="mb-3">
    {/* movic 與 KADOKAWA 都是「淺色英文小標＋主標」兩層，區塊之間才有一致的節奏 */}
    <div className="text-[11px] font-[900] tracking-[0.22em] text-[#283d3e]/40 leading-none mb-1.5">{en}</div>
    <h2 className="font-[900] text-xl tracking-widest leading-none text-[#49d5df]">
      {title}
      {count != null && <span className="ml-2 text-sm opacity-45">{count}</span>}
    </h2>
  </div>
);

export const MoreButton: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="mt-4 w-full h-11 rounded-full bg-white border border-black/10 text-[#283d3e] font-[900] text-sm flex items-center justify-center gap-1 active:opacity-60 transition"
  >
    {label}<ChevronRight className="w-4 h-4 stroke-[3px]" />
  </button>
);

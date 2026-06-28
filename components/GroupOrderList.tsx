import React, { useState, useMemo } from "react";
import { ChevronLeft, ArrowRight, Search, ChevronRight, X } from "lucide-react";
import { GroupTeam } from "../types";
import { daysLeft, isOpen, fmtYMD } from "../services/groupOrderService";

interface Props {
  teams: GroupTeam[];
  onSelect: (code: string) => void;
  loading?: boolean;
  preview?: boolean;     // 首頁預覽模式（黃色圓角卡）
  onMore?: () => void;   // 預覽的 More 進完整列表
  onBack?: () => void;   // 列表頁返回首頁
  onLookup?: () => void; // 列表頁開「填單明細查詢」
}

type SortKey = "default" | "close_asc" | "close_desc" | "open_desc";

// 結單／開團時間轉毫秒（無法解析：結單視為最遠 Infinity、開團視為最舊 0）
const closeMs = (t: GroupTeam) => { const ms = new Date(t.closeAt).getTime(); return isNaN(ms) ? Infinity : ms; };
const openMs = (t: GroupTeam) => { const ms = new Date(t.openAt || "").getTime(); return isNaN(ms) ? 0 : ms; };

const GroupOrderList: React.FC<Props> = ({ teams, onSelect, loading, preview, onMore, onBack, onLookup }) => {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");

  const list = useMemo(() => {
    // 開團中一律排在已結單前面，再依所選方式排（預設＝Sheet 列序新→舊）
    const openFirst = (a: { t: GroupTeam }, b: { t: GroupTeam }) => Number(isOpen(b.t)) - Number(isOpen(a.t));
    const cmp: Record<SortKey, (a: { t: GroupTeam; i: number }, b: { t: GroupTeam; i: number }) => number> = {
      default:    (a, b) => openFirst(a, b) || (b.i - a.i),
      close_asc:  (a, b) => openFirst(a, b) || (closeMs(a.t) - closeMs(b.t)) || (b.i - a.i),
      close_desc: (a, b) => openFirst(a, b) || (closeMs(b.t) - closeMs(a.t)) || (b.i - a.i),
      open_desc:  (a, b) => openFirst(a, b) || (openMs(b.t) - openMs(a.t)) || (b.i - a.i),
    };
    let arr = teams.map((t, i) => ({ t, i })).sort(cmp[preview ? "default" : sortBy]).map((x) => x.t);
    const q = query.trim().toLowerCase();
    if (!preview && q) arr = arr.filter((t) => (t.name || "").toLowerCase().includes(q) || (t.code || "").toLowerCase().includes(q));
    return arr;
  }, [teams, sortBy, query, preview]);

  const shown = preview ? list.slice(0, 3) : list;
  const q = query.trim();

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
        預購填單專區
      </h2>

      {/* 列表頁專屬：填單明細查詢入口 */}
      {!preview && onLookup && (
        <button
          onClick={onLookup}
          className="w-full bg-white border-[3px] border-black rounded-full shadow-[4px_4px_0px_#000] px-3 py-2 flex items-center gap-3 mb-4 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all"
        >
          <span className="w-9 h-9 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 stroke-[3px]" />
          </span>
          <span className="flex-1 text-left text-[#4c59a1] font-[900] text-base tracking-widest">填單明細查詢</span>
          <ChevronRight className="w-5 h-5 text-[#4c59a1] stroke-[3px] shrink-0" />
        </button>
      )}

      {/* 列表頁專屬：團名搜尋 ＋ 排序 */}
      {!preview && (
        <div className="mb-5 space-y-3">
          <div className="w-full bg-white rounded-full p-1.5 pl-4 flex items-center gap-2 border-[3px] border-black shadow-[3px_3px_0px_#000]">
            <Search className="w-5 h-5 text-[#f8a3f4] stroke-[3px] shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜尋團名…"
              className="w-full bg-transparent outline-none text-base font-[900] text-[#4c59a1] placeholder-gray-400 py-1.5"
            />
            {q && (
              <button onClick={() => setQuery("")} aria-label="清除搜尋" className="w-8 h-8 rounded-full bg-[#f8a3f4] text-white flex items-center justify-center shrink-0 active:scale-90 transition mr-1">
                <X className="w-4 h-4 stroke-[3px]" />
              </button>
            )}
          </div>
          <div className="flex justify-between items-center px-1">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="pl-4 pr-9 py-1.5 bg-transparent border-[2.5px] border-[#3ac0bf] text-[#3ac0bf] rounded-full text-sm font-[900] outline-none appearance-none cursor-pointer"
              >
                <option value="default">預設排序</option>
                <option value="close_asc">結單：即將截止</option>
                <option value="close_desc">結單：最晚截止</option>
                <option value="open_desc">開團：最新</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#3ac0bf] font-[900] text-xs">▼</div>
            </div>
            <span className="text-[#3ac0bf] font-[900] text-sm pr-1">共 {shown.length} 團</span>
          </div>
        </div>
      )}

      {loading && <p className="text-center text-[#4c59a1]/60 font-bold py-8">載入中…</p>}
      {!loading && shown.length === 0 && (
        <p className="text-center text-[#4c59a1]/70 font-bold py-8">{!preview && q ? `找不到符合「${q}」的團` : "目前沒有開團"}</p>
      )}

      <div className="space-y-3">
        {shown.map((t) => {
          const open = isOpen(t);
          const left = daysLeft(t.closeAt);
          return (
            <button
              key={t.code}
              onClick={() => onSelect(t.code)}
              className={`w-full text-left rounded-2xl px-5 py-4 min-h-[64px] flex items-center justify-between gap-3 transition-all ${
                open ? "bg-white shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none border-2 border-transparent" : "bg-gray-100 border-2 border-transparent opacity-80 active:scale-[0.98]"
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

      {preview && onMore && list.length > 0 && (
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

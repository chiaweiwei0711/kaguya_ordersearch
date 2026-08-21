import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ArrowRight, Search, ChevronRight, X, Check, ShoppingBag, Tag, SlidersHorizontal, Flame } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { daysLeft, isOpen, fmtYMD } from "../services/groupOrderService";
import { buildTagIndex } from "../services/ipTags";
import { usePullToRefresh } from "./usePullToRefresh";

interface Props {
  teams: GroupTeam[];
  products?: GroupProduct[];
  onSelect: (code: string) => void;
  loading?: boolean;
  preview?: boolean;     // 首頁預覽模式（黃色圓角卡）
  onMore?: () => void;   // 預覽的 More 進完整列表
  onBack?: () => void;   // 列表頁返回首頁
  onLookup?: () => void; // 列表頁開「填單明細查詢」
  onRefresh?: () => Promise<any> | any; // 下拉重整：重抓團表（列表頁專用）
}

type SortKey = "default" | "close_asc" | "close_desc" | "people_desc";
const SORT_OPTS: [SortKey, string][] = [
  ["default", "最新開團"],
  ["close_asc", "即將截止"],
  ["close_desc", "最晚截止"],
  ["people_desc", "最多人跟團"],
];
const PER_PAGE = 30;

// 結單時間轉毫秒（無法解析＝最遠 Infinity）
const closeMs = (t: GroupTeam) => { const ms = new Date(t.closeAt).getTime(); return isNaN(ms) ? Infinity : ms; };

const GroupOrderList: React.FC<Props> = ({ teams, products, onSelect, loading, preview, onMore, onBack, onLookup, onRefresh }) => {
  // 下拉重整只掛在整頁的列表（首頁預覽那張黃卡不是自己捲的容器）
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(preview ? undefined : onRefresh);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [hot, setHot] = useState(false);      // 首頁預覽：最新 ↔ 熱銷（熱銷＝跟團人數多的在前）
  // 首頁預覽吃自己的切換，列表頁吃排序選單
  const effSort: SortKey = preview ? (hot ? "people_desc" : "default") : sortBy;
  const [showOpen, setShowOpen] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [pickedTags, setPickedTags] = useState<string[]>([]);

  // 作品標籤（後台「標籤」欄優先，沒填就從團名／品名推導）
  const tagIndex = useMemo(() => buildTagIndex(teams, products || []), [teams, products]);
  const toggleTag = (t: string) =>
    setPickedTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  // 團代號 → 該團所有商品名（給「商品名」關鍵字搜尋）
  const prodIndex = useMemo(() => {
    const m: Record<string, string> = {};
    (products || []).forEach((p) => {
      const c = String(p.team || "").trim();
      m[c] = (m[c] || "") + " " + (p.name || "");
    });
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    const openFirst = (a: { t: GroupTeam }, b: { t: GroupTeam }) => Number(isOpen(b.t)) - Number(isOpen(a.t));
    const cmp: Record<SortKey, (a: { t: GroupTeam; i: number }, b: { t: GroupTeam; i: number }) => number> = {
      default:    (a, b) => openFirst(a, b) || (b.i - a.i),
      close_asc:  (a, b) => openFirst(a, b) || (closeMs(a.t) - closeMs(b.t)) || (b.i - a.i),
      close_desc: (a, b) => openFirst(a, b) || (closeMs(b.t) - closeMs(a.t)) || (b.i - a.i),
      people_desc: (a, b) => openFirst(a, b) || ((b.t.joinPeople ?? 0) - (a.t.joinPeople ?? 0)) || (b.i - a.i),
    };
    let arr = teams.map((t, i) => ({ t, i })).sort(cmp[effSort]).map((x) => x.t);
    if (!preview) {
      // 狀態勾選（兩個都勾 or 兩個都不勾＝不過濾，全部顯示）
      if ((showOpen || showClosed) && !(showOpen && showClosed)) {
        arr = arr.filter((t) => (isOpen(t) ? showOpen : showClosed));
      }
      // 作品標籤（複選＝任一命中，一團可能同時屬於多部作品）
      if (pickedTags.length) {
        arr = arr.filter((t) => (tagIndex.byTeam[t.code] || []).some((x) => pickedTags.includes(x)));
      }
      // 關鍵字：團名 ／ 團代號 ／ 團內商品名
      const q = query.trim().toLowerCase();
      if (q) arr = arr.filter((t) => {
        const code = String(t.code || "").trim();
        return ((t.name || "") + " " + code + " " + (prodIndex[code] || "")).toLowerCase().includes(q);
      });
    }
    return arr;
  }, [teams, effSort, query, showOpen, showClosed, preview, prodIndex, pickedTags, tagIndex]);

  // 封面圖：後台「封面圖」欄優先（可放自己做的主題圖），沒填就退回該團第一張商品圖
  const coverOf = (t: GroupTeam) => t.cover || (products || []).find((p) => p.team === t.code && p.img)?.img || "";

  // 搜尋／排序／勾選變動 → 回第 1 頁
  useEffect(() => { setPage(1); }, [query, sortBy, showOpen, showClosed, pickedTags]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, pageCount);
  const shown = preview ? filtered.slice(0, 3) : filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
  const q = query.trim();

  // 頁碼（>7 頁才用 … 省略：永遠顯示 1 / 最後 / 目前±1）
  const pageItems = useMemo<(number | "…")[]>(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
    const keep = [...new Set([1, pageCount, curPage - 1, curPage, curPage + 1])].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    let prev = 0;
    keep.forEach((n) => { if (n - prev > 1) out.push("…"); out.push(n); prev = n; });
    return out;
  }, [pageCount, curPage]);

  // 狀態勾選藥丸（玩具風：勾起＝填色＋✓，未勾＝白底淡字）
  const chip = (on: boolean, kind: "open" | "closed") =>
    `flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-[900] border-[3px] border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all ${
      on
        ? (kind === "open" ? "bg-[#3ac0bf] text-white" : "bg-[#2b2b2b] text-white")
        : "bg-white text-[#4c59a1]/40"
    }`;

  const inner = (
    <>
      {!preview && onBack && (
        <button onClick={onBack} aria-label="返回" className="absolute top-6 left-6 w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>
      )}

      <h2 className={`text-[#4c59a1] font-[900] text-3xl sm:text-4xl tracking-widest text-center ${preview ? "mb-4" : "mb-6"} ${!preview && onBack ? "mt-8" : ""}`}>
        預購填單專區
      </h2>

      {/* 首頁預覽：最新 ↔ 熱銷。只是換排序，不多佔一塊版面 */}
      {preview && (
        <div className="flex justify-center gap-2 mb-5">
          {([[false, "最新開團"], [true, "熱銷"]] as [boolean, string][]).map(([val, label]) => {
            const on = hot === val;
            return (
              <button
                key={label}
                onClick={() => setHot(val)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-[900] border-[3px] border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all ${
                  on ? (val ? "bg-[#f43f5e] text-white" : "bg-[#4c59a1] text-white") : "bg-white text-[#4c59a1]/45"
                }`}
              >
                {val && <Flame className="w-4 h-4 stroke-[3px]" />}
                {label}
              </button>
            );
          })}
        </div>
      )}

      {!preview && onLookup && (
        <button onClick={onLookup} className="w-full bg-white border-[3px] border-black rounded-full shadow-[4px_4px_0px_#000] px-3 py-2 flex items-center gap-3 mb-5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition-all">
          <span className="w-9 h-9 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 stroke-[3px]" />
          </span>
          <span className="flex-1 text-left text-[#4c59a1] font-[900] text-base tracking-widest">填單明細查詢</span>
          <ChevronRight className="w-5 h-5 text-[#4c59a1] stroke-[3px] shrink-0" />
        </button>
      )}

      {/* 列表頁專屬：團務查找（標題＋搜尋＋排序＋狀態勾選） */}
      {!preview && (
        <div className="mb-5">
          <h3 className="text-[#4c59a1] font-[900] text-lg tracking-widest mb-2 pl-1">團務查找</h3>
          {/* 搜尋框 ＋ 右邊一顆排序鈕：排序不需要一直佔一整排的寬度 */}
          <div className="flex items-center gap-2.5">
            <div className="flex-1 min-w-0 bg-white rounded-full p-1.5 pl-4 flex items-center gap-2 border-[3px] border-black shadow-[3px_3px_0px_#000]">
              <Search className="w-5 h-5 text-[#f8a3f4] stroke-[3px] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜作品名、商品名等關鍵字"
                className="w-full bg-transparent outline-none text-base font-[900] text-[#4c59a1] placeholder-gray-400 py-1.5"
              />
              {q && (
                <button onClick={() => setQuery("")} aria-label="清除搜尋" className="w-8 h-8 rounded-full bg-[#f8a3f4] text-white flex items-center justify-center shrink-0 active:scale-90 transition mr-1">
                  <X className="w-4 h-4 stroke-[3px]" />
                </button>
              )}
            </div>
            <button
              onClick={() => setSortOpen((v) => !v)}
              aria-label="排序方式"
              className={`relative w-[52px] h-[52px] shrink-0 rounded-full border-[3px] border-black shadow-[3px_3px_0px_#000] flex items-center justify-center active:translate-y-0.5 active:shadow-[1px_1px_0px_#000] transition-all ${
                sortOpen ? "bg-[#4c59a1] text-white" : "bg-white text-[#4c59a1]"
              }`}
            >
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5px]" />
              {/* 不是預設排序時點一個記號，不然客人不知道現在是照什麼排 */}
              {sortBy !== "default" && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#f8a3f4] border-2 border-black" />
              )}
            </button>
          </div>

          {/* 排序選單：點右邊那顆才展開 */}
          {sortOpen && (
            <div className="mt-2.5 bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] p-1.5">
              {SORT_OPTS.map(([val, label]) => {
                const on = sortBy === val;
                return (
                  <button
                    key={val}
                    onClick={() => { setSortBy(val); setSortOpen(false); }}
                    className={`w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-[900] transition-all ${
                      on ? "bg-[#4c59a1] text-white" : "text-[#4c59a1] active:bg-[#eef0fa]"
                    }`}
                  >
                    {on ? <Check className="w-4 h-4 stroke-[4px] shrink-0" /> : <span className="w-4 shrink-0" />}
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* 篩選一排：不換行，窄螢幕就橫向滑，不會再折成參差的兩塊 */}
          <div className="-mx-5 sm:-mx-7 px-5 sm:px-7 mt-2.5 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2.5 w-max pb-1">
            <button onClick={() => setShowOpen((v) => !v)} className={chip(showOpen, "open")}>
              {showOpen && <Check className="w-4 h-4 stroke-[4px]" />}開團中
            </button>
            <button onClick={() => setShowClosed((v) => !v)} className={chip(showClosed, "closed")}>
              {showClosed && <Check className="w-4 h-4 stroke-[4px]" />}已結單
            </button>
            {tagIndex.all.length > 0 && (
              <button
                onClick={() => setTagOpen((v) => !v)}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-[900] border-[3px] border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all ${
                  pickedTags.length ? "bg-[#f8a3f4] text-white" : "bg-white text-[#4c59a1]/70"
                }`}
              >
                <Tag className="w-4 h-4 stroke-[3px]" />
                作品{pickedTags.length > 0 && ` ${pickedTags.length}`}
              </button>
            )}
            </div>
          </div>

          {/* 作品標籤面板：可複選，選了幾部就列出屬於任一部的團 */}
          {tagOpen && tagIndex.all.length > 0 && (
            <div className="mt-3 bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] p-3">
              <div className="flex items-center mb-2 px-1">
                <span className="text-[#4c59a1] font-[900] text-sm">選作品（可複選）</span>
                <button onClick={() => setTagOpen(false)} aria-label="收起" className="ml-auto w-7 h-7 rounded-full bg-[#eef0fa] text-[#4c59a1] flex items-center justify-center active:scale-90 transition">
                  <X className="w-4 h-4 stroke-[3px]" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                {tagIndex.all.map((t) => {
                  const on = pickedTags.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTag(t)}
                      className={`px-3 py-1.5 rounded-full text-[13px] font-[900] border-2 border-black transition-all active:translate-y-0.5 ${
                        on ? "bg-[#3ac0bf] text-white" : "bg-white text-[#4c59a1]"
                      }`}
                    >
                      {t}
                      <span className={on ? "text-white/80 ml-1" : "text-[#4c59a1]/45 ml-1"}>{tagIndex.counts[t]}</span>
                    </button>
                  );
                })}
              </div>
              {pickedTags.length > 0 && (
                <button onClick={() => setPickedTags([])} className="mt-3 w-full py-2 rounded-full bg-[#eef0fa] text-[#4c59a1] font-[900] text-sm active:scale-[0.98] transition">
                  清除全部（已選 {pickedTags.length}）
                </button>
              )}
            </div>
          )}

          {/* 已選的作品：可以單獨 × 掉 */}
          {pickedTags.length > 0 && !tagOpen && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pickedTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTag(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ac0bf] text-white text-[13px] font-[900] border-2 border-black active:translate-y-0.5 transition-all"
                >
                  {t}
                  <X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              ))}
            </div>
          )}
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
          const cover = coverOf(t);
          return (
            <button
              key={t.code}
              onClick={() => onSelect(t.code)}
              className={`w-full text-left rounded-2xl px-4 py-3 min-h-[64px] flex items-center justify-between gap-3 transition-all ${
                open ? "bg-white shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none border-2 border-transparent" : "bg-gray-100 border-2 border-transparent opacity-80 active:scale-[0.98]"
              }`}
            >
              {/* 封面圖：一眼看出是什麼團的商品 */}
              <div className={`w-16 h-16 rounded-xl overflow-hidden shrink-0 flex items-center justify-center ${open ? "bg-[#eef0fa]" : "bg-gray-200"}`}>
                {cover
                  ? <img src={cover} alt="" referrerPolicy="no-referrer" loading="lazy" className={`w-full h-full object-cover ${open ? "" : "grayscale opacity-70"}`} />
                  : <ShoppingBag className="w-7 h-7 text-[#4c59a1]/25 stroke-[2px]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className={`font-[900] text-base line-clamp-2 leading-snug ${open ? "text-[#4c59a1]" : "text-gray-400"}`}>{t.name}</div>
                {open && (
                  <span className="inline-block mt-1.5 text-[11px] font-[900] text-white bg-[#f43f5e] px-2.5 py-0.5 rounded-full">剩餘 {left} 天結單</span>
                )}
                {(t.joinPeople ?? 0) > 0 && (
                  <span className={`inline-block mt-1.5 ml-1.5 text-[11px] font-[900] px-2.5 py-0.5 rounded-full ${open ? "bg-[#3ac0bf] text-white" : "bg-gray-300 text-gray-600"}`}>{t.joinPeople} 人跟團</span>
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

      {/* 分頁（每 30 團一頁；目前頁＝薄荷綠圓，其餘白底，全用 Soft Pop 配色） */}
      {!preview && pageCount > 1 && (
        <div className="flex justify-center items-center flex-wrap gap-2 mt-8">
          <button
            onClick={() => setPage(curPage - 1)}
            disabled={curPage === 1}
            aria-label="上一頁"
            className="w-10 h-10 rounded-full bg-white border-[3px] border-black text-[#4c59a1] flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 stroke-[3px]" />
          </button>
          {pageItems.map((it, idx) =>
            it === "…" ? (
              <span key={`e${idx}`} className="text-[#4c59a1] font-[900] px-0.5">…</span>
            ) : (
              <button
                key={it}
                onClick={() => setPage(it)}
                aria-label={`第 ${it} 頁`}
                aria-current={it === curPage ? "page" : undefined}
                className={`w-10 h-10 rounded-full border-[3px] border-black font-[900] flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition ${
                  it === curPage ? "bg-[#3ac0bf] text-white" : "bg-white text-[#4c59a1]"
                }`}
              >
                {it}
              </button>
            )
          )}
          <button
            onClick={() => setPage(curPage + 1)}
            disabled={curPage === pageCount}
            aria-label="下一頁"
            className="w-10 h-10 rounded-full bg-white border-[3px] border-black text-[#4c59a1] flex items-center justify-center shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>
      )}

      {preview && onMore && filtered.length > 0 && (
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
    <div ref={ptrRef} className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto overscroll-y-contain">
      {ptrIndicator}
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-8 relative">{inner}</div>
    </div>
  );
};

export default GroupOrderList;

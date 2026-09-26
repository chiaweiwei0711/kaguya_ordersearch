import React, { useState, useMemo, useEffect } from "react";
import { SectionHead, MoreButton } from "./Section";
import { ChevronLeft, ArrowRight, Search, ChevronRight, X, Check, ShoppingBag, Tag, SlidersHorizontal, Flame, LayoutGrid, Rows3 } from "lucide-react";
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
  initialTags?: string[];               // 從首頁「作品類別」點進來時，一進來就套用該作品篩選
  initialQuery?: string;                // 從首頁常駐搜尋框帶進來的關鍵字
  openTagPanel?: boolean;               // 從首頁「全部作品」點進來時，直接把作品面板打開
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

const GroupOrderList: React.FC<Props> = ({ teams, products, onSelect, loading, preview, onMore, onBack, onLookup, onRefresh, initialTags, openTagPanel, initialQuery }) => {
  // 下拉重整只掛在整頁的列表（首頁預覽那張黃卡不是自己捲的容器）
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(preview ? undefined : onRefresh);
  const [query, setQuery] = useState(initialQuery || "");
  const [sortBy, setSortBy] = useState<SortKey>("default");
  const [hot, setHot] = useState(false);      // 首頁預覽：最新 ↔ 熱銷（熱銷＝跟團人數多的在前）
  // 首頁預覽吃自己的切換，列表頁吃排序選單
  const effSort: SortKey = preview ? (hot ? "people_desc" : "default") : sortBy;
  const [showOpen, setShowOpen] = useState(true);
  const [showClosed, setShowClosed] = useState(true);
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(!!openTagPanel);   // 篩選面板（狀態／排序／檢視／作品都在裡面）
  const [pickedTags, setPickedTags] = useState<string[]>(initialTags || []);
  // 檢視方式：方塊（大圖好逛）／條列（一次看多團）；記住客人上次的選擇
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try { return localStorage.getItem("kgy_order_view") === "list" ? "list" : "grid"; } catch { return "grid"; }
  });
  useEffect(() => { try { localStorage.setItem("kgy_order_view", viewMode); } catch {} }, [viewMode]);

  useEffect(() => { if (initialTags && initialTags.length) setPickedTags(initialTags); }, [initialTags]);
  useEffect(() => { if (initialQuery) setQuery(initialQuery); }, [initialQuery]);
  useEffect(() => { if (openTagPanel) setFilterOpen(true); }, [openTagPanel]);

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

  const filterCount = pickedTags.length + (sortBy !== "default" ? 1 : 0) + (showOpen && showClosed ? 0 : 1);

  // 封面圖：後台「封面圖」欄優先（可放自己做的主題圖），沒填就退回該團第一張商品圖
  const coverOf = (t: GroupTeam) => t.cover || (products || []).find((p) => p.team === t.code && p.img)?.img || "";

  // 搜尋／排序／勾選變動 → 回第 1 頁
  useEffect(() => { setPage(1); }, [query, sortBy, showOpen, showClosed, pickedTags]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const curPage = Math.min(page, pageCount);
  const shown = preview ? filtered.slice(0, 4) : filtered.slice((curPage - 1) * PER_PAGE, curPage * PER_PAGE);
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

  // 換頁：回到最上面再看下一批（列表頁是自己捲的容器，不是整個視窗）
  const goPage = (n: number) => {
    setPage(n);
    requestAnimationFrame(() => {
      ptrRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  // 狀態勾選藥丸（玩具風：勾起＝填色＋✓，未勾＝白底淡字）
  const chip = (on: boolean, kind: "open" | "closed") =>
    `flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-[900] border border-black active:opacity-60 transition-all ${
      on
        ? (kind === "open" ? "bg-[#3ac0bf] text-white" : "bg-[#2b2b2b] text-white")
        : "bg-white text-[#4c59a1]/40"
    }`;

  const inner = (
    <>
      <div className={preview ? "" : "text-[#4c59a1]"}>
        <SectionHead en="PRE-ORDER" title="預購填單專區" count={preview ? undefined : filtered.length} />
      </div>

      {/* 首頁預覽：最新 ↔ 熱銷。只是換排序，不多佔一塊版面 */}
      {preview && (
        <div className="flex gap-2 mb-5 px-4 sm:px-0">
          {([[false, "最新開團"], [true, "熱銷"]] as [boolean, string][]).map(([val, label]) => {
            const on = hot === val;
            return (
              <button
                key={label}
                onClick={() => setHot(val)}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-[900] border border-black active:opacity-60 transition-all ${
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
        <button onClick={onLookup} className="w-full bg-white border border-black rounded-full px-3 py-2 flex items-center gap-3 mb-5 active:opacity-60 active:transition-all">
          <span className="w-9 h-9 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shrink-0">
            <Search className="w-5 h-5 stroke-[3px]" />
          </span>
          <span className="flex-1 text-left text-[#4c59a1] font-[900] text-base tracking-widest">填單明細查詢</span>
          <ChevronRight className="w-5 h-5 text-[#4c59a1] stroke-[3px] shrink-0" />
        </button>
      )}

      {/* 列表頁：主畫面只留搜尋 ＋ 一顆篩選；狀態／作品／排序／檢視全部收進底部面板，
          不然這裡會同時擠著六種控制項，客人第一眼看不出哪個才是重點 */}
      {!preview && (
        <div className="mb-5">
          <div className="flex items-center gap-2.5">
            <div className="flex-1 min-w-0 bg-white rounded-full p-1.5 pl-4 flex items-center gap-2 border border-black">
              <Search className="w-5 h-5 text-[#f8a3f4] stroke-[3px] shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜團名、商品名"
                className="w-full bg-transparent outline-none text-base font-[900] text-[#4c59a1] placeholder-gray-400 py-1.5"
              />
              {q && (
                <button onClick={() => setQuery("")} aria-label="清除搜尋" className="w-8 h-8 rounded-full bg-[#f8a3f4] text-white flex items-center justify-center shrink-0 active:scale-90 transition mr-1">
                  <X className="w-4 h-4 stroke-[3px]" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFilterOpen(true)}
              className="shrink-0 flex items-center gap-1.5 h-[52px] px-4 rounded-full border border-black bg-white text-[#4c59a1] font-[900] text-sm active:opacity-60 active:transition-all"
            >
              <SlidersHorizontal className="w-5 h-5 stroke-[2.5px]" />
              篩選
              {filterCount > 0 && (
                <span className="ml-0.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-[#f8a3f4] text-white text-[12px] flex items-center justify-center">{filterCount}</span>
              )}
            </button>
          </div>

          {/* 目前套用的條件：一眼看得到，也能單獨拿掉 */}
          {(pickedTags.length > 0 || !showOpen || !showClosed || sortBy !== "default") && (
            <div className="flex flex-wrap gap-2 mt-3">
              {sortBy !== "default" && (
                <button onClick={() => setSortBy("default")} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#4c59a1] text-white text-[13px] font-[900] border-2 border-black active:opacity-60 transition-all">
                  {SORT_OPTS.find(([v]) => v === sortBy)?.[1]}
                  <X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              )}
              {!showClosed && showOpen && (
                <button onClick={() => setShowClosed(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3ac0bf] text-white text-[13px] font-[900] border-2 border-black active:opacity-60 transition-all">
                  開團中<X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              )}
              {!showOpen && showClosed && (
                <button onClick={() => setShowOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2b2b2b] text-white text-[13px] font-[900] border-2 border-black active:opacity-60 transition-all">
                  已結單<X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              )}
              {pickedTags.map((t) => (
                <button key={t} onClick={() => toggleTag(t)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f8a3f4] text-white text-[13px] font-[900] border-2 border-black active:opacity-60 transition-all">
                  {t}<X className="w-3.5 h-3.5 stroke-[3px]" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 篩選面板：從底部滑出，一次把狀態／排序／檢視／作品都設完 */}
      {!preview && filterOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center" onClick={() => setFilterOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#fff170] rounded-t-[32px] border-t-[3px] border-x-[3px] border-black max-h-[86vh] overflow-y-auto animate-fade-in-up"
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="sticky top-0 bg-[#fff170] px-5 pt-4 pb-3 flex items-center border-b-2 border-black/10">
              <h3 className="text-[#4c59a1] font-[900] text-xl tracking-widest">篩選</h3>
              <button onClick={() => setFilterOpen(false)} aria-label="關閉" className="ml-auto w-9 h-9 rounded-full bg-white border border-black flex items-center justify-center active:scale-90 transition">
                <X className="w-4 h-4 stroke-[3px] text-[#4c59a1]" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-5">
              <div>
                <div className="font-[900] text-[#4c59a1]/60 text-[13px] tracking-widest mb-2">狀態</div>
                <div className="flex gap-2.5">
                  <button onClick={() => setShowOpen((v) => !v)} className={chip(showOpen, "open")}>
                    {showOpen && <Check className="w-4 h-4 stroke-[4px]" />}開團中
                  </button>
                  <button onClick={() => setShowClosed((v) => !v)} className={chip(showClosed, "closed")}>
                    {showClosed && <Check className="w-4 h-4 stroke-[4px]" />}已結單
                  </button>
                </div>
              </div>

              <div>
                <div className="font-[900] text-[#4c59a1]/60 text-[13px] tracking-widest mb-2">排序</div>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTS.map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => setSortBy(val)}
                      className={`px-4 py-2 rounded-full text-sm font-[900] border border-black active:opacity-60 transition-all ${
                        sortBy === val ? "bg-[#4c59a1] text-white" : "bg-white text-[#4c59a1]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-[900] text-[#4c59a1]/60 text-[13px] tracking-widest mb-2">檢視方式</div>
                <div className="flex gap-2">
                  {([["grid", "方塊", LayoutGrid], ["list", "條列", Rows3]] as const).map(([mode, label, Icon]) => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-[900] border border-black active:opacity-60 transition-all ${
                        viewMode === mode ? "bg-[#4c59a1] text-white" : "bg-white text-[#4c59a1]"
                      }`}
                    >
                      <Icon className="w-4 h-4 stroke-[3px]" />{label}
                    </button>
                  ))}
                </div>
              </div>

              {tagIndex.all.length > 0 && (
                <div>
                  <div className="font-[900] text-[#4c59a1]/60 text-[13px] tracking-widest mb-2">
                    作品{pickedTags.length > 0 && <span className="text-[#f8a3f4]">（已選 {pickedTags.length}）</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto">
                    {tagIndex.all.map((t) => {
                      const on = pickedTags.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTag(t)}
                          className={`px-3 py-1.5 rounded-full text-[13px] font-[900] border-2 border-black transition-all active:opacity-60 ${
                            on ? "bg-[#3ac0bf] text-white" : "bg-white text-[#4c59a1]"
                          }`}
                        >
                          {t}<span className={on ? "text-white/80 ml-1" : "text-[#4c59a1]/45 ml-1"}>{tagIndex.counts[t]}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-[#fff170] px-5 py-3 flex gap-2.5 border-t-2 border-black/10">
              <button
                onClick={() => { setPickedTags([]); setSortBy("default"); setShowOpen(true); setShowClosed(true); }}
                className="px-5 py-3 rounded-full bg-white text-[#4c59a1] font-[900] border border-black active:opacity-60 active:transition-all"
              >
                重設
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-3 rounded-full bg-[#4c59a1] text-white font-[900] border border-black active:opacity-60 active:transition-all"
              >
                看 {filtered.length} 個團
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="text-center text-[#4c59a1]/60 font-bold py-8">載入中…</p>}
      {!loading && shown.length === 0 && (
        <p className="text-center text-[#4c59a1]/70 font-bold py-8">{!preview && q ? `找不到符合「${q}」的團` : "目前沒有開團"}</p>
      )}

      {/* 方塊檢視：封面大圖一眼看出在賣什麼（列表頁限定） */}
      {(preview || viewMode === "grid") ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {shown.map((t) => {
            const open = isOpen(t);
            const left = daysLeft(t.closeAt);
            const cover = coverOf(t);
            // 綜合團可能同時屬於好幾部作品：列前兩部，多的用「…」帶過
            const ips = tagIndex.byTeam[t.code] || [];
            const ip = ips.length > 2 ? ips.slice(0, 2).join("、") + "…" : ips.join("、");
            return (
              <button
                key={t.code}
                onClick={() => onSelect(t.code)}
                className={`text-left rounded-2xl overflow-hidden flex flex-col border-2 border-transparent transition-all ${
                  open
                    ? "bg-white active:opacity-60"
                    : "bg-gray-100 opacity-80 active:scale-[0.98]"
                }`}
              >
                <div className={`relative aspect-square ${open ? "bg-[#eef0fa]" : "bg-gray-200"}`}>
                  {cover
                    ? <img src={cover} alt="" referrerPolicy="no-referrer" loading="lazy" className={`w-full h-full object-cover ${open ? "" : "grayscale opacity-70"}`} />
                    : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-10 h-10 text-[#4c59a1]/25 stroke-[2px]" /></div>}
                  <span className={`absolute top-2 left-2 text-[12px] font-[900] px-3 py-1 rounded-full ${
                    open ? "bg-[#3ac0bf] text-white" : "bg-[#2b2b2b] text-white"
                  }`}>
                    {open ? "開團中" : "已結單"}
                  </span>
                </div>
                <div className="p-3 flex flex-col gap-1.5 flex-1">
                  <div className={`font-[900] text-[13.5px] leading-tight line-clamp-3 ${open ? "text-[#4c59a1]" : "text-gray-400"}`}>{t.name}</div>
                  {ip && <span className={`text-[12px] font-[900] leading-none ${open ? "text-[#3ac0bf]" : "text-gray-400"}`}>{ip}</span>}
                  <div className="mt-auto pt-1 flex flex-wrap gap-1.5">
                    {open && <span className="text-[11px] font-[900] text-white bg-[#f43f5e] px-2.5 py-0.5 rounded-full">剩餘 {left} 天結單</span>}
                    {(t.joinPeople ?? 0) > 0 && (
                      <span className={`text-[11px] font-[900] px-2.5 py-0.5 rounded-full ${open ? "bg-[#3ac0bf] text-white" : "bg-gray-300 text-gray-600"}`}>{t.joinPeople} 人跟團</span>
                    )}
                  </div>
                  {t.openAt && <span className={`text-[12px] font-bold ${open ? "text-black/65" : "text-gray-400"}`}>開團日期：{fmtYMD(t.openAt)}</span>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
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
                open ? "bg-white active:opacity-60 border-2 border-transparent" : "bg-gray-100 border-2 border-transparent opacity-80 active:scale-[0.98]"
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
                {t.openAt && (
                  <span className="text-black font-bold text-[13px] leading-tight text-right">
                    <span className="text-black/55">開團日期</span><br />{fmtYMD(t.openAt)}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      )}

      {/* 分頁（每 30 團一頁；目前頁＝薄荷綠圓，其餘白底，全用 Soft Pop 配色） */}
      {!preview && pageCount > 1 && (
        <div className="flex justify-center items-center flex-wrap gap-2 mt-8">
          <button
            onClick={() => goPage(curPage - 1)}
            disabled={curPage === 1}
            aria-label="上一頁"
            className="w-10 h-10 rounded-full bg-white border border-black text-[#4c59a1] flex items-center justify-center active:opacity-60 transition disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 stroke-[3px]" />
          </button>
          {pageItems.map((it, idx) =>
            it === "…" ? (
              <span key={`e${idx}`} className="text-[#4c59a1] font-[900] px-0.5">…</span>
            ) : (
              <button
                key={it}
                onClick={() => goPage(it)}
                aria-label={`第 ${it} 頁`}
                aria-current={it === curPage ? "page" : undefined}
                className={`w-10 h-10 rounded-full border border-black font-[900] flex items-center justify-center active:opacity-60 transition ${
                  it === curPage ? "bg-[#3ac0bf] text-white" : "bg-white text-[#4c59a1]"
                }`}
              >
                {it}
              </button>
            )
          )}
          <button
            onClick={() => goPage(curPage + 1)}
            disabled={curPage === pageCount}
            aria-label="下一頁"
            className="w-10 h-10 rounded-full bg-white border border-black text-[#4c59a1] flex items-center justify-center active:opacity-60 transition disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 stroke-[3px]" />
          </button>
        </div>
      )}

      {preview && onMore && filtered.length > 0 && (
        <MoreButton label="看全部開團" onClick={onMore} />
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
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 pt-20 pb-8 relative">{inner}</div>
    </div>
  );
};

export default GroupOrderList;

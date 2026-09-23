import React, { useState, useEffect, useMemo, useRef } from "react";
import { ChevronRight, ShoppingBag } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { isOpen, daysLeft } from "../services/groupOrderService";
import { buildTagIndex } from "../services/ipTags";
import { logoOf } from "../services/ipLogos";

interface Props {
  teams: GroupTeam[];
  products: GroupProduct[];
  loading?: boolean;
  onSelectTeam: (code: string) => void;
  onSelectTag: (tag: string) => void;   // 點作品 → 進填單專區並套用該作品篩選
}

const AUTO_MS = 4500;

// 首頁的櫥窗：大輪播（開團中的團）＋ 動漫類別。
// 客人一進站先看到「現在能買什麼」，不是先看到查單框。
const HomeHero: React.FC<Props> = ({ teams, products, loading, onSelectTeam, onSelectTag }) => {
  // 熱門＝開團中、跟團人數多的在前（人數要等 live 回來才有，還沒回來前就是原本的最新開團順序）
  const openTeams = useMemo(
    () => teams.filter(isOpen).slice().sort((a, b) => (b.joinPeople ?? 0) - (a.joinPeople ?? 0)).slice(0, 8),
    [teams]
  );
  const tagIndex = useMemo(() => buildTagIndex(teams, products), [teams, products]);
  // 作品照「開團中的團數」排，沒有開團中的排後面
  const coverOf = (t: GroupTeam) => t.cover || products.find((p) => p.team === t.code && p.img)?.img || "";

  const tags = useMemo(() => {
    const openCount: Record<string, number> = {};
    const cover: Record<string, string> = {};
    // 圓圈裡的圖：該作品最近一團的封面（開團中的優先）
    // 先數開團中的團
    teams.filter(isOpen).forEach((t) => (tagIndex.byTeam[t.code] || []).forEach((x) => { openCount[x] = (openCount[x] || 0) + 1; }));
    // 圓圈裡的圖：優先用「只屬於這一部作品」的團封面，避免綜合團的圖被每部作品拿去用（文豪野犬掛我英圖那種）
    const pick = (only: boolean) => [...teams.filter(isOpen), ...teams].forEach((t) => {
      const ips = tagIndex.byTeam[t.code] || [];
      if (only && ips.length !== 1) return;
      ips.forEach((x) => { if (!cover[x]) { const c = coverOf(t); if (c) cover[x] = c; } });
    });
    pick(true);   // 單一作品團優先
    pick(false);  // 還沒圖的才退回綜合團
    return tagIndex.all
      .map((name) => ({ name, open: openCount[name] || 0, total: tagIndex.counts[name] || 0, cover: cover[name] || "", logo: logoOf(name) }))
      .sort((a, b) => b.open - a.open || b.total - a.total)
      .slice(0, 12);
  }, [teams, tagIndex, products]);

  const [idx, setIdx] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const paused = useRef(false);

  // 自動輪播：手指按著、或分頁切到背景時停
  useEffect(() => {
    if (openTeams.length < 2) return;
    const t = setInterval(() => {
      if (paused.current || document.visibilityState !== "visible") return;
      setIdx((i) => (i + 1) % openTeams.length);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [openTeams.length]);

  // 捲到目前那張（也讓手動滑動後的自動播接得上）
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const card = el.children[idx] as HTMLElement | undefined;
    if (card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }, [idx]);

  if (!loading && openTeams.length === 0) return null;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* ── 大輪播：開團中的團 ── */}
      <div className="px-4 sm:px-0 mb-2 flex items-baseline">
        <h2 className="text-white font-[900] text-xl tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">熱門開團商品</h2>
        {openTeams.length > 1 && <span className="ml-auto text-white/70 font-[900] text-xs">左右滑看更多</span>}
      </div>

      {loading ? (
        <div className="mx-4 sm:mx-0 h-52 rounded-[28px] bg-white/70 shadow-[0_10px_24px_rgba(0,0,0,0.18)] flex items-center justify-center text-[#4c59a1]/60 font-[900]">
          載入中…
        </div>
      ) : (
        <>
          <div
            ref={railRef}
            onTouchStart={() => { paused.current = true; }}
            onTouchEnd={() => { paused.current = false; }}
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 sm:px-0 pb-2"
            style={{ scrollbarWidth: "none" }}
          >
            {openTeams.map((t, i) => {
              const cover = coverOf(t);
              const left = daysLeft(t.closeAt);
              const ip = (tagIndex.byTeam[t.code] || [])[0] || "";
              return (
                <button
                  key={t.code}
                  onClick={() => onSelectTeam(t.code)}
                  onFocus={() => setIdx(i)}
                  className="snap-center shrink-0 w-full text-left rounded-[28px] overflow-hidden bg-white shadow-[0_10px_24px_rgba(0,0,0,0.22)] active:scale-[0.985] transition-transform"
                >
                  <div className="relative w-full aspect-[4/3] bg-[#eef0fa]">
                    {cover
                      ? <img src={cover} alt="" referrerPolicy="no-referrer" loading={i === 0 ? "eager" : "lazy"} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><ShoppingBag className="w-12 h-12 text-[#4c59a1]/25 stroke-[2px]" /></div>}
                    {/* 底部漸層讓白字看得清楚 */}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/75 to-transparent" />
                    <span className="absolute top-3 left-3 bg-[#3ac0bf] text-white text-[12px] font-[900] px-3 py-1 rounded-full shadow-[0_2px_0px_rgba(0,0,0,0.2)]">開團中</span>
                    <span className="absolute top-3 right-3 bg-[#f43f5e] text-white text-[12px] font-[900] px-3 py-1 rounded-full shadow-[0_2px_0px_rgba(0,0,0,0.2)]">剩 {left} 天結單</span>
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      {ip && <div className="text-[#fff170] font-[900] text-[13px] leading-none mb-1.5">{ip}</div>}
                      <div className="text-white font-[900] text-lg leading-tight line-clamp-2">{t.name}</div>
                      {(t.joinPeople ?? 0) > 0 && (
                        <span className="inline-block mt-2 bg-[#fff170] text-black text-[12px] font-[900] px-3 py-1 rounded-full shadow-[0_2px_0px_rgba(0,0,0,0.2)]">
                          {t.joinPeople} 人填單{(t.joinQty ?? 0) > 0 ? ` · ${t.joinQty} 件` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center px-4 py-3">
                    <span className="text-[#4c59a1]/70 font-[900] text-[13px]">{t.shipInfo ? `預計 ${t.shipInfo} 發貨` : "點進來看商品"}</span>
                    <span className="ml-auto flex items-center gap-1 text-[#4c59a1] font-[900] text-sm">
                      去填單 <ChevronRight className="w-4 h-4 stroke-[3px]" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* 圓點：現在是第幾團 */}
          {openTeams.length > 1 && (
            <div className="flex justify-center gap-1.5 mb-4">
              {openTeams.map((_, i) => (
                <button
                  key={i}
                  aria-label={`第 ${i + 1} 個團`}
                  onClick={() => setIdx(i)}
                  className={`h-2 rounded-full transition-all ${i === idx ? "w-5 bg-white" : "w-2 bg-white/35"}`}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── 動漫類別 ── */}
      {tags.length > 0 && (
        <>
          <div className="px-4 sm:px-0 mb-2 flex items-baseline">
            <h2 className="text-white font-[900] text-xl tracking-widest drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]">作品類別</h2>
            <button onClick={() => onSelectTag("")} className="ml-auto text-white/80 font-[900] text-xs underline underline-offset-2 active:opacity-60">看全部作品</button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto px-4 sm:px-0 pb-2" style={{ scrollbarWidth: "none" }}>
            {tags.map((t) => (
              <button
                key={t.name}
                onClick={() => onSelectTag(t.name)}
                className="shrink-0 w-[72px] flex flex-col items-center gap-1.5 active:translate-y-0.5 transition-transform"
              >
                <span className="relative w-[68px] h-[68px] rounded-full overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] flex items-center justify-center">
                  {t.logo
                    ? <img src={t.logo} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-[78%] h-[78%] object-contain" />
                    : t.cover
                      ? <img src={t.cover} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                      : <ShoppingBag className="w-7 h-7 text-[#4c59a1]/25 stroke-[2px]" />}
                  {t.open > 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-[#3ac0bf]/95 text-white text-[10px] font-[900] text-center py-0.5">{t.open} 團</span>
                  )}
                </span>
                <span className="font-[900] text-white text-[11px] leading-tight text-center line-clamp-2">{t.name}</span>
              </button>
            ))}
            {/* 最後一顆：看全部作品 */}
            <button
              onClick={() => onSelectTag("")}
              className="shrink-0 w-[72px] flex flex-col items-center gap-1.5 active:translate-y-0.5 transition-transform"
            >
              <span className="w-[68px] h-[68px] rounded-full bg-white/15 border-2 border-dashed border-white/60 flex items-center justify-center">
                <ChevronRight className="w-7 h-7 text-white stroke-[3px]" />
              </span>
              <span className="font-[900] text-white text-[11px] leading-tight text-center">全部作品</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default HomeHero;

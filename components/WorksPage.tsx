import React, { useMemo, useState } from "react";
import { ChevronLeft, Search, ShoppingBag, X } from "lucide-react";
import { GroupTeam, GroupProduct } from "../types";
import { isOpen } from "../services/groupOrderService";
import { buildTagIndex } from "../services/ipTags";
import { logoOf } from "../services/ipLogos";

interface Props {
  teams: GroupTeam[];
  products: GroupProduct[];
  loading?: boolean;
  onBack: () => void;
  onSelect: (tag: string) => void;   // 點作品 → 進填單專區並自動篩該作品
}

// 作品類別頁：列出全部作品，點一個就進填單專區、自動選好那部作品。
const WorksPage: React.FC<Props> = ({ teams, products, loading, onBack, onSelect }) => {
  const [q, setQ] = useState("");
  const tagIndex = useMemo(() => buildTagIndex(teams, products), [teams, products]);
  const coverOf = (t: GroupTeam) => t.cover || products.find((p) => p.team === t.code && p.img)?.img || "";

  const works = useMemo(() => {
    const openCount: Record<string, number> = {};
    const cover: Record<string, string> = {};
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
    const kw = q.trim().toLowerCase();
    return tagIndex.all
      .map((name) => ({ name, open: openCount[name] || 0, total: tagIndex.counts[name] || 0, cover: cover[name] || "", logo: logoOf(name) }))
      .filter((w) => !kw || w.name.toLowerCase().includes(kw));
  }, [teams, products, tagIndex, q]);

  // 中文照筆畫（Intl 的 stroke 排序），英文／數字開頭的另成一區照 A-Z
  const isLatin = (s: string) => /^[A-Za-z0-9]/.test(s.trim());
  const strokeCmp = useMemo(() => {
    try { return new Intl.Collator("zh-Hant-u-co-stroke").compare; }
    catch { return new Intl.Collator("zh-Hant").compare; }
  }, []);
  const groups = useMemo(() => {
    const open = works.filter((w) => w.open > 0).sort((a, b) => b.open - a.open || b.total - a.total);
    const rest = works.filter((w) => w.open === 0);
    const zh = rest.filter((w) => !isLatin(w.name)).sort((a, b) => strokeCmp(a.name, b.name));
    const en = rest.filter((w) => isLatin(w.name)).sort((a, b) => a.name.localeCompare(b.name, "en"));
    return [
      { key: "open", title: "開團中", items: open },
      { key: "zh", title: "中文作品（照筆畫）", items: zh },
      { key: "en", title: "英文・數字", items: en },
    ].filter((g) => g.items.length > 0);
  }, [works, strokeCmp]);

  return (
    <div className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto overscroll-y-contain">
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-8 relative">
        <button onClick={onBack} aria-label="返回" className="absolute top-6 left-5 w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <h2 className="text-[#4c59a1] font-[900] text-3xl sm:text-4xl tracking-widest text-center mb-2 mt-8">作品類別</h2>

        {/* 作品多，給個搜尋比較快找到 */}
        <div className="bg-white rounded-full p-2 flex items-center gap-2 shadow-[4px_4px_0px_#000] border-[3px] border-black mb-6">
          <Search className="ml-3 text-[#f8a3f4] w-5 h-5 stroke-[3px] shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜作品名"
            className="flex-1 bg-transparent outline-none font-[900] text-[#4c59a1] placeholder-gray-400 py-1"
          />
          {q && (
            <button onClick={() => setQ("")} aria-label="清除" className="w-8 h-8 rounded-full bg-[#eef0fa] text-[#4c59a1] flex items-center justify-center mr-1 active:scale-90 transition">
              <X className="w-4 h-4 stroke-[3px]" />
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-center text-[#4c59a1]/60 font-bold py-10">載入中…</p>
        ) : works.length === 0 ? (
          <p className="text-center text-[#4c59a1]/70 font-bold py-10">找不到符合「{q}」的作品</p>
        ) : (
          groups.map((g) => (
          <div key={g.key} className="mb-8">
            <h3 className="text-[#4c59a1] font-[900] text-base tracking-widest mb-3 pl-1">{g.title}<span className="text-[#4c59a1]/45 ml-2 text-sm">{g.items.length}</span></h3>
            <div className="grid grid-cols-3 gap-4">
            {g.items.map((w) => (
              <button
                key={w.name}
                onClick={() => onSelect(w.name)}
                className="flex flex-col items-center gap-2 active:translate-y-0.5 transition-transform"
              >
                <span className="relative w-full aspect-square rounded-full overflow-hidden bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] flex items-center justify-center">
                  {w.logo
                    ? <img src={w.logo} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-[78%] h-[78%] object-contain" />
                    : w.cover
                      ? <img src={w.cover} alt="" referrerPolicy="no-referrer" loading="lazy" className="w-full h-full object-cover" />
                      : <ShoppingBag className="w-8 h-8 text-[#4c59a1]/25 stroke-[2px]" />}
                  {w.open > 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-[#3ac0bf]/95 text-white text-[10px] font-[900] text-center py-0.5">開團中 {w.open}</span>
                  )}
                </span>
                <span className="font-[900] text-[#4c59a1] text-[12px] leading-tight text-center line-clamp-2">{w.name}</span>
                <span className="font-[900] text-[#4c59a1]/45 text-[11px] -mt-1.5">{w.total} 團</span>
              </button>
            ))}
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WorksPage;

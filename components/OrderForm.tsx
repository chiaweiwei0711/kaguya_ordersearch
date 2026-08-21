import React, { useState, useMemo, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X, CheckCircle2, AlertTriangle, Search, Info, Check, Loader2, UserX } from "lucide-react";
import { GroupTeam, GroupProduct, GroupCartItem } from "../types";
import { submitGroupOrder, daysLeft, fmtYMD, isOpen, checkNickBound } from "../services/groupOrderService";
import { APP_CONFIG } from "../config";
import { usePullToRefresh } from "./usePullToRefresh";
import ProductCarousel from "./ProductCarousel";

const ALL_CAT = "__ALL__";   // 類別 pill 的「全部」；用哨符避免跟真實類別名撞名

interface Props {
  team: GroupTeam;
  products: GroupProduct[];
  loadingItems?: boolean;   // 商品是點進來才抓的，抓的期間要有回饋
  onBack: () => void;
  onGoQuery?: () => void;
  onPreview?: (nick: string) => void;   // 帶暱稱去「填單明細查詢」自動查
  onRefresh?: () => Promise<any> | any; // 下拉重整：重抓這團的商品與人數
}

const OrderForm: React.FC<Props> = ({ team, products, loadingItems, onBack, onGoQuery, onPreview, onRefresh }) => {
  // 暱稱記住上次填的：同一支手機第二次以後就不用再打（回頭客佔大多數）
  const [nick, setNick] = useState(() => { try { return localStorage.getItem("kg_nick") || ""; } catch { return ""; } });
  const [nickState, setNickState] = useState<"idle" | "checking" | "ok" | "unbound" | "unknown">("idle");
  const [showUnbound, setShowUnbound] = useState(false);   // 「尚未綁定」小視窗
  const [bypass, setBypass] = useState(false);             // 客人自己確認「我有綁定」→ 這次放行
  const nickRef = useRef<HTMLInputElement>(null);
  const nickSeq = useRef(0);
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(onRefresh);
  const [pay, setPay] = useState("匯款");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [activeCat, setActiveCat] = useState("");   // "" = 還沒選（預設吃第一個類別）；ALL_CAT = 全部
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [zoomP, setZoomP] = useState<GroupProduct | null>(null);
  const [zoomIdx, setZoomIdx] = useState(0);
  const zStart = useRef({ x: 0, y: 0 });

  // 暱稱綁定即時檢查：停手 0.5 秒才問，打錯當場就會變 ❌，改對了自己變 ✅、送出鈕自動解鎖
  useEffect(() => {
    setBypass(false);
    const q = nick.trim();
    if (!q) { setNickState("idle"); nickSeq.current++; return; }
    setNickState("checking");
    const my = ++nickSeq.current;
    const t = setTimeout(async () => {
      const r = await checkNickBound(q);
      if (my !== nickSeq.current) return;      // 期間又打了新字 → 舊結果丟掉
      setNickState(r === true ? "ok" : r === false ? "unbound" : "unknown");
    }, 500);
    return () => clearTimeout(t);
  }, [nick]);

  const grouped = useMemo(() => {
    const m = new Map<string, { p: GroupProduct; idx: number }[]>();
    products.forEach((p, idx) => {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push({ p, idx });
    });
    return Array.from(m.entries());
  }, [products]);

  const setQ = (idx: number, v: number) => setQty((s) => ({ ...s, [idx]: Math.max(0, v) }));
  // 預設就是「全部」按下去的狀態（圖片全 lazy，捲到才載）。
  // 換團導致選過的類別不存在時，自動退回全部。
  const effCat = useMemo(() => {
    const cats = grouped.map(([c]) => c);
    return cats.includes(activeCat) ? activeCat : ALL_CAT;
  }, [grouped, activeCat]);
  const shownGroups = useMemo(
    () => (effCat === ALL_CAT ? grouped : grouped.filter(([c]) => c === effCat)),
    [grouped, effCat]
  );
  const clearAll = () => { if (window.confirm("確定清空所有選擇？")) setQty({}); };

  const cart: GroupCartItem[] = useMemo(
    () =>
      products
        .map((p, idx) => ({ p, idx, q: qty[idx] || 0 }))
        .filter((x) => x.q >= 1)
        .map((x) => ({ type: x.p.category, label: `#${x.p.no} ${x.p.name}`, qty: x.q, price: x.p.price })),
    [qty, products]
  );
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.qty * i.price, 0);
  const left = daysLeft(team.closeAt);
  const teamOpen = isOpen(team); // 結單後仍可點進來瀏覽，但不能填單／加購
  // 已結單又沒人填單就不放第二張卡（那團不能跟了，講「當第一個」很怪）→ 也連帶不顯示「可以滑」的箭頭
  const showJoinCard = (team.joinPeople ?? 0) > 0 || teamOpen;

  const openConfirm = () => {
    if (!isOpen(team)) { alert("本團已結單，無法再下單囉"); return; }
    if (!nick.trim()) { alert("請先填社群暱稱"); return; }
    // 查無此暱稱 → 跳小視窗（查不到綁定表本身時 nickState 是 unknown，一律放行）
    if (nickState === "unbound" && !bypass) { setShowUnbound(true); return; }
    if (!cart.length) { alert("還沒選任何商品"); return; }
    if (localStorage.getItem(`kaguya_order_done_${team.code}`)) {
      if (!window.confirm("本裝置已下單過一次，是否要繼續訂購？")) return;
    }
    setShowConfirm(true);
  };

  // 同一張單的單號：重試沿用同一個 → 後端只會收一次（防重複下單）
  const orderIdRef = React.useRef<string>("");
  const doSend = async () => {
    // 頁面開著跨過結單時間再按送出也要擋（isOpen 每次呼叫都重新比對現在時間）
    if (!isOpen(team)) { setShowConfirm(false); alert("本團已結單，無法再下單囉"); return; }
    setSubmitting(true);
    try {
      if (!orderIdRef.current) orderIdRef.current = `${team.code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const r = await submitGroupOrder(team, nick.trim(), cart, pay, orderIdRef.current);
      if (r && r.ok === false) { setShowConfirm(false); alert(r.message || "本團已結單，無法送出"); return; }
      localStorage.setItem(`kaguya_order_done_${team.code}`, "1");
      try { localStorage.setItem("kg_nick", nick.trim()); } catch (_) {}   // 下次填單自動帶入
      orderIdRef.current = "";      // 這張單已收下 → 清空單號，之後客人「加買一單」會是全新的單，不會被當成重複
      setShowConfirm(false);
      setDone(true);
    } catch {
      alert("網路不太穩，請再按一次送出（放心，系統會自動避免重複下單）");
    } finally {
      setSubmitting(false);
    }
  };

  // ── 送出成功 ──
  if (done) {
    return (
      <div className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto px-6 py-12 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-[#3ac0bf]">
            <CheckCircle2 className="w-11 h-11 stroke-[2.5px]" />
          </div>
          <h2 className="text-2xl font-[900] text-[#4c59a1]">填單已送出！</h2>
          <p className="text-[#4c59a1] font-[900] text-lg">共 {count} 件　預估 ${total} 元</p>
          <p className="text-[#4c59a1]/75 text-xs font-bold leading-relaxed max-w-xs">本金額未包含可能需要二補的國際運費或境內運費，實際金額以結單後訂單狀態查詢顯示為主！</p>
          <div className="bg-white text-[#4c59a1] font-bold rounded-2xl px-5 py-3 max-w-sm text-sm leading-relaxed shadow-sm flex items-start gap-2 text-left">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#f43f5e] stroke-[2.5px] mt-0.5" />
            <span>結單並按讚留言後才會查詢到訂單！請記得去貼文留言「已填單」！</span>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => onPreview?.(nick.trim())} className="bg-white border-[3px] border-black text-[#4c59a1] font-[900] px-5 py-3 rounded-full shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition flex items-center gap-2">
              <Search className="w-4 h-4 stroke-[3px]" /> 填單明細查詢
            </button>
            <button onClick={onGoQuery ?? onBack} className="bg-[#3ac0bf] text-white font-[900] px-7 py-3 rounded-full active:scale-95 transition">回到首頁</button>
          </div>
        </div>
      </div>
    );
  }

  const cartByType: Record<string, GroupCartItem[]> = {};
  cart.forEach((it) => { (cartByType[it.type] = cartByType[it.type] || []).push(it); });

  // 看大圖 gallery：湊齊該商品所有圖（沒 images 就退回單張 img），含上下張與張數
  const zImgs = zoomP ? (zoomP.images.length ? zoomP.images : [zoomP.img].filter(Boolean)) : [];
  const zTotal = zImgs.length;
  const zCur = Math.min(zoomIdx, Math.max(0, zTotal - 1));
  const zGo = (d: number) => { if (zTotal) setZoomIdx((i) => (i + d + zTotal) % zTotal); };

  return (
    <div ref={ptrRef} className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto overscroll-y-contain">
      {ptrIndicator}
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-7 relative">
        {/* 返回 */}
        <button onClick={onBack} aria-label="返回" className="w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition mb-4">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        {/* 團資訊：橫向滑動卡片（右邊故意露出下一張的一角＝可以滑的暗示） */}
        {/* scroll-pl 一定要跟 px 一樣：不然 snap 會把左邊 padding 捲掉，卡片會比下面內容凸出去 */}
        <div className="mb-4 -mx-5 sm:-mx-7 px-5 sm:px-7 scroll-pl-5 sm:scroll-pl-7 overflow-x-auto snap-x snap-mandatory no-scrollbar">
          <div className="flex gap-3">
            {/* 第 1 張：團資訊 */}
            <div className={`snap-start shrink-0 bg-white rounded-2xl px-5 py-4 ${showJoinCard ? "w-[87%]" : "w-full"}`}>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-[#4c59a1]/70 font-bold text-sm">訂購表單 {team.code}</span>
                {team.openAt && <span className="text-black font-[900] text-sm shrink-0">{fmtYMD(team.openAt)}</span>}
              </div>
              <div className="text-[#4c59a1] font-[900] text-xl leading-snug mt-0.5">{team.name}</div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {teamOpen && left > 0 && (
                  <span className="text-[11px] font-[900] text-[#f43f5e] border-2 border-[#f43f5e] bg-white px-2.5 py-0.5 rounded-full">剩餘{left}天結單</span>
                )}
                {team.shipInfo && (
                  <span className="text-[11px] font-[900] text-[#f43f5e] border-2 border-[#f43f5e] bg-white px-2.5 py-0.5 rounded-full">預計{team.shipInfo}發貨</span>
                )}
                {teamOpen
                  ? <span className="text-sm font-[900] text-white bg-[#3ac0bf] px-4 py-1 rounded-full">開團中</span>
                  : <span className="text-sm font-[900] text-white bg-[#2b2b2b] px-4 py-1 rounded-full">已結單</span>}
                {showJoinCard && (
                  <span aria-hidden className="ml-auto text-[#4c59a1]/45 animate-nudge-x shrink-0">
                    <ChevronRight className="w-5 h-5 stroke-[3px]" />
                  </span>
                )}
              </div>
            </div>

            {/* 第 2 張：跟團熱度。只給數字，不會出現任何人的暱稱。
                已結單又沒人填單就整張不顯示（那團已經不能跟了，講「當第一個」很怪） */}
            {showJoinCard && (
            <div className="snap-start shrink-0 w-[87%] bg-[#4c59a1] rounded-2xl px-6 py-5 flex flex-col justify-center">
              <span className="self-start bg-[#fff170] text-[#4c59a1] text-[13px] font-[900] px-3 py-1 rounded-full">填單統計</span>
              {(team.joinPeople ?? 0) > 0 ? (
                <div className="mt-4 text-white font-[900] text-xl">
                  <div className="flex items-baseline">
                    已有<span className="text-[44px] leading-none mx-1.5">{team.joinPeople}</span>人填單
                  </div>
                  <div className="flex items-baseline mt-3">
                    共<span className="text-[44px] leading-none mx-1.5">{team.joinQty ?? 0}</span>件商品
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-white font-[900] text-2xl leading-snug">持續開放喊單中～</div>
              )}
            </div>
            )}
          </div>
        </div>

        {team.note && (
          <div className="bg-white rounded-2xl px-5 py-4 mb-4 shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
            <div className="flex items-center gap-2 text-[#3ac0bf] font-[900] text-sm mb-1.5">
              <Info className="w-4 h-4 stroke-[3px]" /> 團務備註・二補標準
            </div>
            <p className="text-[#4c59a1] font-bold text-sm leading-relaxed whitespace-pre-wrap">{team.note}</p>
          </div>
        )}

        {!teamOpen && (
          <div className="bg-gray-100 text-gray-600 font-[900] text-sm rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[2.5px] text-[#f43f5e]" /> 本團已結單，以下僅供瀏覽，無法再下單囉
          </div>
        )}

        {teamOpen && (<>
        {/* 1. 暱稱 */}
        <div className="font-[900] text-[#4c59a1] text-lg mb-1">1. 填寫您的社群暱稱<span className="text-[#f43f5e]">*</span></div>
        <div className="relative">
          <input
            ref={nickRef}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="請輸入您的社群暱稱"
            className={`w-full px-4 py-3 pr-12 rounded-xl bg-white text-[#4c59a1] font-bold outline-none placeholder-gray-400 ring-2 transition ${
              nickState === "ok" ? "ring-[#3ac0bf]" : nickState === "unbound" ? "ring-[#f43f5e]" : "ring-transparent focus:ring-[#3ac0bf]"
            }`}
          />
          {/* 右邊那顆狀態燈：確認中 / 已綁定 / 查無此暱稱 */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {nickState === "checking" && <Loader2 className="w-5 h-5 stroke-[3px] text-[#4c59a1]/35 animate-spin" />}
            {nickState === "ok" && (
              <span className="w-6 h-6 rounded-full bg-[#3ac0bf] flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[4px] text-white" />
              </span>
            )}
            {nickState === "unbound" && (
              <span className="w-6 h-6 rounded-full bg-[#f43f5e] flex items-center justify-center">
                <X className="w-4 h-4 stroke-[4px] text-white" />
              </span>
            )}
          </span>
        </div>

        {nickState === "ok" ? (
          <p className="text-[#3ac0bf] text-xs font-[900] mt-2 mb-5">已綁定，可以填單囉！</p>
        ) : nickState === "unbound" ? (
          <p className="text-[#f43f5e] text-xs font-[900] mt-2 mb-5">查無此暱稱！請確認有沒有打錯，或先到官賴綁定。</p>
        ) : (
          <p className="text-[#f43f5e] text-xs font-bold mt-2 mb-5">提醒：請務必確認已至官賴綁定社群暱稱！未綁定恕無法受理訂單！</p>
        )}
        </>)}

        {/* 2. 喊單 */}
        <div className="font-[900] text-[#4c59a1] text-lg mb-2">{teamOpen ? "2. 喊單" : "商品一覽"}<span className="text-[#4c59a1]/60 text-sm font-bold">（選類別看商品）</span></div>

        {/* 商品是點進這一團才抓的，抓的期間給個回饋，不然畫面會空一下讓人以為壞了 */}
        {loadingItems && products.length === 0 && (
          <div className="bg-white rounded-2xl px-5 py-8 text-center text-[#4c59a1]/70 font-[900]">
            商品載入中…
          </div>
        )}

        {/* 類別 pill 條：可橫向捲動，選中的填色 */}
        <div className="-mx-5 sm:-mx-7 px-5 sm:px-7 mb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 w-max pb-1">
            {[[ALL_CAT, `全部（${products.length}）`] as [string, string]].concat(
              grouped.map(([cat, list]) => [cat, `${cat}（${list.length}）`] as [string, string])
            ).map(([val, label]) => {
              const on = effCat === val;
              const picked = val === ALL_CAT
                ? Object.values(qty).reduce((s, n) => s + (n || 0), 0)
                : (grouped.find(([c]) => c === val)?.[1] || []).reduce((s, x) => s + (qty[x.idx] || 0), 0);
              return (
                <button
                  key={val}
                  onClick={() => setActiveCat(val)}
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-[900] border-[3px] border-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all ${
                    on ? "bg-[#3ac0bf] text-white" : "bg-white text-[#4c59a1]"
                  }`}
                >
                  {label}
                  {picked > 0 && (
                    <span className="bg-[#fff170] text-[#4c59a1] text-[11px] px-1.5 py-0.5 rounded-full">{picked}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {shownGroups.map(([cat, list]) => {
          const catCount = list.reduce((s, x) => s + (qty[x.idx] || 0), 0);
          return (
            <div key={cat} className="mb-4">
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="font-[900] text-[#4c59a1] text-base">{cat}</span>
                <span className="text-[#4c59a1]/55 font-bold text-sm">{list.length} 項</span>
                {catCount > 0 && <span className="bg-[#fff170] text-[#4c59a1] text-xs font-[900] px-2 py-0.5 rounded-full">已選 {catCount}</span>}
              </div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {list.map(({ p, idx }) => {
                    const q = qty[idx] || 0;
                    return (
                      <div key={idx} className={`rounded-xl p-2 border-2 transition ${q >= 1 ? "border-[#3ac0bf] bg-[#eafcfb]" : "border-transparent bg-white"}`}>
                        <div className="relative">
                          <ProductCarousel images={p.images} onTap={() => teamOpen && setQ(idx, q >= 1 ? 0 : 1)} className={teamOpen ? "cursor-pointer" : ""} />
                          <button type="button" aria-label="看大圖" onClick={(e) => { e.stopPropagation(); setZoomP(p); setZoomIdx(0); }} className="absolute top-1 right-1 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition"><ZoomIn size={16} /></button>
                        </div>
                        <div className="text-[13px] text-[#4c59a1] font-bold mt-1 leading-tight truncate">#{p.no} {p.name}</div>
                        {p.spec && <div className="text-[11px] text-[#4c59a1]/60 font-bold leading-tight truncate">{p.spec}</div>}
                        <div className="text-[#4c59a1] font-[900] text-base">${p.price}</div>
                        {teamOpen && (
                        <div className="flex items-center justify-between mt-1">
                          <button onClick={() => setQ(idx, q - 1)} className="w-7 h-7 rounded-full bg-[#e6e9ff] text-[#4c59a1] font-black">−</button>
                          <input value={q} onChange={(e) => setQ(idx, parseInt(e.target.value) || 0)} inputMode="numeric" className="w-9 text-center font-bold text-[#4c59a1] bg-transparent outline-none" />
                          <button onClick={() => setQ(idx, q + 1)} className="w-7 h-7 rounded-full bg-[#3ac0bf] text-white font-black">＋</button>
                        </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* 3. 付款方式 */}
        {teamOpen && (
          <div className="mt-6">
            <div className="font-[900] text-[#4c59a1] text-lg mb-2">3. 付款方式<span className="text-[#f43f5e]">*</span></div>
            <div className="grid grid-cols-2 gap-3">
              {["匯款", "無卡"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPay(m)}
                  className={`py-3.5 rounded-2xl font-[900] border-2 transition active:scale-95 ${pay === m ? "bg-[#3ac0bf] text-white border-[#3ac0bf] shadow-[0_4px_0px_rgba(0,0,0,0.15)]" : "bg-white text-[#4c59a1] border-[#4c59a1]/15"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 底部：已選 / 清空 / 送出 */}
        {teamOpen ? (
          <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t-2 border-[#4c59a1]/15">
            <span className="font-[900] text-[#4c59a1]">已選 {count} 件　約 ${total}</span>
            <div className="flex gap-2">
              <button onClick={clearAll} className="bg-gray-300 text-white font-[900] px-4 py-2.5 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all">清空</button>
              <button onClick={openConfirm} className="bg-[#3ac0bf] text-white font-[900] px-5 py-2.5 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-none transition-all">送出填單</button>
            </div>
          </div>
        ) : (
          <div className="mt-6 pt-4 border-t-2 border-[#4c59a1]/15 text-center text-gray-500 font-[900]">本團已結單，無法再下單</div>
        )}
      </div>

      {/* 暱稱尚未綁定：擋在送出前，但留一條「我確定有綁定」的路（客人改過 LINE 暱稱時不會被鎖死） */}
      {showUnbound && (
        <div className="fixed inset-0 z-[105] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 border-[3px] border-black shadow-[6px_6px_0px_#000]">
            <div className="w-14 h-14 rounded-full bg-[#f43f5e] flex items-center justify-center mx-auto mb-3">
              <UserX className="w-8 h-8 stroke-[2.5px] text-white" />
            </div>
            <div className="font-[900] text-[#4c59a1] text-xl text-center mb-1.5">您的暱稱尚未綁定！</div>
            <div className="text-center text-sm font-bold text-[#4c59a1]/70 mb-5 leading-relaxed">
              「<span className="text-[#f43f5e] font-[900]">{nick.trim()}</span>」在官賴查不到綁定紀錄。<br />可能是打錯字，或還沒去官賴綁定。
            </div>
            <a
              href={APP_CONFIG.LINE_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-[#3ac0bf] text-white font-[900] py-3.5 rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition mb-2.5"
            >
              先去綁定
            </a>
            <button
              onClick={() => { setShowUnbound(false); setTimeout(() => nickRef.current?.focus(), 50); }}
              className="w-full bg-white text-[#4c59a1] font-[900] py-3.5 rounded-full border-[3px] border-black shadow-[4px_4px_0px_#000] active:translate-y-0.5 active:shadow-[2px_2px_0px_#000] transition"
            >
              重新填寫暱稱
            </button>
            <button
              onClick={() => { setBypass(true); setShowUnbound(false); setShowConfirm(true); }}
              className="w-full text-center text-[#4c59a1]/45 text-xs font-bold mt-4 underline underline-offset-2"
            >
              我確定已經綁定過了，仍要送出
            </button>
          </div>
        </div>
      )}

      {/* 確認 modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <div className="font-[900] text-[#4c59a1] text-lg mb-1">確認填單</div>
            <div className="text-sm text-gray-500 mb-3">暱稱：{nick}　·　付款方式：<span className="text-[#3ac0bf] font-[900]">{pay}</span></div>
            {Object.entries(cartByType).map(([t, items]) => (
              <div key={t} className="mb-3">
                <div className="font-[900] text-[#3ac0bf] text-sm mb-1">{t}（{items.length} 款）</div>
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between text-sm text-[#4c59a1] py-0.5">
                    <span className="truncate mr-2">{it.label}</span>
                    <span className="shrink-0">×{it.qty}　${it.price * it.qty}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between font-[900] text-[#4c59a1] border-t-2 border-[#e6e9ff] pt-2 text-lg">
              <span>總金額</span><span>${total}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">實際金額以訂購完成之查詢表確認為準</div>
            <div className="bg-white border-2 border-[#f43f5e] text-[#f43f5e] font-bold text-xs rounded-xl px-3 py-2.5 mt-3 leading-relaxed flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 stroke-[2.5px] mt-0.5" /><span>送出完成後，請務必至留言區回覆「已填單」！未回覆已填單者不會計算訂購！！</span></div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowConfirm(false)} disabled={submitting} className="flex-1 bg-white border-2 border-[#3ac0bf] text-[#4c59a1] font-[900] py-3 rounded-full">修改訂單</button>
              <button onClick={doSend} disabled={submitting} className="flex-1 bg-[#3ac0bf] text-white font-[900] py-3 rounded-full active:scale-95 transition">{submitting ? "送出中…" : "確認送出"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 看大圖 lightbox（多圖：左右圓箭頭＋左下張數＋原本的 ✕，可左右滑） */}
      {zoomP && (
        <div onClick={() => setZoomP(null)} className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div
              className="relative"
              onPointerDown={(e) => { zStart.current = { x: e.clientX, y: e.clientY }; }}
              onPointerUp={(e) => { const dx = e.clientX - zStart.current.x, dy = e.clientY - zStart.current.y; if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) zGo(dx < 0 ? 1 : -1); }}
            >
              <img src={zImgs[zCur]} referrerPolicy="no-referrer" draggable={false} className="w-full max-h-[62vh] object-contain rounded-t-3xl bg-white select-none" />
              <button type="button" aria-label="關閉" onClick={() => setZoomP(null)} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center active:scale-90 transition z-10"><X size={18} /></button>
              {zTotal > 1 && (
                <>
                  <button type="button" aria-label="上一張" onClick={() => zGo(-1)} className="absolute top-1/2 -translate-y-1/2 left-2 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center active:bg-black/55 transition z-10"><ChevronLeft size={24} /></button>
                  <button type="button" aria-label="下一張" onClick={() => zGo(1)} className="absolute top-1/2 -translate-y-1/2 right-2 w-11 h-11 rounded-full bg-black/40 text-white flex items-center justify-center active:bg-black/55 transition z-10"><ChevronRight size={24} /></button>
                  <span className="absolute left-3 bottom-3 bg-white/85 text-gray-700 text-sm font-bold px-3 py-1 rounded-lg">{zCur + 1}/{zTotal}</span>
                </>
              )}
            </div>
            <div className="p-4">
              <div className="font-[900] text-[#4c59a1] text-base leading-snug">#{zoomP.no} {zoomP.name}</div>
              {zoomP.spec && <div className="text-sm text-[#4c59a1]/70 font-bold mt-1.5 leading-relaxed">{zoomP.spec}</div>}
              <div className="text-[#4c59a1] font-[900] text-xl mt-2">${zoomP.price}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;

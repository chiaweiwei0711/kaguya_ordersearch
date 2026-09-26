import React, { useState, useMemo, useRef, useEffect } from "react";
import { putTeam, teamInCart } from "../services/cart";
import { ChevronLeft, ChevronRight, ZoomIn, X, CheckCircle2, AlertTriangle, Search, Info, Check, Loader2, UserX, UserCheck, ShoppingCart } from "lucide-react";
import { GroupTeam, GroupProduct, GroupCartItem, MySubmission } from "../types";
import { submitGroupOrder, daysLeft, fmtYMD, isOpen, checkNickBound, fetchTeamStat, fetchMySubmissions, itemKey } from "../services/groupOrderService";
import type { TeamStat } from "../services/groupOrderService";
import { APP_CONFIG } from "../config";
import { getLineIdentity, loginWithLine, checkFriendship } from "../services/lineIdentity";
import type { LineIdentity } from "../services/lineIdentity";
import { usePullToRefresh } from "./usePullToRefresh";
import ProductCarousel from "./ProductCarousel";

const ALL_CAT = "__ALL__";   // 類別 pill 的「全部」；用哨符避免跟真實類別名撞名

// 成團進度條：滿 N 的倍數成團。目標＝下一個倍數（8 件→8/12）；已成團的段落青綠、還沒滿的那段紅；每過一關畫一顆里程碑點。
// ordered 拿不到（GAS 忙）就當 0：仍看得到「滿 6 成團」的規則，只是少了目前件數。
const MinBar: React.FC<{ min: number; ordered: number; big?: boolean }> = ({ min, ordered, big }) => {
  const n = Math.max(0, ordered), m = Math.max(1, min);
  const done = n > 0 && n % m === 0;
  const target = done ? n : Math.ceil(Math.max(n, 1) / m) * m;   // 下一個倍數
  const reached = Math.floor(n / m) * m;                          // 已成團的件數（綠色段落）
  const G = "#49d5df", R = "#e46b58";
  const ticks: number[] = [];
  for (let t = m; t < target; t += m) ticks.push(t);
  return (
    <div className={big ? "mt-2" : "mt-1"}>
      <div className={`flex justify-between items-baseline font-[900] leading-none ${big ? "text-sm" : "text-[11px]"}`}>
        <span className="truncate">
          {reached > 0 && <span style={{ color: G }}>已成團{reached}</span>}
          {!done && (
            <>
              {reached > 0 && <span className="text-[#283d3e]/40">，</span>}
              <span style={{ color: R }}>差{target - n}件{reached > 0 ? "成下一團" : "成團"}</span>
            </>
          )}
        </span>
        <span className="text-[#283d3e]/60 shrink-0 ml-1">{n}/{target}</span>
      </div>
      <div className={`relative rounded-full mt-1 ${big ? "h-2.5" : "h-2"}`} style={{ background: R + "22" }}>
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (n / target) * 100)}%`, background: R }} />
        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${(reached / target) * 100}%`, background: G }} />
        {ticks.map((t) => (
          <span key={t} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 bg-white" style={{ left: `${(t / target) * 100}%`, borderColor: G }} />
        ))}
      </div>
    </div>
  );
};

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
  const [autoNick, setAutoNick] = useState(false);   // 暱稱是 LINE 身分自動帶入的（不是客人自己打的）
  const nickTouched = useRef(false);                 // 客人只要動過這格，就不再被自動帶入蓋掉
  // 外面來的陌生人：商品全部看得到，按「送出填單」才要求 LINE 登入＋加官方帳號好友。
  // 社群（OpenChat）點進來那群 LIFF 起不來（status=unavailable）＝一律放行，他們本來就是社群裡綁定過的人。
  const [lineId, setLineId] = useState<LineIdentity | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);   // null＝查不到，當作不擋
  const [showLineGate, setShowLineGate] = useState(false);
  const [friendRechecking, setFriendRechecking] = useState(false);
  // 人數／件數／各品項已訂件數／狀態／結單時間：一次跟 GAS 拿（teamStat），進頁抓、送單成功再抓、下拉重整抓、從 LINE 切回來也抓。
  // 拿不到＝null → 畫面顯示「更新中」而不是舊數字或 0（2026-09-15 她回報客人從 LINE 點進來看到舊人數，以為沒喊到）
  const [stat, setStat] = useState<TeamStat | null>(null);
  const [statLoading, setStatLoading] = useState(true);
  const lastStatAt = useRef(0);
  const loadStat = React.useCallback(async (fresh = false) => {
    setStatLoading(true);
    const s = await fetchTeamStat(team.code, fresh);
    lastStatAt.current = Date.now();
    if (s) setStat(s);
    setStatLoading(false);
  }, [team.code]);
  useEffect(() => { setStat(null); loadStat(); }, [loadStat]);
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible" && Date.now() - lastStatAt.current > 20000) loadStat(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [loadStat]);
  const stats: Record<string, number> = stat?.items ?? {};
  // 狀態／結單時間以 teamStat 回來的為準（她剛結單、直接開連結也要馬上看到已結單）
  const liveTeam = useMemo(() => (stat ? { ...team, status: stat.teamStatus || team.status, closeAt: stat.closeAt || team.closeAt } : team), [team, stat]);
  const people = stat ? stat.people : (team.joinPeople ?? 0);
  const joinQty = stat ? stat.qty : (team.joinQty ?? 0);
  // ⚠️ 一定要 useCallback：下拉重整的 hook 只要收到「新的函式」就會重掛監聽器並把手勢歸零，
  //    而手指一拉畫面就重繪 → 每次重繪都給新函式＝拉第一下就斷（2026-09-12 這樣寫，訂單頁下拉重整整個失效）
  const refreshAll = React.useCallback(async () => { await Promise.all([onRefresh ? onRefresh() : null, loadStat(true)]); }, [onRefresh, loadStat]);
  const { ref: ptrRef, indicator: ptrIndicator } = usePullToRefresh(onRefresh ? refreshAll : undefined);
  const [pay, setPay] = useState("匯款");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [activeCat, setActiveCat] = useState("");   // "" = 還沒選（預設吃第一個類別）；ALL_CAT = 全部
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [zoomP, setZoomP] = useState<GroupProduct | null>(null);
  const [zoomIdx, setZoomIdx] = useState(0);
  const zStart = useRef({ x: 0, y: 0 });

  // 在 LINE 裡開填單頁 → 直接用他綁定的暱稱，不用再打一次（拿不到就安靜維持手打，見 lineIdentity.ts）
  useEffect(() => {
    let alive = true;
    getLineIdentity().then(async (id) => {
      if (!alive) return;
      setLineId(id);
      if (id.nickname && !nickTouched.current) { setNick(id.nickname); setAutoNick(true); }
      if (id.status === "ready") {
        const f = await checkFriendship();
        if (alive) setIsFriend(f);
      }
    });
    return () => { alive = false; };
  }, []);

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
  const left = daysLeft(liveTeam.closeAt);
  const teamOpen = isOpen(liveTeam); // 結單後仍可點進來瀏覽，但不能填單／加購
  // 已結單又沒人填單就不放第二張卡（那團不能跟了，講「當第一個」很怪）→ 也連帶不顯示「可以滑」的箭頭
  const showJoinCard = people > 0 || teamOpen || statLoading;
  const hasMin = products.some((p) => (p.minQty ?? 1) > 1);   // 這團有商品有成團限制 → 團卡掛紅底提醒

  const [added, setAdded] = useState(false);   // 加入後原地回饋
  // 整組覆蓋而不是累加：客人回到這一團改數量，清單裡就該是他現在選的
  const addToCart = () => {
    if (!isOpen(liveTeam)) { alert("本團已結單，無法再下單囉"); return; }
    if (!cart.length) { alert("還沒選任何商品"); return; }
    const steps = products.map((x, i) => ({ x, i, q: qty[i] || 0 })).filter((r) => r.q >= 1).map((r) => Math.max(1, r.x.minQty ?? 1));
    putTeam(liveTeam, cart, pay, liveTeam.cover || products.find((x) => x.img)?.img, steps);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const openConfirm = () => {
    if (!isOpen(liveTeam)) { alert("本團已結單，無法再下單囉"); return; }
    // 外面來的人：送出前要有 LINE 身分＋是官方帳號好友。
    // 在 LINE App 裡開的（社群／官賴點進來）一律放行——他們本來就是社群裡綁定過的客人，
    // 不能因為 LIFF 在 OpenChat 裡拿不到登入狀態，就把最大宗的老客人擋在送出鍵前面。
    const outsider = !lineId?.inClient && lineId?.status !== "unavailable";
    if (outsider && (lineId?.status === "can-login" || (lineId?.status === "ready" && isFriend === false))) {
      setShowLineGate(true);
      return;
    }
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
  const [sendNotice, setSendNotice] = useState("");            // 三次送出都沒回應、回查也沒看到時，在確認視窗裡的提示
  const [landed, setLanded] = useState<MySubmission | null>(null);   // 送出後回查到的那筆填單紀錄（成功畫面顯示「系統已記錄」）
  // 回頭跟伺服器確認「這張單真的寫進去了」：同一團、品項與數量完全一樣、時間在 30 分鐘內
  const verifyLanded = async (tries: number): Promise<MySubmission | null> => {
    const key = (items: GroupCartItem[]) => items.map((it) => `${it.type}|${it.label}|${it.qty}`).sort().join("\n");
    const want = key(cart);
    for (let i = 0; i < tries; i++) {
      if (i) await new Promise((r) => setTimeout(r, 2000 * i));
      try {
        const subs = await fetchMySubmissions(nick.trim(), true);   // 剛送的單：繞過邊緣快取
        const hit = subs.find((s) => s.team === team.code && key(s.items) === want && Math.abs(Date.now() - new Date(s.time).getTime()) < 30 * 60 * 1000);
        if (hit) return hit;
      } catch (_) { /* 再試 */ }
    }
    return null;
  };
  const doSend = async () => {
    // 頁面開著跨過結單時間再按送出也要擋（isOpen 每次呼叫都重新比對現在時間）
    if (!isOpen(liveTeam)) { setShowConfirm(false); alert("本團已結單，無法再下單囉"); return; }
    setSubmitting(true); setSendNotice("");
    const finish = (hit: MySubmission | null) => {
      localStorage.setItem(`kaguya_order_done_${team.code}`, "1");
      try { localStorage.setItem("kg_nick", nick.trim()); } catch (_) {}   // 下次填單自動帶入
      orderIdRef.current = "";      // 這張單已收下 → 清空單號，之後客人「加買一單」會是全新的單，不會被當成重複
      setLanded(hit);
      setShowConfirm(false);
      setDone(true);
      loadStat(true);   // 自己剛送的人數／件數馬上反映（繞過邊緣快取）
    };
    try {
      if (!orderIdRef.current) orderIdRef.current = `${team.code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let r: any = null;
      try { r = await submitGroupOrder(team, nick.trim(), cart, pay, orderIdRef.current); }
      catch (_) { r = null; }        // 三次都沒回應：可能其實已經寫進去了 → 下面用填單紀錄確認，不直接叫客人重按
      if (r && r.ok === false) { setShowConfirm(false); alert(r.message || "本團已結單，無法送出"); return; }
      if (r && r.ok) { finish(await verifyLanded(1)); return; }
      const hit = await verifyLanded(3);
      if (hit) { finish(hit); return; }
      setSendNotice("系統還在處理這張單，請再按一次「確認送出」。同一張單不會重複計算。");
    } finally {
      setSubmitting(false);
    }
  };

  // ── 送出成功 ──
  if (done) {
    return (
      <div className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto px-6 py-12 flex flex-col items-center text-center gap-4">
          <div className="w-20 h-20 rounded-full bg-white border border-black flex items-center justify-center text-[#49d5df]">
            <CheckCircle2 className="w-11 h-11 stroke-[2.5px]" />
          </div>
          <h2 className="text-2xl font-[900] text-[#283d3e]">填單已送出！</h2>
          <p className="text-[#283d3e] font-[900] text-lg">共 {count} 件　預估 ${total} 元</p>
          {landed && (
            <p className="text-[#49d5df] font-[900] text-sm bg-white rounded-full px-4 py-1.5 border-2 border-[#49d5df]">
              系統已記錄 {landed.items.reduce((s, it) => s + it.qty, 0)} 件　{landed.time.slice(11, 16)}
            </p>
          )}
          <p className="text-[#283d3e]/75 text-xs font-bold leading-relaxed max-w-xs">本金額未包含可能需要二補的國際運費或境內運費，實際金額以結單後訂單狀態查詢顯示為主！</p>
          <div className="bg-white text-[#283d3e] font-bold rounded-2xl px-5 py-3 max-w-sm text-sm leading-relaxed shadow-sm flex items-start gap-2 text-left">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#e46b58] stroke-[2.5px] mt-0.5" />
            <span>結單後收到訂購付款通知才查得到訂單！請記得去貼文留言「已填單」！</span>
          </div>
          <div className="flex gap-3 mt-2">
            <button onClick={() => onPreview?.(nick.trim())} className="bg-white border border-black text-[#283d3e] font-[900] px-5 py-3 rounded-full active:opacity-60 active:transition flex items-center gap-2">
              <Search className="w-4 h-4 stroke-[3px]" /> 填單明細查詢
            </button>
            <button onClick={onGoQuery ?? onBack} className="bg-[#49d5df] text-[#283d3e] font-[900] px-7 py-3 rounded-full active:scale-95 transition">回到首頁</button>
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
    <div ref={ptrRef} className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto overscroll-y-contain">
      {ptrIndicator}
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 pt-20 pb-36 relative">

        {/* 團資訊：橫向滑動卡片（右邊故意露出下一張的一角＝可以滑的暗示） */}
        {/* scroll-pl 一定要跟 px 一樣：不然 snap 會把左邊 padding 捲掉，卡片會比下面內容凸出去 */}
        <div className="mb-4 -mx-5 sm:-mx-7 px-5 sm:px-7 scroll-pl-5 sm:scroll-pl-7 overflow-x-auto snap-x snap-mandatory no-scrollbar">
          <div className="flex gap-3">
            {/* 第 1 張：團資訊 */}
            <div className={`snap-start shrink-0 bg-white rounded-2xl px-5 py-4 ${showJoinCard ? "w-[87%]" : "w-full"}`}>
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-[#283d3e]/70 font-bold text-sm">訂購表單 {team.code}</span>
                {team.openAt && <span className="text-black font-[900] text-sm shrink-0">{fmtYMD(team.openAt)}</span>}
              </div>
              <div className="text-[#283d3e] font-[900] text-xl leading-snug mt-0.5">{team.name}</div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {teamOpen && left > 0 && (
                  <span className="text-[11px] font-[900] text-[#e46b58] border-2 border-[#e46b58] bg-white px-2.5 py-0.5 rounded-full">剩餘{left}天結單</span>
                )}
                {team.shipInfo && (
                  <span className="text-[11px] font-[900] text-[#e46b58] border-2 border-[#e46b58] bg-white px-2.5 py-0.5 rounded-full">預計{team.shipInfo}發貨</span>
                )}
                {hasMin && (
                  <span className="text-[11px] font-[900] text-white bg-[#e46b58] border-2 border-[#e46b58] px-2.5 py-0.5 rounded-full">成團限制</span>
                )}
                {teamOpen
                  ? <span className="text-sm font-[900] text-white bg-[#49d5df] px-4 py-1 rounded-full">開團中</span>
                  : <span className="text-sm font-[900] text-white bg-[#2b2b2b] px-4 py-1 rounded-full">已結單</span>}
                {showJoinCard && (
                  <span aria-hidden className="ml-auto text-[#283d3e]/45 animate-nudge-x shrink-0">
                    <ChevronRight className="w-5 h-5 stroke-[3px]" />
                  </span>
                )}
              </div>
            </div>

            {/* 第 2 張：跟團熱度。只給數字，不會出現任何人的暱稱。
                已結單又沒人填單就整張不顯示（那團已經不能跟了，講「當第一個」很怪） */}
            {showJoinCard && (
            <div className="snap-start shrink-0 w-[87%] bg-[#283d3e] rounded-2xl px-6 py-5 flex flex-col justify-center">
              <span className="self-start bg-[#f6f9f9] text-[#283d3e] text-[13px] font-[900] px-3 py-1 rounded-full">填單統計</span>
              {people > 0 ? (
                <div className="mt-4 text-white font-[900] text-xl">
                  <div className="flex items-baseline">
                    已有<span className="text-[44px] leading-none mx-1.5">{people}</span>人填單
                  </div>
                  <div className="flex items-baseline mt-3">
                    共<span className="text-[44px] leading-none mx-1.5">{joinQty}</span>件商品
                  </div>
                </div>
              ) : !stat && statLoading ? (
                <div className="mt-4 text-white/80 font-[900] text-2xl leading-snug">人數更新中…</div>
              ) : (
                <div className="mt-4 text-white font-[900] text-2xl leading-snug">持續開放喊單中～</div>
              )}
            </div>
            )}
          </div>
        </div>

        {team.note && (
          <div className="bg-white rounded-2xl px-5 py-4 mb-4">
            <div className="flex items-center gap-2 text-[#49d5df] font-[900] text-sm mb-1.5">
              <Info className="w-4 h-4 stroke-[3px]" /> 團務備註・二補標準
            </div>
            <p className="text-[#283d3e] font-bold text-sm leading-relaxed whitespace-pre-wrap">{team.note}</p>
          </div>
        )}

        {!teamOpen && (
          <div className="bg-gray-100 text-gray-600 font-[900] text-sm rounded-2xl px-4 py-3 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0 stroke-[2.5px] text-[#e46b58]" /> 本團已結單，以下僅供瀏覽，無法再下單囉
          </div>
        )}

        {teamOpen && (<>
        {/* 1. 暱稱 */}
        <div className="font-[900] text-[#283d3e] text-lg mb-1">1. 填寫您的社群暱稱<span className="text-[#e46b58]">*</span></div>
        <div className="relative">
          <input
            ref={nickRef}
            value={nick}
            onChange={(e) => { nickTouched.current = true; setAutoNick(false); setNick(e.target.value); }}
            placeholder="請輸入您的社群暱稱"
            className={`w-full px-4 py-3 pr-12 rounded-xl bg-white text-[#283d3e] font-bold outline-none placeholder-gray-400 ring-2 transition ${
              nickState === "ok" ? "ring-[#49d5df]" : nickState === "unbound" ? "ring-[#e46b58]" : "ring-transparent focus:ring-[#49d5df]"
            }`}
          />
          {/* 右邊那顆狀態燈：確認中 / 已綁定 / 查無此暱稱 */}
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {nickState === "checking" && <Loader2 className="w-5 h-5 stroke-[3px] text-[#283d3e]/35 animate-spin" />}
            {nickState === "ok" && (
              <span className="w-6 h-6 rounded-full bg-[#49d5df] flex items-center justify-center">
                <Check className="w-4 h-4 stroke-[4px] text-white" />
              </span>
            )}
            {nickState === "unbound" && (
              <span className="w-6 h-6 rounded-full bg-[#e46b58] flex items-center justify-center">
                <X className="w-4 h-4 stroke-[4px] text-white" />
              </span>
            )}
          </span>
        </div>

        {nickState === "ok" ? (
          <p className="text-[#49d5df] text-xs font-[900] mt-2 mb-5">
            {autoNick ? "已帶入你在官賴綁定的暱稱，可以填單囉！" : "已綁定，可以填單囉！"}
            {autoNick && (
              <button
                onClick={() => { nickTouched.current = true; setAutoNick(false); setNick(""); setTimeout(() => nickRef.current?.focus(), 50); }}
                className="ml-2 text-[#283d3e]/60 underline underline-offset-2 font-bold"
              >
                不是我？改用手打
              </button>
            )}
          </p>
        ) : nickState === "unbound" ? (
          <p className="text-[#e46b58] text-xs font-[900] mt-2 mb-5">查無此暱稱！請確認有沒有打錯，或先到官賴綁定。</p>
        ) : (
          <p className="text-[#e46b58] text-xs font-bold mt-2 mb-5">提醒：請務必確認已至官賴綁定社群暱稱！未綁定恕無法受理訂單！</p>
        )}
        </>)}

        {/* 2. 喊單 */}
        <div className="font-[900] text-[#283d3e] text-lg mb-2">{teamOpen ? "2. 喊單" : "商品一覽"}<span className="text-[#283d3e]/60 text-sm font-bold">（選類別看商品）</span></div>

        {/* 商品是點進這一團才抓的，抓的期間給個回饋，不然畫面會空一下讓人以為壞了 */}
        {loadingItems && products.length === 0 && (
          <div className="bg-white rounded-2xl px-5 py-8 text-center text-[#283d3e]/70 font-[900]">
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
                  className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-[900] border border-black active:opacity-60 transition-all ${
                    on ? "bg-[#49d5df] text-[#283d3e]" : "bg-white text-[#283d3e]"
                  }`}
                >
                  {label}
                  {picked > 0 && (
                    <span className="bg-[#f6f9f9] text-[#283d3e] text-[11px] px-1.5 py-0.5 rounded-full">{picked}</span>
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
                <span className="font-[900] text-[#283d3e] text-base">{cat}</span>
                <span className="text-[#283d3e]/55 font-bold text-sm">{list.length} 項</span>
                {catCount > 0 && <span className="bg-[#f6f9f9] text-[#283d3e] text-xs font-[900] px-2 py-0.5 rounded-full">已選 {catCount}</span>}
              </div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  {list.map(({ p, idx }) => {
                    const q = qty[idx] || 0;
                    return (
                      <div key={idx} className={`rounded-xl p-2 border-2 transition ${q >= 1 ? "border-[#49d5df] bg-[#eafcfb]" : "border-transparent bg-white"}`}>
                        <div className="relative">
                          <ProductCarousel images={p.images} onTap={() => teamOpen && setQ(idx, q >= 1 ? 0 : 1)} className={teamOpen ? "cursor-pointer" : ""} />
                          <button type="button" aria-label="看大圖" onClick={(e) => { e.stopPropagation(); setZoomP(p); setZoomIdx(0); }} className="absolute top-1 right-1 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition"><ZoomIn size={16} /></button>
                        </div>
                        <div className="text-[13px] text-[#283d3e] font-bold mt-1 leading-tight truncate">#{p.no} {p.name}</div>
                        {p.spec && <div className="text-[11px] text-[#283d3e]/60 font-bold leading-tight truncate">{p.spec}</div>}
                        <div className="text-[#283d3e] font-[900] text-base">${p.price}</div>
                        {(p.minQty ?? 1) > 1 && <MinBar min={p.minQty!} ordered={stats[itemKey(p)] || 0} />}
                        {teamOpen && (
                        <div className="flex items-center justify-between mt-1">
                          <button onClick={() => setQ(idx, q - 1)} className="w-7 h-7 rounded-full bg-[#e6e9ff] text-[#283d3e] font-black">−</button>
                          <input value={q} onChange={(e) => setQ(idx, parseInt(e.target.value) || 0)} inputMode="numeric" className="w-9 text-center font-bold text-[#283d3e] bg-transparent outline-none" />
                          <button onClick={() => setQ(idx, q + 1)} className="w-7 h-7 rounded-full bg-[#49d5df] text-[#283d3e] font-black">＋</button>
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
            <div className="font-[900] text-[#283d3e] text-lg mb-2">3. 付款方式<span className="text-[#e46b58]">*</span></div>
            <div className="grid grid-cols-2 gap-3">
              {["匯款", "無卡"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPay(m)}
                  className={`py-3.5 rounded-2xl font-[900] border-2 transition active:scale-95 ${pay === m ? "bg-[#49d5df] text-[#283d3e] border-[#49d5df]" : "bg-white text-[#283d3e] border-[#283d3e]/15"}`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 可以下單時用下面浮出來的結算列；已結單才在這裡說明 */}
        {!teamOpen && (
          <div className="mt-6 pt-4 border-t-2 border-[#283d3e]/15 text-center text-gray-500 font-[900]">本團已結單，無法再下單</div>
        )}
      </div>

      {/* 外面來的人送出前的一道門：先登入，再確認是官方帳號好友（商品本身完全公開，不擋看） */}
      {showLineGate && (
        <div className="fixed inset-0 z-[105] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 border border-black">
            <div className="w-14 h-14 rounded-full bg-[#49d5df] flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-8 h-8 stroke-[2.5px] text-white" />
            </div>
            {lineId?.status === "can-login" ? (
              <>
                <div className="font-[900] text-[#283d3e] text-xl text-center mb-1.5">登入以填單購買</div>
                <div className="text-center text-sm font-bold text-[#283d3e]/70 mb-5 leading-relaxed">
                  用 LINE 登入並加入我們的官方 LINE 立即訂購，同時收到訂單相關資訊！
                </div>
                <button
                  onClick={loginWithLine}
                  className="block w-full text-center bg-[#49d5df] text-[#283d3e] font-[900] py-3.5 rounded-full border border-black active:opacity-60 active:transition mb-2.5"
                >
                  用 LINE 登入
                </button>
              </>
            ) : (
              <>
                <div className="font-[900] text-[#283d3e] text-xl text-center mb-1.5">還差一步：加入官方帳號</div>
                <div className="text-center text-sm font-bold text-[#283d3e]/70 mb-5 leading-relaxed">
                  到貨、收款、出貨都是透過官方帳號通知你，<br />沒加入的話我們聯絡不到你喔。
                </div>
                <a
                  href={APP_CONFIG.LINE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full text-center bg-[#49d5df] text-[#283d3e] font-[900] py-3.5 rounded-full border border-black active:opacity-60 active:transition mb-2.5"
                >
                  加入官方帳號
                </a>
                <button
                  disabled={friendRechecking}
                  onClick={async () => {
                    setFriendRechecking(true);
                    const f = await checkFriendship();
                    setFriendRechecking(false);
                    setIsFriend(f);
                    if (f !== false) { setShowLineGate(false); openConfirm(); }   // 加好了就直接接回送出流程
                  }}
                  className="w-full bg-white text-[#283d3e] font-[900] py-3.5 rounded-full border border-black active:opacity-60 active:transition disabled:opacity-50"
                >
                  {friendRechecking ? "確認中…" : "我加好了，重新確認"}
                </button>
              </>
            )}
            <button
              onClick={() => setShowLineGate(false)}
              className="w-full text-center text-[#283d3e]/45 text-xs font-bold mt-4 underline underline-offset-2"
            >
              {lineId?.status === "can-login" ? "不登入瀏覽商品" : "先回去看商品"}
            </button>
          </div>
        </div>
      )}

      {/* 暱稱尚未綁定：擋在送出前，但留一條「我確定有綁定」的路（客人改過 LINE 暱稱時不會被鎖死） */}
      {showUnbound && (
        <div className="fixed inset-0 z-[105] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 border border-black">
            <div className="w-14 h-14 rounded-full bg-[#e46b58] flex items-center justify-center mx-auto mb-3">
              <UserX className="w-8 h-8 stroke-[2.5px] text-white" />
            </div>
            <div className="font-[900] text-[#283d3e] text-xl text-center mb-1.5">您的暱稱尚未綁定！</div>
            <div className="text-center text-sm font-bold text-[#283d3e]/70 mb-5 leading-relaxed">
              「<span className="text-[#e46b58] font-[900]">{nick.trim()}</span>」在官賴查不到綁定紀錄。<br />可能是打錯字，或還沒去官賴綁定。
            </div>
            <a
              href={APP_CONFIG.LINE_URL}
              target="_blank"
              rel="noreferrer"
              className="block w-full text-center bg-[#49d5df] text-[#283d3e] font-[900] py-3.5 rounded-full border border-black active:opacity-60 active:transition mb-2.5"
            >
              先去綁定
            </a>
            <button
              onClick={() => { setShowUnbound(false); setTimeout(() => nickRef.current?.focus(), 50); }}
              className="w-full bg-white text-[#283d3e] font-[900] py-3.5 rounded-full border border-black active:opacity-60 active:transition"
            >
              重新填寫暱稱
            </button>
            <button
              onClick={() => { setBypass(true); setShowUnbound(false); setShowConfirm(true); }}
              className="w-full text-center text-[#283d3e]/45 text-xs font-bold mt-4 underline underline-offset-2"
            >
              我確定已經綁定過了，仍要送出
            </button>
          </div>
        </div>
      )}

      {/* 確認 modal */}
      {/* 選了數量才浮出來：沒選之前不佔版面，選了就一直跟著捲動 */}
      {teamOpen && count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-[70] bg-white border-t border-[#283d3e]/10 px-4 pt-3 animate-fade-in-up"
             style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <div className="w-full max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="min-w-0">
                <div className="font-bold text-[11.5px] text-[#283d3e]/55">已選 {count} 件</div>
                <div className="font-[900] text-[19px] text-[#283d3e] leading-tight">約 ${total}</div>
              </div>
              <button onClick={clearAll} className="text-[#283d3e]/40 font-[900] text-[12px] underline underline-offset-2 active:opacity-60 shrink-0">清空</button>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={addToCart}
                  className={`h-12 px-4 rounded-full border font-[900] text-[14px] flex items-center gap-1.5 active:opacity-60 transition ${
                    added ? "bg-[#49d5df] border-[#49d5df] text-[#283d3e]" : "bg-white border-[#283d3e]/20 text-[#283d3e]"
                  }`}
                >
                  {added ? <><Check className="w-4 h-4 stroke-[3px]" />已加入</> : <><ShoppingCart className="w-4 h-4 stroke-[2.6px]" />加入清單</>}
                </button>
                <button onClick={openConfirm} className="h-12 px-5 rounded-full bg-[#e868a0] text-[#283d3e] font-[900] text-[14px] active:opacity-60 transition">
                  直接送出
                </button>
              </div>
            </div>
            {teamInCart(liveTeam.code) && !added && (
              <p className="text-[11.5px] font-bold text-[#283d3e]/45 mt-1.5">這團已在清單裡，再加入會整組覆蓋成現在選的品項</p>
            )}
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <div className="font-[900] text-[#283d3e] text-lg mb-1">確認填單</div>
            <div className="text-sm text-gray-500 mb-3">暱稱：{nick}　·　付款方式：<span className="text-[#49d5df] font-[900]">{pay}</span></div>
            {Object.entries(cartByType).map(([t, items]) => (
              <div key={t} className="mb-3">
                <div className="font-[900] text-[#49d5df] text-sm mb-1">{t}（{items.length} 款）</div>
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between items-start text-sm text-[#283d3e] py-0.5">
                    <span className="min-w-0 break-words mr-2 leading-snug">{it.label}</span>
                    <span className="shrink-0">×{it.qty}　${it.price * it.qty}</span>
                  </div>
                ))}
              </div>
            ))}
            <div className="flex justify-between font-[900] text-[#283d3e] border-t-2 border-[#e6e9ff] pt-2 text-lg">
              <span>總金額</span><span>${total}</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">實際金額以訂購完成之查詢表確認為準</div>
            <div className="bg-white border-2 border-[#e46b58] text-[#e46b58] font-bold text-xs rounded-xl px-3 py-2.5 mt-3 leading-relaxed flex items-start gap-2"><AlertTriangle className="w-4 h-4 shrink-0 stroke-[2.5px] mt-0.5" /><span>送出完成後，請務必至留言區回覆「已填單」！未回覆已填單者不會計算訂購！！</span></div>
            {/* 告知義務：依通訊交易解除權合理例外情事適用準則，排除七天解除權必須「經企業經營者告知消費者」。
                放在送出前的確認視窗，比藏在頁尾有效得多——這是客人真正會看到、也是真正做出承諾的那一刻。 */}
            <div className="bg-[#f6f9f9] rounded-xl px-3 py-2.5 mt-3 text-[11.5px] leading-relaxed font-bold text-[#283d3e]/70">
              本團為日本代購預購，結單後即向日本方下訂，<span className="text-[#e46b58]">送出後恕不接受取消</span>。
              商品抵台後提供 30 天免費倉儲，逾期每件每天酌收 5 元。日方若砍單或缺貨，我們會主動通知並全額退還該品項款項。
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowConfirm(false)} disabled={submitting} className="flex-1 bg-white border-2 border-[#49d5df] text-[#283d3e] font-[900] py-3 rounded-full">修改訂單</button>
              <button onClick={doSend} disabled={submitting} className="flex-1 bg-[#49d5df] text-[#283d3e] font-[900] py-3 rounded-full active:scale-95 transition">{submitting ? "送出中…" : "確認送出"}</button>
            </div>
            {submitting && <div className="text-xs text-gray-500 mt-2 text-center">正在寫入訂單並跟系統核對，請不要關閉畫面（最多約一分鐘）</div>}
            {sendNotice && <div className="text-[#e46b58] font-bold text-sm mt-2 text-center leading-relaxed">{sendNotice}</div>}
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
              <div className="font-[900] text-[#283d3e] text-base leading-snug">#{zoomP.no} {zoomP.name}</div>
              {zoomP.spec && <div className="text-sm text-[#283d3e]/70 font-bold mt-1.5 leading-relaxed">{zoomP.spec}</div>}
              <div className="text-[#283d3e] font-[900] text-xl mt-2">${zoomP.price}</div>
              {(zoomP.minQty ?? 1) > 1 && <MinBar min={zoomP.minQty!} ordered={stats[itemKey(zoomP)] || 0} big />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderForm;

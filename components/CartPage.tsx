import React, { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, ShoppingCart, AlertTriangle, CheckCircle2, Loader2, ChevronRight, Plus, Minus, X, UserCheck } from "lucide-react";
import { GroupTeam, GroupCartItem, MySubmission } from "../types";
import { submitGroupOrder, isOpen, daysLeft, checkNickBound, fetchMySubmissions, fmtMDHM, fetchItemStats } from "../services/groupOrderService";
import { getLineIdentity, loginWithLine, checkFriendship } from "../services/lineIdentity";
import type { LineIdentity } from "../services/lineIdentity";
import { cartTeams, removeTeam, removeTeams, cartTotal, subscribeCart, setItemQty, removeItem, stepOf, CartTeam } from "../services/cart";
import { SectionHead } from "./Section";
import { SlimFooter } from "./Footer";

interface Props {
  teams: GroupTeam[];
  onSelectTeam: (code: string) => void;
  onBrowse: () => void;
}

type Result = { code: string; name: string; ok: boolean; msg?: string };

// 成團狀態：告訴他目前幾件、加上他的會變幾件、成團了沒。
// 未送出時不能說「你是第 N 件」——那還沒算數，講了會誤導。
const GroupState: React.FC<{ step: number; ordered: number | undefined; mine: number }> = ({ step, ordered, mine }) => {
  if (step <= 1) return null;
  if (ordered == null) return <div className="text-[11px] font-[900] text-[#283d3e]/35 mt-1">{step} 件成團 · 目前件數更新中</div>;
  const after = ordered + mine;
  const done = after > 0 && after % step === 0;
  const need = done ? 0 : Math.ceil(after / step) * step - after;
  return (
    <div className="text-[11px] font-[900] mt-1 leading-relaxed">
      <span className="text-[#283d3e]/45">目前 {ordered} 件</span>
      <span className="text-[#283d3e]/25"> → </span>
      <span className="text-[#283d3e]/70">加上你的 {mine} 件＝{after} 件</span>
      {done
        ? <span className="text-[#49d5df]"> · 已成團</span>
        : <span className="text-[#e46b58]"> · 還差 {need} 件成團</span>}
    </div>
  );
};

// 購物車：跨團累積，一次送出，但**仍然一團一筆**寫進收單表（後端不動）。
// 風險在「放著沒送出、團卻結單了」→ 所以每一團都掛自己的倒數，已結單的整組鎖住。
const CartPage: React.FC<Props> = ({ teams, onSelectTeam, onBrowse }) => {
  const [items, setItems] = useState<CartTeam[]>(cartTeams());
  useEffect(() => subscribeCart(() => setItems(cartTeams())), []);

  const [nick, setNick] = useState(() => { try { return localStorage.getItem("kg_nick") || ""; } catch { return ""; } });
  const [nickState, setNickState] = useState<"idle" | "checking" | "ok" | "unbound" | "unknown">("idle");
  const nickSeq = useRef(0);
  const nickTouched = useRef(false);
  const [lineId, setLineId] = useState<LineIdentity | null>(null);
  const [isFriend, setIsFriend] = useState<boolean | null>(null);
  const [showLineGate, setShowLineGate] = useState(false);

  // 每團的即時已訂件數（itemKey → 件數）。購物車可能放了好幾天，要用最新的算成團
  const [stats, setStats] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    let alive = true;
    const codes = cartTeams().map((c) => c.code);
    Promise.all(codes.map((c) => fetchItemStats(c).then((m) => [c, m] as const).catch(() => [c, {}] as const)))
      .then((pairs) => { if (alive) setStats(Object.fromEntries(pairs)); });
    return () => { alive = false; };
  }, [items.length]);

  const [pay, setPay] = useState("");   // 送出前必選，套用清單內所有團
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState("");
  const [results, setResults] = useState<Result[] | null>(null);

  // 身分：跟填單頁同一套規則（社群點進來 LIFF 起不來＝放行，不能把老客人鎖在外面）
  useEffect(() => {
    let alive = true;
    getLineIdentity().then(async (id) => {
      if (!alive) return;
      setLineId(id);
      if (id.nickname && !nickTouched.current) setNick(id.nickname);
      if (id.status === "ready") { const f = await checkFriendship(); if (alive) setIsFriend(f); }
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const q = nick.trim();
    if (!q) { setNickState("idle"); nickSeq.current++; return; }
    setNickState("checking");
    const my = ++nickSeq.current;
    const t = setTimeout(async () => {
      const r = await checkNickBound(q);
      if (my !== nickSeq.current) return;
      setNickState(r === true ? "ok" : r === false ? "unbound" : "unknown");
    }, 500);
    return () => clearTimeout(t);
  }, [nick]);

  // 每團的即時開關狀態：以團表為準（清單可能放了好幾天）
  const liveOf = (c: CartTeam) => teams.find((t) => t.code === c.code);
  const closed = useMemo(
    () => items.filter((c) => { const t = liveOf(c); return t ? !isOpen(t) : false; }),
    [items, teams]
  );
  const sendable = useMemo(() => items.filter((c) => !closed.some((x) => x.code === c.code)), [items, closed]);
  const grandTotal = sendable.reduce((s, c) => s + cartTotal(c), 0);
  const grandQty = sendable.reduce((s, c) => s + c.items.reduce((n, i) => n + i.qty, 0), 0);

  // 送出：一團一筆。每團各自一組單號＋各自回查，所以某一團失敗只要重送那一團，不會重複計算。
  const verify = async (code: string, its: GroupCartItem[], who: string): Promise<MySubmission | null> => {
    const key = (x: GroupCartItem[]) => x.map((i) => `${i.type}|${i.label}|${i.qty}`).sort().join("\n");
    const want = key(its);
    for (let i = 0; i < 3; i++) {
      if (i) await new Promise((r) => setTimeout(r, 2000 * i));
      try {
        const subs = await fetchMySubmissions(who, true);
        const hit = subs.find((s) => s.team === code && key(s.items) === want && Math.abs(Date.now() - new Date(s.time!).getTime()) < 30 * 60 * 1000);
        if (hit) return hit;
      } catch (_) { /* 再試 */ }
    }
    return null;
  };

  const doSend = async () => {
    const outsider = !lineId?.inClient && lineId?.status !== "unavailable";
    if (outsider && (lineId?.status === "can-login" || (lineId?.status === "ready" && isFriend === false))) { setShowLineGate(true); return; }
    if (!nick.trim()) { alert("請先填社群暱稱"); return; }
    if (!pay) { alert("請先選付款方式"); return; }
    if (!sendable.length) { alert("購物車裡沒有可以送出的團"); return; }

    setSending(true);
    const out: Result[] = [];
    const okCodes: string[] = [];
    for (let i = 0; i < sendable.length; i++) {
      const c = sendable[i];
      const live = liveOf(c);
      setProgress(`送出中 ${i + 1}/${sendable.length}　${c.name}`);
      if (live && !isOpen(live)) { out.push({ code: c.code, name: c.name, ok: false, msg: "這團已結單" }); continue; }
      const oid = `${c.code}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      let r: any = null;
      try { r = await submitGroupOrder(live || ({ code: c.code, name: c.name } as GroupTeam), nick.trim(), c.items, pay, oid); }
      catch (_) { r = null; }
      if (r && r.ok === false) { out.push({ code: c.code, name: c.name, ok: false, msg: r.message || "送出失敗" }); continue; }
      if (r && r.ok) { out.push({ code: c.code, name: c.name, ok: true }); okCodes.push(c.code); continue; }
      // 沒回應不代表沒寫進去 → 回查確認再判定
      const hit = await verify(c.code, c.items, nick.trim());
      if (hit) { out.push({ code: c.code, name: c.name, ok: true }); okCodes.push(c.code); }
      else out.push({ code: c.code, name: c.name, ok: false, msg: "系統還在處理，請稍後只重送這一團" });
    }
    try { localStorage.setItem("kg_nick", nick.trim()); } catch (_) {}
    removeTeams(okCodes);            // 成功的清掉，失敗的留著可以重送
    setProgress("");
    setSending(false);
    setResults(out);
  };

  // ── 送出結果 ──
  if (results) {
    const ok = results.filter((r) => r.ok);
    const bad = results.filter((r) => !r.ok);
    return (
      <div className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto">
        <div className="w-full max-w-lg mx-auto px-4 sm:px-7 pt-20 pb-8">
          <SectionHead en="DONE" title={bad.length ? "部分送出完成" : "填單已送出"} />
          <div className="bg-white rounded-3xl overflow-hidden mt-2">
            {results.map((r) => (
              <div key={r.code} className="px-5 py-4 border-t border-[#283d3e]/10 first:border-t-0 flex items-start gap-3">
                {r.ok
                  ? <CheckCircle2 className="w-5 h-5 stroke-[3px] text-[#49d5df] shrink-0 mt-0.5" />
                  : <AlertTriangle className="w-5 h-5 stroke-[3px] text-[#e46b58] shrink-0 mt-0.5" />}
                <div className="min-w-0 flex-1">
                  <div className="font-[900] text-[14px] text-[#283d3e] leading-snug">{r.name}</div>
                  <div className={`font-bold text-[12px] mt-0.5 ${r.ok ? "text-[#283d3e]/50" : "text-[#e46b58]"}`}>
                    {r.ok ? "已送出，系統已記錄" : r.msg}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {ok.length > 0 && (
            <div className="bg-white rounded-2xl px-5 py-4 mt-3 font-bold text-[12.5px] text-[#283d3e]/70 leading-relaxed">
              送出完成後，請記得回到該團的開團貼文留言「已填單」，未留言不會計算訂購。
            </div>
          )}
          <button onClick={() => { setResults(null); onBrowse(); }} className="mt-5 w-full h-12 rounded-full bg-[#e868a0] text-[#283d3e] font-[900] text-[16px] active:opacity-60 transition">
            繼續逛其他團
          </button>
          <SlimFooter />
        </div>
      </div>
    );
  }

  // ── 清單 ──
  return (
    <div className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-4 sm:px-7 pt-20 pb-40">
        <div className="text-[#283d3e]"><SectionHead en="CART" title="購物車" count={items.reduce((s2, c) => s2 + c.items.reduce((n, i) => n + i.qty, 0), 0)} /></div>

        {items.length === 0 ? (
          <div className="bg-white rounded-3xl px-6 py-12 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto text-[#283d3e]/20 stroke-[2px]" />
            <p className="font-[900] text-[#283d3e]/60 mt-3">購物車還是空的</p>
            <button onClick={onBrowse} className="mt-5 h-11 px-6 rounded-full bg-[#e868a0] text-[#283d3e] font-[900] text-sm active:opacity-60 transition">
              去看開團中的團
            </button>
          </div>
        ) : (
          <>
            {items.map((c) => {
              const live = liveOf(c);
              const isClosed = live ? !isOpen(live) : false;
              const left = live ? daysLeft(live.closeAt) : null;
              return (
                <div key={c.code} className={`rounded-3xl overflow-hidden mb-3 ${isClosed ? "bg-gray-100" : "bg-white"}`}>
                  <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <button onClick={() => onSelectTeam(c.code)} className="text-left font-[900] text-[15px] leading-snug text-[#283d3e] active:opacity-60">
                        {c.name}
                      </button>
                      <div className="mt-1.5">
                        {isClosed ? (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-[900] text-[#e46b58] bg-white border border-[#e46b58]/30 px-2.5 py-0.5 rounded-full">
                            <AlertTriangle className="w-3.5 h-3.5 stroke-[3px]" />這團已結單，無法送出
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-[900] text-[#283d3e] border border-black/12 bg-white px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#e46b58]" />
                            {left === 0 ? `今天 ${live ? fmtMDHM(live.closeAt).slice(-5) : ""} 結單` : `剩 ${left} 天結單`}
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => removeTeam(c.code)} aria-label="移除這團" className="w-9 h-9 shrink-0 flex items-center justify-center text-[#283d3e]/35 active:opacity-60">
                      <Trash2 className="w-[18px] h-[18px] stroke-[2.4px]" />
                    </button>
                  </div>
                  <div className="px-5 pb-4">
                    {c.items.map((it, i) => {
                      const step = stepOf(c, i);
                      return (
                        <div key={i} className="py-2 border-b border-[#283d3e]/[0.06] last:border-b-0">
                          <div className="flex items-start gap-2">
                            <span className="min-w-0 flex-1 break-words leading-snug font-bold text-[13px] text-[#283d3e]/85">{it.label}</span>
                            <button onClick={() => removeItem(c.code, i)} aria-label="移除這項" className="w-7 h-7 shrink-0 flex items-center justify-center text-[#283d3e]/30 active:opacity-60">
                              <X className="w-4 h-4 stroke-[3px]" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex items-center rounded-full border border-[#283d3e]/15 overflow-hidden">
                              <button onClick={() => setItemQty(c.code, i, it.qty - step)} aria-label="減少" disabled={isClosed}
                                className="w-9 h-8 flex items-center justify-center text-[#283d3e]/70 active:opacity-50 disabled:opacity-25">
                                <Minus className="w-3.5 h-3.5 stroke-[3px]" />
                              </button>
                              <span className="w-9 text-center font-[900] text-[13px] text-[#283d3e] tabular-nums">{it.qty}</span>
                              <button onClick={() => setItemQty(c.code, i, it.qty + step)} aria-label="增加" disabled={isClosed}
                                className="w-9 h-8 flex items-center justify-center text-[#283d3e]/70 active:opacity-50 disabled:opacity-25">
                                <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                              </button>
                            </div>
                            {step > 1 && <span className="text-[11px] font-[900] text-[#e868a0]">{step} 件成團</span>}
                            <span className="ml-auto font-[900] text-[13.5px] text-[#283d3e] tabular-nums">${it.qty * it.price}</span>
                          </div>
                          <GroupState step={step} ordered={stats[c.code]?.[`${it.type}|${it.label}`]} mine={it.qty} />
                        </div>
                      );
                    })}
                    <div className="flex justify-between font-[900] text-[#283d3e] border-t border-[#283d3e]/10 mt-2 pt-2 text-[14px]">
                      <span>小計</span><span>${cartTotal(c)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {closed.length > 0 && (
              <button onClick={() => removeTeams(closed.map((c) => c.code))} className="w-full h-11 rounded-full bg-white border border-[#e46b58]/40 text-[#e46b58] font-[900] text-[13px] mb-3 active:opacity-60">
                移除已結單的 {closed.length} 團
              </button>
            )}

            {/* 暱稱只填一次（原本每團都要重打）。
                後台整套是用「社群暱稱」認人的——對帳單、賣貨便回饋資訊1、收單表、查單 API 都是，
                LINE 給的 userId 是另一套，所以登入只能幫他「自動帶出」暱稱，不能取代暱稱。
                已綁定的人不該再看到空白輸入框 → 直接顯示身分，要換人才點「不是我」。 */}
            {lineId?.nickname && !nickTouched.current ? (
              <div className="bg-white rounded-3xl px-5 py-4 mt-4 flex items-center gap-3">
                <UserCheck className="w-5 h-5 stroke-[2.6px] text-[#49d5df] shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[11.5px] text-[#283d3e]/50">以這個身分送出</div>
                  <div className="font-[900] text-[15px] text-[#283d3e] truncate">{nick}</div>
                </div>
                <button onClick={() => { nickTouched.current = true; setNick(""); }} className="shrink-0 font-[900] text-[12px] text-[#283d3e]/45 underline underline-offset-2 active:opacity-60">
                  不是我
                </button>
              </div>
            ) : (
            <div className="bg-white rounded-3xl px-5 py-4 mt-4">
              <div className="font-[900] text-[13px] text-[#283d3e] mb-2">社群暱稱</div>
              <input
                value={nick}
                onChange={(e) => { nickTouched.current = true; setNick(e.target.value); }}
                placeholder="請輸入你在社群的完整暱稱"
                className="w-full h-11 px-4 rounded-full bg-[#f6f9f9] outline-none font-[900] text-[15px] text-[#283d3e] placeholder-[#283d3e]/30"
              />
              <div className="mt-2 text-[12px] font-bold min-h-[18px]">
                {nickState === "checking" && <span className="text-[#283d3e]/45">確認綁定中…</span>}
                {nickState === "ok" && <span className="text-[#49d5df]">✓ 已綁定</span>}
                {nickState === "unbound" && <span className="text-[#e46b58]">查不到這個暱稱的綁定，送出前請先到官賴綁定</span>}
              </div>
            </div>
            )}
            <div className="bg-white rounded-3xl px-5 py-4 mt-3">
              <div className="font-[900] text-[13px] text-[#283d3e] mb-2">付款方式<span className="text-[#e46b58]">*</span></div>
              <div className="grid grid-cols-2 gap-2.5">
                {["匯款", "無卡"].map((m) => (
                  <button key={m} type="button" onClick={() => setPay(m)}
                    className={`h-11 rounded-full font-[900] text-[14px] border transition active:opacity-60 ${pay === m ? "bg-[#49d5df] text-[#283d3e] border-[#49d5df]" : "bg-white text-[#283d3e]/70 border-[#283d3e]/20"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <p className="text-[11.5px] font-bold text-[#283d3e]/45 mt-2">整份清單用同一個付款方式送出</p>
            </div>
            <SlimFooter />
          </>
        )}
      </div>

      {/* 底部結算列：一直跟著捲動 */}
      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[#283d3e]/10 px-4 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}>
          <div className="w-full max-w-lg mx-auto flex items-center gap-3">
            <div className="min-w-0">
              <div className="font-bold text-[11.5px] text-[#283d3e]/55">{sendable.length} 團 · {grandQty} 件</div>
              <div className="font-[900] text-[19px] text-[#283d3e] leading-tight">${grandTotal}</div>
            </div>
            <button
              onClick={doSend}
              disabled={sending || !sendable.length || !pay}
              className="ml-auto h-12 px-7 rounded-full bg-[#e868a0] text-[#283d3e] font-[900] text-[16px] flex items-center gap-1.5 active:opacity-60 transition disabled:opacity-40"
            >
              {sending ? <><Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />送出中…</> : !pay ? "請先選付款方式" : <>一次送出<ChevronRight className="w-4 h-4 stroke-[3px]" /></>}
            </button>
          </div>
          {progress && <div className="w-full max-w-lg mx-auto text-[11.5px] font-bold text-[#283d3e]/55 mt-1.5 text-center">{progress}　請不要關閉畫面</div>}
        </div>
      )}

      {showLineGate && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 text-center">
            <div className="font-[900] text-[#283d3e] text-lg mb-1.5">送出前請先用 LINE 登入</div>
            <p className="font-bold text-[13px] text-[#283d3e]/65 leading-relaxed mb-5">
              登入後我們才認得出你是誰、之後的付款與到貨通知也才推得到你。順便會問你要不要加官方帳號好友。
            </p>
            <button onClick={loginWithLine} className="w-full h-12 rounded-full bg-[#06C755] text-white font-[900] active:opacity-60 transition">用 LINE 登入</button>
            <button onClick={() => setShowLineGate(false)} className="w-full h-11 mt-2 font-[900] text-[#283d3e]/50 active:opacity-60">稍後再說</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;

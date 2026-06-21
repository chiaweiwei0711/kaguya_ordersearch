import React, { useState, useMemo } from "react";
import { ChevronLeft, ZoomIn, X, CheckCircle2, AlertTriangle, Search, Info } from "lucide-react";
import { GroupTeam, GroupProduct, GroupCartItem } from "../types";
import { submitGroupOrder, daysLeft, fmtYMD, isOpen } from "../services/groupOrderService";

interface Props {
  team: GroupTeam;
  products: GroupProduct[];
  onBack: () => void;
  onGoQuery?: () => void;
  onPreview?: (nick: string) => void;   // 帶暱稱去「填單明細查詢」自動查
}

const OrderForm: React.FC<Props> = ({ team, products, onBack, onGoQuery, onPreview }) => {
  const [nick, setNick] = useState("");
  const [qty, setQty] = useState<Record<number, number>>({});
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [zoomP, setZoomP] = useState<GroupProduct | null>(null);

  const grouped = useMemo(() => {
    const m = new Map<string, { p: GroupProduct; idx: number }[]>();
    products.forEach((p, idx) => {
      if (!m.has(p.category)) m.set(p.category, []);
      m.get(p.category)!.push({ p, idx });
    });
    return Array.from(m.entries());
  }, [products]);

  const setQ = (idx: number, v: number) => setQty((s) => ({ ...s, [idx]: Math.max(0, v) }));
  const toggleCat = (c: string) => setOpenCats((s) => ({ ...s, [c]: !s[c] }));
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

  const openConfirm = () => {
    if (!nick.trim()) { alert("請先填社群暱稱"); return; }
    if (!cart.length) { alert("還沒選任何商品"); return; }
    if (localStorage.getItem(`kaguya_order_done_${team.code}`)) {
      if (!window.confirm("本裝置已下單過一次，是否要繼續訂購？")) return;
    }
    setShowConfirm(true);
  };

  const doSend = async () => {
    setSubmitting(true);
    try {
      await submitGroupOrder(team, nick.trim(), cart);
      localStorage.setItem(`kaguya_order_done_${team.code}`, "1");
      setShowConfirm(false);
      setDone(true);
    } catch {
      alert("送出失敗，請再試一次");
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

  return (
    <div className="fixed inset-0 z-40 bg-[#fff170] overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-7 relative">
        {/* 返回 */}
        <button onClick={onBack} aria-label="返回" className="w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition mb-4">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        {/* 標題卡 */}
        <div className="bg-white rounded-2xl px-5 py-4 mb-4">
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
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="請輸入您的社群暱稱"
          className="w-full px-4 py-3 rounded-xl bg-white text-[#4c59a1] font-bold outline-none focus:ring-2 focus:ring-[#3ac0bf] placeholder-gray-400"
        />
        <p className="text-[#f43f5e] text-xs font-bold mt-2 mb-5">提醒：請務必確認已至官賴綁定社群暱稱！未綁定恕無法受理訂單！</p>
        </>)}

        {/* 2. 喊單 */}
        <div className="font-[900] text-[#4c59a1] text-lg mb-2">{teamOpen ? "2. 喊單" : "商品一覽"}<span className="text-[#4c59a1]/60 text-sm font-bold">（點類別展開）</span></div>
        {grouped.map(([cat, list]) => {
          const open = !!openCats[cat];
          const catCount = list.reduce((s, x) => s + (qty[x.idx] || 0), 0);
          return (
            <div key={cat} className="mb-3 rounded-2xl overflow-hidden">
              <button onClick={() => toggleCat(cat)} className="w-full flex items-center justify-between gap-2 px-5 py-3.5 bg-[#3ac0bf] text-white font-[900] rounded-2xl">
                <span className="shrink-0">{cat}<span className="opacity-80 font-bold text-sm">（{list.length}）</span></span>
                <span className="flex items-center gap-2 ml-auto min-w-0">
                  {catCount > 0 && <span className="bg-[#fff170] text-[#4c59a1] text-xs px-2 py-0.5 rounded-full shrink-0">已選 {catCount}</span>}
                  <span className="shrink-0">{open ? "▼" : "▶"}</span>
                </span>
              </button>
              <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
                <div className="overflow-hidden">
                <div className="grid grid-cols-2 gap-3 p-3 bg-white/70 rounded-b-2xl">
                  {list.map(({ p, idx }) => {
                    const q = qty[idx] || 0;
                    return (
                      <div key={idx} className={`rounded-xl p-2 border-2 transition ${q >= 1 ? "border-[#3ac0bf] bg-[#eafcfb]" : "border-transparent bg-white"}`}>
                        <div className="relative">
                          <img src={p.img} loading="lazy" onClick={() => teamOpen && setQ(idx, q >= 1 ? 0 : 1)} className={`w-full aspect-square object-contain rounded-lg bg-white ${teamOpen ? "cursor-pointer" : ""}`} />
                          {p.star && <span className="absolute top-1 left-1 bg-[#f8a3f4] text-white text-[10px] font-black px-2 py-0.5 rounded-full">★款</span>}
                          <button type="button" aria-label="看大圖" onClick={(e) => { e.stopPropagation(); setZoomP(p); }} className="absolute top-1 right-1 w-9 h-9 rounded-full bg-black/35 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition"><ZoomIn size={16} /></button>
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
            </div>
          );
        })}

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

      {/* 確認 modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/40 flex items-end sm:items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5">
            <div className="font-[900] text-[#4c59a1] text-lg mb-1">確認填單</div>
            <div className="text-sm text-gray-500 mb-3">暱稱：{nick}</div>
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

      {/* 看大圖 lightbox */}
      {zoomP && (
        <div onClick={() => setZoomP(null)} className="fixed inset-0 z-[110] bg-black/70 flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <img src={zoomP.img} className="w-full max-h-[62vh] object-contain rounded-t-3xl bg-white" />
              <button type="button" aria-label="關閉" onClick={() => setZoomP(null)} className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center active:scale-90 transition"><X size={18} /></button>
              {zoomP.star && <span className="absolute top-2 left-2 bg-[#f8a3f4] text-white text-[11px] font-black px-2.5 py-1 rounded-full">★款</span>}
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

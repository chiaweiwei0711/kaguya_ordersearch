import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, Search, ArrowRight, SearchX, AlertTriangle } from "lucide-react";
import { GroupTeam, MySubmission } from "../types";
import { fetchMySubmissions, isOpen, fmtYMD } from "../services/groupOrderService";

interface Props {
  teams: GroupTeam[];
  onBack: () => void;
  initialNick?: string;   // 從填單成功頁帶入暱稱 → 自動查一次
}

const OrderLookup: React.FC<Props> = ({ teams, onBack, initialNick }) => {
  const [nick, setNick] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(false);
  const [results, setResults] = useState<MySubmission[]>([]);

  // 只顯示「尚未結單」團的填單（已結單者已變訂單，請走訂單查詢）
  const openCodes = useMemo(
    () => new Set(teams.filter(isOpen).map((t) => t.code)),
    [teams]
  );
  const teamNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    teams.forEach((t) => m.set(t.code, t.name));
    return m;
  }, [teams]);

  const visible = useMemo(
    () =>
      results
        .filter((s) => openCodes.has(s.team))
        .map((s) => ({ ...s, teamName: s.teamName || teamNameByCode.get(s.team) || s.team })),
    [results, openCodes, teamNameByCode]
  );

  // 同一團填過幾次（提醒重複填單）
  const teamCounts = useMemo(() => {
    const m = new Map<string, number>();
    visible.forEach((s) => m.set(s.team, (m.get(s.team) || 0) + 1));
    return m;
  }, [visible]);

  const grandTotal = useMemo(() => visible.reduce((sum, s) => sum + s.subtotal, 0), [visible]);

  const doSearch = async (override?: string) => {
    const q = (override ?? nick).trim();
    if (!q || loading) return;
    setLoading(true);
    setError(false);
    try {
      const data = await fetchMySubmissions(q);
      setResults(data);
      setSearched(true);
    } catch (e) {
      console.error("fetchMySubmissions error:", e);
      setError(true);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const resetSearch = () => { setSearched(false); setResults([]); setError(false); };

  // 從填單成功頁帶暱稱進來 → 自動查一次
  useEffect(() => {
    if (initialNick && initialNick.trim()) { setNick(initialNick); doSearch(initialNick); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 z-50 bg-[#fff170] overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-5 sm:px-7 py-7 relative">
        {/* 返回 */}
        <button onClick={onBack} aria-label="返回" className="w-11 h-11 rounded-full bg-[#3ac0bf] text-white flex items-center justify-center shadow-md active:scale-90 transition mb-4">
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <h2 className="text-[#4c59a1] font-[900] text-3xl sm:text-4xl tracking-widest text-center mb-6">
          填單明細查詢
        </h2>

        {/* 暱稱輸入 */}
        <label htmlFor="lookup-nick" className="block text-[#4c59a1] font-[900] text-sm mb-2 tracking-widest">
          輸入您的社群暱稱
        </label>
        <div className="bg-white rounded-full p-1.5 flex items-center gap-2 shadow-[6px_6px_0px_#000] border-[3px] border-black">
          <Search className="ml-3 text-[#f8a3f4] w-6 h-6 stroke-[3px] shrink-0" />
          <input
            id="lookup-nick"
            type="text"
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            placeholder="請輸入您的社群暱稱"
            className="w-full px-1 py-2.5 bg-transparent outline-none text-base font-[900] text-[#222] placeholder-gray-400"
            onKeyDown={(e) => { if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) doSearch(); }}
          />
          <button onClick={() => doSearch()} disabled={!nick.trim() || loading} aria-label="查詢" className="bg-[#f8a3f4] text-white w-11 h-11 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 active:scale-90 transition disabled:opacity-40">
            <ArrowRight className="stroke-[3px]" />
          </button>
        </div>
        <p className="text-[#f43f5e] text-xs font-bold mt-3 leading-relaxed px-1">
          本頁面提供尚未結單之填單預覽功能，需修改請洽詢官賴。結單且訂購完成後訂單才正式成立！
        </p>

        {/* 載入中 */}
        {loading && (
          <div className="flex flex-col items-center py-16">
            <div className="flex items-end gap-2 h-12">
              <div className="w-2.5 h-6 bg-[#f8a3f4] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <div className="w-2.5 h-9 bg-[#3ac0bf] rounded-full animate-bounce" style={{ animationDelay: "100ms" }} />
              <div className="w-2.5 h-5 bg-[#4c59a1] rounded-full animate-bounce" style={{ animationDelay: "200ms" }} />
              <div className="w-2.5 h-8 bg-[#fff170] border border-black/10 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="mt-4 text-[#4c59a1] font-[900] tracking-widest text-sm animate-pulse">查詢中…</p>
          </div>
        )}

        {/* 查詢結果 */}
        {!loading && searched && (
          <div className="mt-6 animate-fade-in">
            {error ? (
              <div className="flex flex-col items-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-[#f43f5e] mb-4">
                  <SearchX className="w-8 h-8 stroke-[2.5px]" />
                </div>
                <div className="text-[#4c59a1] font-[900] text-lg">查詢失敗，請稍後再試</div>
                <div className="text-[#4c59a1]/70 font-bold text-sm mt-1.5">若持續無法查詢，請私訊官賴協助。</div>
                <button onClick={resetSearch} className="mt-5 bg-[#3ac0bf] text-white font-[900] px-7 py-2.5 rounded-full active:scale-95 transition tracking-widest">重新查詢</button>
              </div>
            ) : visible.length === 0 ? (
              <div className="flex flex-col items-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] flex items-center justify-center text-[#4c59a1] mb-4">
                  <SearchX className="w-8 h-8 stroke-[2.5px]" />
                </div>
                <div className="text-[#4c59a1] font-[900] text-lg">查無填單預覽紀錄</div>
                <div className="text-[#4c59a1]/70 font-bold text-sm mt-1.5 leading-relaxed">可能還沒填，或您填的團已結單。</div>
                <button onClick={onBack} className="mt-5 bg-[#3ac0bf] text-white font-[900] px-7 py-2.5 rounded-full active:scale-95 transition tracking-widest">看看開團中的團</button>
              </div>
            ) : (
              <>
                <div className="text-center mb-4">
                  <span className="inline-block bg-[#3ac0bf] text-white font-[900] text-sm px-5 py-1.5 rounded-full tracking-widest">
                    共 {visible.length} 筆填單 · 預估 ${grandTotal.toLocaleString()}
                  </span>
                </div>

                <div className="space-y-3">
                  {visible.map((s, idx) => (
                    <div key={`${s.team}-${idx}`} className="bg-white rounded-2xl px-5 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[#4c59a1] font-[900] text-base leading-snug">{s.teamName}</div>
                          {s.time && <div className="text-[#4c59a1]/55 font-bold text-xs mt-1">填單時間 {fmtYMD(s.time)}</div>}
                        </div>
                        <span className="shrink-0 bg-[#4c59a1] text-white font-[900] text-[11px] px-2.5 py-1 rounded-full">尚未結單</span>
                      </div>

                      {(teamCounts.get(s.team) || 0) > 1 && (
                        <div className="mt-2 inline-flex items-center gap-1 bg-[#fff170] border-2 border-black text-black font-[900] text-[11px] px-2.5 py-0.5 rounded-full">
                          <AlertTriangle className="w-3 h-3 stroke-[3px]" /> 此團您填過 {teamCounts.get(s.team)} 次
                        </div>
                      )}

                      <div className="border-t-2 border-[#4c59a1]/15 my-3" />
                      {s.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-sm text-[#4c59a1] font-bold py-0.5">
                          <span className="truncate mr-2">{it.label}</span>
                          <span className="shrink-0">×{it.qty}　${(it.qty * it.price).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="border-t-2 border-[#4c59a1]/15 my-3" />
                      <div className="flex justify-between text-[#4c59a1] font-[900]">
                        <span>預估小計</span>
                        <span>${s.subtotal.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-[#4c59a1]/70 font-bold text-[11px] leading-relaxed mt-4 px-1">
                  因各團二補規則有些許差異，實際總金額以結單後訂單查詢為準！
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderLookup;

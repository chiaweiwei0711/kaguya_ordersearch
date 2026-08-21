import React, { useRef, useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

/**
 * 下拉重整（給 fixed inset-0 overflow-y-auto 這種自己捲的頁面用）
 *
 * 為什麼不用瀏覽器原生的下拉重整：填單／團列表都是蓋在整頁上的固定容器，
 * body 根本不會捲，原生下拉在這幾頁本來就不會觸發；而且原生是「整頁重載」，
 * 要把整個網站重新下載一次。這裡只重抓資料（CDN 菜單 ＋ live 人數），快很多。
 *
 * 用法：const { ref, indicator } = usePullToRefresh(onRefresh);
 *       <div ref={ref} className="fixed inset-0 overflow-y-auto">{indicator}...</div>
 */
const THRESHOLD = 60;   // 拉超過這個距離放手才會重整
const MAX_PULL = 90;    // 最多拉這麼長（再拉也不會變長，避免整頁被扯開）

export const usePullToRefresh = (onRefresh?: () => Promise<any> | any) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const pullRef = useRef(0);        // 目前拉的距離也存一份在 ref：監聽器只掛一次，不能靠 state 閉包
  const setPullBoth = (v: number) => { pullRef.current = v; setPull(v); };

  useEffect(() => {
    const el = ref.current;
    if (!el || !onRefresh) return;

    let startY = 0;
    let pulling = false;

    const onStart = (e: TouchEvent) => {
      if (busyRef.current || e.touches.length !== 1) return;
      if (el.scrollTop > 0) return;          // 只有捲到最頂端才算下拉重整
      startY = e.touches[0].clientY;
      pulling = true;
    };

    const onMove = (e: TouchEvent) => {
      if (!pulling || busyRef.current) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0) { setPullBoth(0); pulling = false; return; }   // 往上滑＝正常捲動，交還給瀏覽器
      if (el.scrollTop > 0) { setPullBoth(0); pulling = false; return; }
      e.preventDefault();                                         // 擋掉橡皮筋，不然畫面會跟著晃
      setPullBoth(Math.min(dy * 0.45, MAX_PULL));                 // 阻尼：拉起來有重量感
    };

    const onEnd = async () => {
      if (!pulling || busyRef.current) { pulling = false; return; }
      pulling = false;
      if (pullRef.current < THRESHOLD) { setPullBoth(0); return; }
      busyRef.current = true;
      setBusy(true);
      setPullBoth(THRESHOLD);
      try { await onRefresh(); } catch (_) { /* 抓失敗就維持畫面現有資料，不要嚇客人 */ }
      busyRef.current = false;
      setBusy(false);
      setPullBoth(0);
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove as any);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh]);   // ⚠️ 不能把 pull 放進來：手指還沒放開就重掛監聽器，拉到一半會斷掉

  const ready = pull >= THRESHOLD;
  const indicator = (
    <div
      className="sticky top-0 z-30 h-0 flex justify-center pointer-events-none"
      style={{ opacity: pull > 4 || busy ? 1 : 0 }}
    >
      <div
        className={`w-11 h-11 rounded-full bg-white border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-center ${
          busy ? "" : "transition-transform duration-150"
        }`}
        style={{ transform: `translateY(${Math.max(pull - 46, -46)}px)` }}
      >
        <RefreshCw
          className={`w-5 h-5 stroke-[3px] ${ready || busy ? "text-[#3ac0bf]" : "text-[#4c59a1]/40"} ${busy ? "animate-spin" : ""}`}
          style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}
        />
      </div>
    </div>
  );

  return { ref, indicator, refreshing: busy };
};

export default usePullToRefresh;

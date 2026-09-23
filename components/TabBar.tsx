import React from "react";
import { Home, Shapes, ClipboardList, User } from "lucide-react";

export type TabKey = "home" | "works" | "order" | "orders";

interface Props {
  active: TabKey | null;          // null＝目前不在這四個主頁（例如填單頁內），整條就不強調任何一格
  onGo: (key: TabKey) => void;
}

const TABS: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "home",   label: "首頁",     Icon: Home },
  { key: "works",  label: "作品",     Icon: Shapes },
  { key: "order",  label: "填單專區", Icon: ClipboardList },
  { key: "orders", label: "我的訂單", Icon: User },
];

// 底部導覽：Liquid Glass 風（iOS 26 那種浮起的玻璃膠囊）
//   做得到：模糊＋飽和、鏡面高光邊、浮起圓角、選中的玻璃泡泡滑過去、按壓回彈
//   做不到：真正的背景折射（要 WebGL／SVG displacement，手機會掉效能發燙）
// 內容區維持玩具風，只有這條控制列用玻璃——Apple 自己也是這樣分的。
const TabBar: React.FC<Props> = ({ active, onGo }) => {
  const idx = Math.max(0, TABS.findIndex((t) => t.key === active));

  return (
    <nav
      aria-label="主要導覽"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-[26rem] rounded-[30px] overflow-hidden isolate
                 bg-gradient-to-b from-white/65 to-white/35 backdrop-blur-2xl backdrop-saturate-200
                 shadow-[0_10px_34px_rgba(12,16,50,0.30),inset_0_1px_0_rgba(255,255,255,0.6),inset_0_0_0_1px_rgba(255,255,255,0.45)]"
      style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
    >
      {/* 玻璃表面的斜向反光 */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[30px] mix-blend-screen"
        style={{ background: "linear-gradient(115deg,rgba(255,255,255,.55) 0%,rgba(255,255,255,0) 38%,rgba(255,255,255,0) 62%,rgba(255,255,255,.22) 100%)" }}
      />
      {/* 選中的玻璃泡泡：切換時滑過去 */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-1.5 bottom-1.5 w-1/4 rounded-[22px] z-0 bg-gradient-to-b from-white/95 to-white/60
                     shadow-[0_4px_14px_rgba(12,16,50,0.16),inset_0_1px_0_rgba(255,255,255,0.9)]
                     transition-transform duration-[460ms] motion-reduce:transition-none"
          style={{ transform: `translateX(${idx * 100}%)`, transitionTimingFunction: "cubic-bezier(.32,.72,0,1)" }}
        />
      )}

      <div className="relative z-10 grid grid-cols-4 px-1.5 pt-2">
        {TABS.map(({ key, label, Icon }) => {
          const on = active === key;
          return (
            <button
              key={key}
              onClick={() => onGo(key)}
              aria-current={on ? "page" : undefined}
              className={`flex flex-col items-center gap-1 py-1.5 rounded-[22px] font-[900] text-[11px] transition-transform duration-150 active:scale-90 ${
                on ? "text-[#4c59a1]" : "text-[#4c59a1]/45"
              }`}
            >
              <Icon className="w-[22px] h-[22px] stroke-[2.6px]" />
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabBar;

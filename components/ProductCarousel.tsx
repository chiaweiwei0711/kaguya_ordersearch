import React, { useRef, useState } from "react";

interface Props {
  images: string[];
  onTap?: () => void;        // 輕點（非滑動）→ 交給父層（小卡＝選取）
  className?: string;
}

const SWIPE = 40;            // 換圖門檻（px）
const TAP = 8;               // 位移小於此值＝視為點擊，不是滑動

// 小卡用的多圖輪播：手指左右滑換圖、左下顯示張數；只有一張時跟原本一樣（無張數、無滑動）
const ProductCarousel: React.FC<Props> = ({ images, onTap, className = "" }) => {
  const imgs = images.length ? images : [""];
  const [idx, setIdx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const cur = Math.min(idx, imgs.length - 1);

  const onDown = (e: React.PointerEvent) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current; start.current = null;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (Math.abs(dx) < TAP && Math.abs(dy) < TAP) { onTap?.(); return; }   // 點擊
    if (Math.abs(dx) > Math.abs(dy)) {                                     // 橫滑才換圖
      if (dx < -SWIPE) setIdx((i) => Math.min(imgs.length - 1, i + 1));
      else if (dx > SWIPE) setIdx((i) => Math.max(0, i - 1));
    }
  };

  return (
    <div
      className={`relative w-full aspect-square rounded-lg overflow-hidden bg-white ${className}`}
      style={{ touchAction: "pan-y" }}
      onPointerDown={onDown}
      onPointerUp={onUp}
    >
      <div
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${cur * 100}%)` }}
      >
        {imgs.map((src, i) => (
          <img
            key={i}
            src={src}
            loading={i === 0 ? "eager" : "lazy"}
            referrerPolicy="no-referrer"
            draggable={false}
            className="w-full h-full shrink-0 object-contain bg-white select-none"
          />
        ))}
      </div>
      {imgs.length > 1 && (
        <span className="absolute left-1.5 bottom-1.5 bg-black/45 text-white text-[11px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
          {cur + 1}/{imgs.length}
        </span>
      )}
    </div>
  );
};

export default ProductCarousel;

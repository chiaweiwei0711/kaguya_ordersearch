// src/components/Aurora.tsx
import React, { ReactNode } from "react";

interface AuroraProps {
  colorStops?: string[]; // 顏色陣列
  amplitude?: number;    // 振幅 (這裡我們把它轉換為流動速度和範圍)
  blend?: number;        // 混合程度 (對應模糊度)
  children?: ReactNode;
}

const Aurora: React.FC<AuroraProps> = ({
  colorStops = ["#5227FF", "#ff5cc3", "#3b0764"], // 預設顏色
  amplitude = 1.0,
  blend = 0.5,
  children,
}) => {
  // 1. 處理參數
  // 確保至少有三個顏色，如果不夠就重複使用
  const colors = colorStops.length >= 3 
    ? colorStops 
    : [...colorStops, ...colorStops, ...colorStops].slice(0, 3);

  // 2. 轉換 props 為 CSS 變數
  // amplitude (振幅) -> 控制動畫速度 (數字越大越快)
  const speed = 20 / (amplitude || 1); 
  
  // blend (混合) -> 控制模糊程度 (0~1 -> 50px~200px)
  const blurAmount = 50 + (blend * 150);

  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full overflow-hidden bg-black/90">
      
      {/* 這一層是極光容器 */}
      <div 
        className="absolute inset-0 opacity-60"
        style={{
          filter: `blur(${blurAmount}px)`,
        }}
      >
        {/* 光團 1 */}
        <div
          className="absolute top-[-50%] left-[-50%] w-[150%] h-[150%] rounded-full animate-aurora-1 mix-blend-screen"
          style={{
            backgroundColor: colors[0],
            animationDuration: `${speed}s`,
          }}
        ></div>

        {/* 光團 2 */}
        <div
          className="absolute top-[-50%] right-[-50%] w-[150%] h-[150%] rounded-full animate-aurora-2 mix-blend-screen"
          style={{
            backgroundColor: colors[1],
            animationDuration: `${speed * 1.2}s`, // 稍微錯開速度
            animationDelay: `-${speed * 0.5}s`
          }}
        ></div>

        {/* 光團 3 */}
        <div
          className="absolute bottom-[-50%] right-[-50%] w-[150%] h-[150%] rounded-full animate-aurora-3 mix-blend-screen"
          style={{
            backgroundColor: colors[2] || colors[0],
            animationDuration: `${speed * 0.8}s`,
            animationDelay: `-${speed}s`
          }}
        ></div>
      </div>

      {/* 內容層 (如果有 children 的話) */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>

      {/* 內部 CSS 動畫定義 */}
      <style>{`
        @keyframes aurora-1 {
          0% { transform: translate(10%, 10%) rotate(0deg) scale(1); }
          50% { transform: translate(50%, 20%) rotate(180deg) scale(1.2); }
          100% { transform: translate(10%, 10%) rotate(360deg) scale(1); }
        }
        @keyframes aurora-2 {
          0% { transform: translate(-10%, 20%) rotate(0deg) scale(1.2); }
          50% { transform: translate(-40%, 10%) rotate(-180deg) scale(1); }
          100% { transform: translate(-10%, 20%) rotate(-360deg) scale(1.2); }
        }
        @keyframes aurora-3 {
          0% { transform: translate(0%, -10%) rotate(0deg) scale(1); }
          50% { transform: translate(30%, -40%) rotate(120deg) scale(1.3); }
          100% { transform: translate(0%, -10%) rotate(360deg) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Aurora;

// src/components/Aurora.tsx
import React, { ReactNode } from "react";

interface AuroraProps {
  colorStops?: string[];
  amplitude?: number;
  blend?: number;
  children?: ReactNode;
}

const Aurora: React.FC<AuroraProps> = ({
  // 👇 這是你指定的 Kaguya 專屬配色
  colorStops = ["#5227FF", "#ff0ab1", "#0537ff"], 
  amplitude = 1.0, // 速度
  blend = 0.5,     // 模糊混合程度
  children,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center w-full h-full bg-black text-slate-950 transition-bg">
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -inset-[10px] opacity-80"
          style={{
            // 根據 blend 參數調整模糊度 (0.5 大約是 10px~20px 的感覺，這裡我們放大效果)
            filter: `blur(${blend * 40}px)`, 
            backgroundColor: "transparent",
          }}
        >
          {/* --- 光團 1 --- */}
          <div
            className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] animate-aurora-1 mix-blend-screen opacity-80"
            style={{
              backgroundColor: colorStops[0], // #5227FF
              animationDuration: `${10 / amplitude}s`, // 根據 amplitude 調整速度
            }}
          ></div>

          {/* --- 光團 2 --- */}
          <div
            className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] animate-aurora-2 mix-blend-screen opacity-80"
            style={{
              backgroundColor: colorStops[1], // #ff0ab1
              animationDuration: `${15 / amplitude}s`,
              animationDelay: "-5s",
            }}
          ></div>

          {/* --- 光團 3 --- */}
          <div
            className="absolute bottom-[-50%] right-[-50%] w-[200%] h-[200%] animate-aurora-3 mix-blend-screen opacity-80"
            style={{
              backgroundColor: colorStops[2], // #0537ff
              animationDuration: `${12 / amplitude}s`,
              animationDelay: "-10s",
            }}
          ></div>
        </div>
        
        {/* 加上一層黑色遮罩，讓極光只在背景隱約流動，不要太刺眼 */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      {/* 內容層 */}
      <div className="relative z-10 w-full h-full">
         {children}
      </div>

      {/* CSS 動畫定義 */}
      <style>{`
        @keyframes aurora-1 {
          0%, 100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; transform: translate(0, 0) rotate(0deg); }
          33% { border-radius: 70% 30% 50% 50% / 30% 40% 70% 50%; transform: translate(2%, 5%) rotate(120deg); }
          66% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; transform: translate(-2%, 2%) rotate(240deg); }
        }
        @keyframes aurora-2 {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; transform: translate(0, 0) rotate(0deg); }
          50% { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; transform: translate(-2%, -5%) rotate(180deg); }
        }
        @keyframes aurora-3 {
          0%, 100% { border-radius: 50% 50% 20% 80% / 25% 80% 20% 90%; transform: translate(0, 0) rotate(0deg); }
          50% { border-radius: 20% 80% 50% 50% / 80% 20% 80% 20%; transform: translate(5%, -2%) rotate(180deg); }
        }
        .animate-aurora-1 { animation: aurora-1 infinite linear alternate; }
        .animate-aurora-2 { animation: aurora-2 infinite linear alternate; }
        .animate-aurora-3 { animation: aurora-3 infinite linear alternate; }
      `}</style>
    </div>
  );
};

export default Aurora;
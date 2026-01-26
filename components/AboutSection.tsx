// src/components/AboutSection.tsx
import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Box, Heart } from 'lucide-react';

const AboutSection: React.FC = () => {
  const [text, setText] = useState('');
  const fullText = "Hii，這裡是Kaguya代購！\n\nKAGUYA 始於 2024 年，由兩位 20 多歲的女生創立。\n\n起初只是因為太愛二次元、太愛買買買，結果一不小心就踏上了這條一去不復返的代購旅程XDD。\n\n我們和大家一樣，血液裡流著中二的熱血（？）我們懂那種買超喜歡的周邊的喜悅，更懂拆開包裹那一瞬間的喜悅又神聖的儀式感。\n\nKaguya 存在的意義，就是為了守護這份熱愛。每一件你珍視的收藏，我們都會最用心的對待，把喜歡的東西完好無缺地送到你手裡。";
  const [loadBar, setLoadBar] = useState(false);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setText((prev) => prev + fullText.charAt(index));
      index++;
      if (index === fullText.length) clearInterval(timer);
    }, 40);
    setTimeout(() => setLoadBar(true), 500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen pb-32 animate-fade-in-up bg-transparent overflow-hidden">
      
      <div className="relative z-10 container mx-auto px-4">
        
        {/* 標題區：改回正常白字 */}
        <div className="text-center mb-10 relative cursor-default pt-8">
            <h1 className="relative z-10 text-3xl md:text-5xl font-bold tracking-wide text-white drop-shadow-md">
              KAGUYA機密檔案
            </h1>
            <div className="text-pink-300/80 font-mono text-sm md:text-lg tracking-[0.3em] mt-3 font-bold mix-blend-overlay">
              About Us
            </div>
        </div>

        {/* 下方卡片區：維持透明液態質感 */}
        <div className="max-w-4xl mx-auto 
                        relative overflow-hidden 
                        rounded-[2rem] p-6 md:p-12 
                        bg-black/10           
                        backdrop-blur-md       
                        border border-white/10 
                        ring-1 ring-pink-500/10
                        shadow-[0_8px_32px_0_rgba(0,0,0,0.1)]">
          
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-pink-500/30 to-transparent"></div>
          <div className="absolute bottom-0 right-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>

          <div className="flex flex-col md:flex-row gap-10 items-center relative z-10">
            {/* 左側雷達區 */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center relative">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-pink-500/10 rounded-full"></div>
                <div className="absolute inset-4 border border-pink-500/30 rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-0 rounded-full border-t-2 border-pink-500/60 animate-[spin_2s_linear_infinite] shadow-[0_0_15px_rgba(236,72,153,0.4)]"></div>
                
                <div className="z-10 bg-black/20 backdrop-blur-sm p-4 rounded-full border border-pink-500/20 overflow-hidden w-24 h-24 flex items-center justify-center">
                   <img src="https://duk.tw/ZhYY5L.png" alt="Kaguya Logo" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                </div>
              </div>
              <div className="mt-6 text-center">
                  <div className="text-pink-400 font-black text-xl tracking-widest drop-shadow-md">ID: KAGUYA</div>
                  <div className="text-gray-400 text-xs font-mono mt-1 font-bold tracking-wider">二次元物資運送員</div>
              </div>
            </div>

            {/* 右側內容區 */}
            <div className="w-full md:w-2/3 space-y-8">
              {/* 戰力表 */}
              <div>
                <h3 className="text-gray-400 font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2 opacity-80">
                  <Sparkles size={14} className="text-pink-400"/> SELLER STATS (賣家戰力)
                </h3>
                <div className="space-y-4 font-mono text-sm font-bold">
                  {/* 手速 */}
                  <div>
                    <div className="flex justify-between mb-1 text-pink-200/90">
                      <span className="flex items-center gap-2"><Zap size={14}/> 搶單手速 (SPEED)</span>
                      <span className="text-white drop-shadow-md">GOD HAND</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full bg-gradient-to-r from-pink-600 to-pink-400 shadow-[0_0_10px_#ec4899] transition-all duration-1000 ease-out ${loadBar ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                  {/* 包裝 */}
                  <div>
                    <div className="flex justify-between mb-1 text-purple-200/90">
                      <span className="flex items-center gap-2"><Box size={14}/> 包材防禦力 (DEF)</span>
                      <span className="text-white drop-shadow-md">Lv. 99</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_#a855f7] transition-all duration-1000 delay-300 ease-out ${loadBar ? 'w-[98%]' : 'w-0'}`}></div>
                    </div>
                  </div>
                  {/* 廚力 */}
                  <div>
                    <div className="flex justify-between mb-1 text-red-200/90">
                      <span className="flex items-center gap-2"><Heart size={14}/> 廚力 (PASSION)</span>
                      <span className="animate-pulse text-red-400 font-black drop-shadow-md">OVERLOAD</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div className={`h-full bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_#ef4444] transition-all duration-1000 delay-500 ease-out ${loadBar ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

              {/* 文字區 */}
              <div className="relative min-h-[160px]">
                  <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2 flex items-center gap-2 opacity-60">
                      // HIDDEN MESSAGE <span className="animate-pulse">_</span>
                  </h3>
                  <p className="text-white font-bold leading-relaxed whitespace-pre-wrap font-sans text-base md:text-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                      {text}
                      <span className="inline-block w-2 h-5 bg-pink-500 ml-1 align-middle animate-pulse shadow-[0_0_10px_#ec4899]"></span>
                  </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutSection;

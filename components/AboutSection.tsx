import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, Box, Heart } from 'lucide-react';

const AboutSection: React.FC = () => {
  const [text, setText] = useState('');
  
  // 你的文案
  const fullText = "其實我們和你一樣，懂那種怕錯過本命的焦慮，也懂收到包裹時那種神聖的開箱儀式感。\n\nKaguya 這個系統不只是冰冷的代碼，而是為了守護這份熱愛而生的。我們存在的意義，就是讓你能安心地把對角色的愛接回家。\n\n每一件你珍視的收藏，我們都會用最高規格對待。\n\nKaguya & 🐰 Fifi 敬上";
  
  const [loadBar, setLoadBar] = useState(false);

  // 打字機效果
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setText((prev) => prev + fullText.charAt(index));
      index++;
      if (index === fullText.length) clearInterval(timer);
    }, 50); // 打字速度

    setTimeout(() => setLoadBar(true), 500);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full min-h-screen pb-32 animate-fade-in-up">
      
      {/* 內容層 */}
      <div className="container mx-auto px-4">
        
        {/* 頁面標題 */}
        <div className="text-center mb-12 relative group cursor-default pt-8">
          <h1 className="text-4xl md:text-7xl font-[900] tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-pink-500 animate-pulse"
              style={{ fontFamily: "'Arial Black', sans-serif" }}>
            SYSTEM : KAGUYA
          </h1>
          <div className="text-pink-500 font-mono text-sm md:text-xl tracking-[0.5em] md:tracking-[1em] mt-2 opacity-80">
            /// ONLINE_
          </div>
        </div>

        {/* 玻璃卡片主體 */}
        <div className="max-w-4xl mx-auto bg-gray-900/60 backdrop-blur-xl border border-pink-500/30 rounded-[2rem] p-6 md:p-12 shadow-[0_0_50px_rgba(236,72,153,0.15)] relative overflow-hidden">
          
          {/* 卡片裝飾線條 */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-pink-500 to-transparent opacity-50"></div>
          <div className="absolute bottom-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50"></div>

          <div className="flex flex-col md:flex-row gap-10 items-center">
            
            {/* 左側：視覺核心 (雷達) */}
            <div className="w-full md:w-1/3 flex flex-col items-center justify-center relative">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-pink-500/20 rounded-full"></div>
                <div className="absolute inset-4 border border-pink-500/40 rounded-full border-dashed animate-[spin_10s_linear_infinite]"></div>
                <div className="absolute inset-0 rounded-full border-t-2 border-pink-500/80 animate-[spin_2s_linear_infinite] shadow-[0_0_15px_#ec4899]"></div>
                
                {/* Logo */}
                <div className="z-10 bg-black p-4 rounded-full border border-gray-700 overflow-hidden w-24 h-24 flex items-center justify-center">
                   <img src="https://duk.tw/ZhYY5L.png" alt="Kaguya Logo" className="w-full h-full object-contain drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
                </div>
              </div>
              <div className="mt-6 text-center">
                  <div className="text-pink-500 font-black text-xl tracking-widest">ID: KAGUYA</div>
                  <div className="text-gray-500 text-xs font-mono mt-1">二次元物資運送員</div>
              </div>
            </div>

            {/* 右側：資料與文字 */}
            <div className="w-full md:w-2/3 space-y-8">
              
              {/* 戰力表 */}
              <div>
                <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Sparkles size={14}/> SELLER STATS (賣家戰力)
                </h3>
                
                <div className="space-y-4 font-mono text-sm font-bold">
                  {/* 手速 */}
                  <div>
                    <div className="flex justify-between mb-1 text-pink-300">
                      <span className="flex items-center gap-2"><Zap size={14}/> 搶單手速 (SPEED)</span>
                      <span>GOD HAND</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-pink-600 to-pink-400 shadow-[0_0_10px_#ec4899] transition-all duration-1000 ease-out ${loadBar ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>

                  {/* 包裝 */}
                  <div>
                    <div className="flex justify-between mb-1 text-purple-300">
                      <span className="flex items-center gap-2"><Box size={14}/> 包材防禦力 (DEF)</span>
                      <span>Lv. 99</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_10px_#a855f7] transition-all duration-1000 delay-300 ease-out ${loadBar ? 'w-[98%]' : 'w-0'}`}></div>
                    </div>
                  </div>

                  {/* 廚力 */}
                  <div>
                    <div className="flex justify-between mb-1 text-red-300">
                      <span className="flex items-center gap-2"><Heart size={14}/> 廚力 (PASSION)</span>
                      <span className="animate-pulse text-red-400">OVERLOAD</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full bg-gradient-to-r from-red-600 to-red-500 shadow-[0_0_10px_#ef4444] transition-all duration-1000 delay-500 ease-out ${loadBar ? 'w-full' : 'w-0'}`}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 分隔線 */}
              <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent"></div>

              {/* 感性文字區 */}
              <div className="relative min-h-[160px]">
                  <h3 className="text-gray-500 font-bold text-xs uppercase tracking-widest mb-2">
                      // HIDDEN MESSAGE
                  </h3>
                  <p className="text-gray-200 font-bold leading-relaxed whitespace-pre-wrap font-sans text-base md:text-lg">
                      {text}
                      <span className="inline-block w-2 h-5 bg-pink-500 ml-1 align-middle animate-pulse"></span>
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

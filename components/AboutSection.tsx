import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const STORY: string[] = [
  "KAGUYA 成立於 2024 年。",
  "因為同樣的興趣而生的代購服務～～希望大家可以買的開心逛得開心～ 從開第一團到現在，我們每天都在想怎麼樣可以讓大家買的更方便更輕鬆更開心，持續每天進步、優化、努力讓大家有更便利更快樂的購物體驗！",
];

// 標題是 user 自己下的，說明才是我補的；每一條都對應站上真的有的功能
const ADVANTAGES: { title: string; desc: string }[] = [
  {
    title: "自助查單系統隨時查",
    desc: "用您的暱稱搜尋，所有訂單一次列出，還能依狀態篩選。24 小時都查得到，不用問、不用等。",
  },
  {
    title: "手指點點就下單 超方便",
    desc: "開團商品點一點就送出，不用手打品項，只要在記事本回覆「已填單」即可！填單紀錄可以隨時回查，數量品項清楚明瞭！",
  },
  {
    title: "綁定暱稱即時收付款／到貨訊息",
    desc: "綁定之後，付款提醒與抵台通知會一對一推播到你的 LINE，不會淹沒在社群訊息裡。",
  },
  {
    title: "懶人友善設計 ✨ 購物流程一目瞭然",
    desc: "從填單、匯款到抵台下單，每一步該做什麼、目前階段，系統都寫得清清楚楚，照著做就好，超級簡單～",
  },
  {
    title: "費用清楚透明 讓客戶安心",
    desc: "大多數團免二補，每一團的二補標準，開團當下就寫在填單頁最上面，絕對不會等東西到了才被要求補一堆看不懂的錢。",
  },
  {
    title: "想要什麼都可以許願！",
    desc: "許願池開放心儀商品許願開團。看到想要卻沒人開的，私訊官賴許願，我們評估後就有機會開團。",
  },
];

const AboutSection: React.FC<Props> = ({ onBack }) => {
  return (
    <div className="fixed inset-0 z-40 bg-[#3ac0bf] overflow-y-auto">
      <div className="w-full max-w-xl mx-auto px-5 sm:px-7 py-8">
        <button
          onClick={onBack}
          aria-label="返回"
          className="w-11 h-11 rounded-full bg-white text-[#3ac0bf] flex items-center justify-center shadow-md active:scale-90 transition mb-5"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-[#fff170] font-[900] text-4xl sm:text-5xl tracking-widest">ABOUT</h2>
          <p className="text-white font-[900] text-sm tracking-[0.4em] mt-2">關於 KAGUYA</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-white shadow-md flex items-center justify-center overflow-hidden">
            <img src="https://duk.tw/ZhYY5L.png" alt="Kaguya" className="w-16 h-16 object-contain" />
          </div>
        </div>

        <div className="bg-white rounded-[28px] px-6 py-7 sm:px-8">
          <div className="inline-block bg-[#fff170] text-[#4c59a1] font-[900] text-sm px-4 py-1.5 rounded-full mb-5">我們是誰</div>
          <div className="space-y-4 text-[#4c59a1] font-bold text-[15px] leading-relaxed">
            {STORY.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>

        {/* 優勢：一條一張卡，左上角編號圓標 */}
        <div className="mt-7">
          <div className="inline-block bg-[#fff170] text-[#4c59a1] font-[900] text-sm px-4 py-1.5 rounded-full mb-4">為什麼選 KAGUYA</div>
          <div className="space-y-3">
            {ADVANTAGES.map((a, i) => (
              <div key={i} className="bg-white border-[3px] border-black rounded-2xl shadow-[4px_4px_0px_#000] px-4 py-3.5 flex gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[#fff170] border-2 border-black text-[#4c59a1] font-[900] text-sm flex items-center justify-center">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-[#4c59a1] font-[900] text-[15px] leading-snug">{a.title}</div>
                  <p className="text-[#4c59a1]/75 font-bold text-[13px] leading-relaxed mt-1">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-white/90 font-bold text-xs mt-7 leading-relaxed">
          把喜歡的東西，完好無缺地送到你手裡。
        </p>
      </div>
    </div>
  );
};

export default AboutSection;

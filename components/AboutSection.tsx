import React from 'react';
import { ChevronLeft } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const STORY: string[] = [
  "Hii，這裡是 Kaguya 代購！",
  "KAGUYA 始於 2024 年，由兩位 20 多歲的女生創立。起初只是因為太愛二次元、太愛買買買，結果一不小心就踏上了這條一去不復返的代購旅程 XDD。",
  "我們和大家一樣，血液裡流著中二的熱血（？）我們懂那種買到超喜歡周邊的喜悅，更懂拆開包裹那一瞬間又神聖的儀式感。",
  "Kaguya 存在的意義，就是為了守護這份熱愛。每一件你珍視的收藏，我們都會最用心地對待，把喜歡的東西完好無缺地送到你手裡。",
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

        <p className="text-center text-white/90 font-bold text-xs mt-7 leading-relaxed">
          把喜歡的東西，完好無缺地送到你手裡。
        </p>
      </div>
    </div>
  );
};

export default AboutSection;

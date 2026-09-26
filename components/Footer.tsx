import React from "react";
import { MessageCircle, Users, Instagram, BookOpen, HelpCircle, Shield, Megaphone } from "lucide-react";
import { APP_CONFIG } from "../config";

interface Props {
  onGuide: () => void;
  onFaq: () => void;
  onAbout: () => void;
  onNews: () => void;
}

// 頁尾：七家日本電商都有（特定商取引法表示／会社概要／プライバシーポリシー）。
// 我們對應的是通訊交易的資訊揭露 —— 商號、統編、退換貨與倉儲規則。
// 這些規則現在只寫在社群的規則文裡，網站上完全沒有。
// 細長條版：其他頁只需要商號與版權，不用整組連結也不用卡片框
export const SlimFooter: React.FC = () => (
  <div className="w-full mt-10 pt-5 pb-8 border-t border-[#283d3e]/10 text-center">
    <div className="font-[900] text-[11.5px] text-[#283d3e]/55 tracking-wide">瓦多次元工作室 · 統一編號 60071756</div>
    <div className="font-bold text-[11px] text-[#283d3e]/35 mt-1">© {new Date().getFullYear()} KAGUYA 日本動漫周邊專業代購</div>
  </div>
);

const Footer: React.FC<Props> = ({ onGuide, onFaq, onAbout, onNews }) => {
  const link = "flex items-center gap-2 py-2 font-[900] text-[13.5px] text-[#283d3e]/80 whitespace-nowrap active:opacity-60 transition";
  const head = "font-[900] text-[11px] tracking-[0.2em] text-[#283d3e]/40 mb-1";

  return (
    <footer className="w-full max-w-lg mx-auto px-4 sm:px-0 pt-10 pb-12">
      <div className="bg-white rounded-3xl px-6 py-7">
        <div className="grid grid-cols-2 gap-x-6">
          <div>
            <div className={head}>GUIDE</div>
            <button onClick={onGuide} className={link}><BookOpen className="w-4 h-4 stroke-[2.6px] opacity-60" />購物流程</button>
            <button onClick={onFaq} className={link}><HelpCircle className="w-4 h-4 stroke-[2.6px] opacity-60" />常見問題</button>
            <button onClick={onAbout} className={link}><Shield className="w-4 h-4 stroke-[2.6px] opacity-60" />關於我們</button>
            <button onClick={onNews} className={link}><Megaphone className="w-4 h-4 stroke-[2.6px] opacity-60" />最新公告</button>
          </div>
          <div>
            <div className={head}>CONTACT</div>
            <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className={link}><MessageCircle className="w-4 h-4 stroke-[2.6px] opacity-60" />官方 LINE</a>
            <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className={link}><Users className="w-4 h-4 stroke-[2.6px] opacity-60" />LINE 社群</a>
            <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className={link}><Instagram className="w-4 h-4 stroke-[2.6px] opacity-60" />Instagram</a>
            <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className={link}><MessageCircle className="w-4 h-4 stroke-[2.6px] opacity-60" />Threads</a>
          </div>
        </div>

        <div className="mt-7 pt-5 border-t border-[#283d3e]/10 text-center">
          <div className="font-[900] text-[12px] text-[#283d3e]/70">瓦多次元工作室</div>
          <div className="font-bold text-[11.5px] text-[#283d3e]/50 mt-0.5">統一編號 60071756</div>
          <div className="font-bold text-[11px] text-[#283d3e]/35 mt-2">© {new Date().getFullYear()} KAGUYA 日本動漫周邊專業代購</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

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
const Footer: React.FC<Props> = ({ onGuide, onFaq, onAbout, onNews }) => {
  const link = "flex items-center gap-2 py-2 font-[900] text-[13.5px] text-[#283d3e]/80 active:opacity-60 transition";
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
            <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className={link}><MessageCircle className="w-4 h-4 stroke-[2.6px] opacity-60" />LINE 官方帳號</a>
            <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className={link}><Users className="w-4 h-4 stroke-[2.6px] opacity-60" />LINE 社群</a>
            <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className={link}><Instagram className="w-4 h-4 stroke-[2.6px] opacity-60" />Instagram</a>
            <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className={link}><MessageCircle className="w-4 h-4 stroke-[2.6px] opacity-60" />Threads</a>
          </div>
        </div>

        {/* 購買前必讀：這幾條現在只存在於社群規則，網站上沒寫等於沒有 */}
        <div className="mt-6 pt-5 border-t border-[#283d3e]/10 space-y-3">
          <div className={head}>購買前請詳閱</div>
          <p className="text-[12.5px] leading-relaxed font-bold text-[#283d3e]/70">
            本站商品為日本代購預購，於結單後才向日本方下訂，屬依消費者要求所為之客製化給付，
            <span className="text-[#e46b58]">不適用七天猶豫期間（鑑賞期）</span>，送出填單後恕不接受取消。
          </p>
          <p className="text-[12.5px] leading-relaxed font-bold text-[#283d3e]/70">
            商品抵台後提供 <span className="text-[#283d3e]">30 天</span> 免費倉儲，逾期每件每天酌收 <span className="text-[#283d3e]">5 元</span> 倉儲費。
          </p>
          <p className="text-[12.5px] leading-relaxed font-bold text-[#283d3e]/70">
            日方若發生砍單、缺貨或延期，我們會主動通知並全額退還該品項款項。
          </p>
        </div>

        <div className="mt-6 pt-5 border-t border-[#283d3e]/10">
          <div className="font-[900] text-[13px] text-[#283d3e]">瓦多次元工作室</div>
          <div className="font-bold text-[12px] text-[#283d3e]/55 mt-0.5">統一編號 60071756</div>
          <div className="font-bold text-[11.5px] text-[#283d3e]/40 mt-3">© {new Date().getFullYear()} KAGUYA 日本動漫周邊專業代購</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

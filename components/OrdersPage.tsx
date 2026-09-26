import React from "react";
import { Search, ArrowRight, BookOpen, HelpCircle, Shield, MessageCircle, Users, Instagram, ChevronRight, CheckCircle2 } from "lucide-react";
import { APP_CONFIG } from "../config";
import { logoutLine } from "../services/lineIdentity";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searchNotice?: string;
  boundNick?: string | null;     // 從 LINE 認出來的綁定暱稱（沒有就是還沒登入／沒綁定）
  onGuide: () => void;
  onFaq: () => void;
  onAbout: () => void;
}

// 我的訂單：查單搬過來，下半部接原本藏在 MENU 裡的購物說明與聯絡方式。
// 有 LINE 身分就直接帶出綁定暱稱；沒有就請他打社群暱稱（跟填單頁同一套規則）。
const OrdersPage: React.FC<Props> = ({ searchQuery, setSearchQuery, onSearch, searchNotice, boundNick, onGuide, onFaq, onAbout }) => {
  const row = "flex items-center gap-3 px-5 py-4 border-t-2 border-[#4c59a1]/10 font-[900] text-[#4c59a1] text-[15px] active:bg-[#eef0fa] transition";

  return (
    <div className="flex flex-col items-center w-full animate-fade-in-up pt-20 pb-4">
      <img
        src="https://i.imgur.com/OVkii3R.png"
        alt="KAGUYA 自助查詢訂單系統"
        referrerPolicy="no-referrer"
        className="w-[88%] max-w-xs h-auto object-contain mx-auto mb-5 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.18)]"
      />

      {/* 查單：跟原本同一個搜尋，只是換了地方 */}
      <div className="w-full max-w-md px-4">
        <div className="bg-white rounded-full p-2 flex items-center gap-2 shadow-[6px_6px_0px_#000] border-[3px] border-black transition-transform focus-within:-translate-y-1">
          <div className="relative flex-1 flex items-center pl-1">
            <Search className="absolute left-4 text-[#f8a3f4] w-6 h-6 stroke-[3px]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="請輸入您的社群暱稱"
              className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-base md:text-lg font-[900] text-[#222] placeholder-gray-400"
              onKeyDown={(e) => { if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) onSearch(); }}
            />
          </div>
          <button onClick={onSearch} aria-label="查詢" className="bg-[#f8a3f4] text-white w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 active:scale-90 transition-transform">
            <ArrowRight className="stroke-[3px]" />
          </button>
        </div>
        {searchNotice && <p className="text-[#f8a3f4] text-sm font-[900] mt-3 text-center tracking-widest">{searchNotice}</p>}

        {/* 綁定狀態：客人常常不知道自己綁沒綁，填單填到一半才發現 */}
        {boundNick ? (
          <div className="mt-4 bg-white rounded-2xl px-4 py-3 flex items-center gap-2.5 shadow-[0_4px_0px_rgba(0,0,0,0.15)]">
            <CheckCircle2 className="w-5 h-5 stroke-[3px] text-[#3ac0bf] shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-[900] text-[#4c59a1] text-sm truncate">已綁定：{boundNick}</div>
              <div className="font-bold text-[#4c59a1]/60 text-[12px]">從官賴進來會自動認出你</div>
            </div>
            <button onClick={logoutLine} className="shrink-0 text-[#4c59a1]/55 font-[900] text-xs underline underline-offset-2 active:opacity-60">
              不是我／登出
            </button>
          </div>
        ) : (
          <p className="text-[#3ac0bf] text-xs sm:text-sm font-[900] mt-4 text-center tracking-widest">
            ※若有更改社群暱稱，請務必私訊官賴協助修改！
          </p>
        )}
      </div>

      {/* 購物說明與聯絡方式：原本藏在 MENU 裡，客人幾乎找不到 */}
      <div className="w-full max-w-md px-4 mt-7">
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_4px_0px_rgba(0,0,0,0.15)]">
          <div className="px-5 pt-4 pb-2 font-[900] text-[13px] tracking-widest text-[#4c59a1]/55">購物說明</div>
          <button onClick={onGuide} className={`w-full ${row}`}>
            <BookOpen className="w-5 h-5 stroke-[2.6px] opacity-70" />購物流程
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </button>
          <button onClick={onFaq} className={`w-full ${row}`}>
            <HelpCircle className="w-5 h-5 stroke-[2.6px] opacity-70" />常見問題
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </button>
          <button onClick={onAbout} className={`w-full ${row}`}>
            <Shield className="w-5 h-5 stroke-[2.6px] opacity-70" />關於我們
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </button>

          <div className="px-5 pt-4 pb-2 font-[900] text-[13px] tracking-widest text-[#4c59a1]/55 border-t-2 border-[#4c59a1]/10">聯絡我們</div>
          <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className={row}>
            <MessageCircle className="w-5 h-5 stroke-[2.6px] opacity-70" />LINE 官方帳號
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </a>
          <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className={row}>
            <Users className="w-5 h-5 stroke-[2.6px] opacity-70" />LINE 社群
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </a>
          <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className={row}>
            <Instagram className="w-5 h-5 stroke-[2.6px] opacity-70" />Instagram
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </a>
          <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className={row}>
            <MessageCircle className="w-5 h-5 stroke-[2.6px] opacity-70" />Threads
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-30" />
          </a>
        </div>
      </div>
    </div>
  );
};

export default OrdersPage;

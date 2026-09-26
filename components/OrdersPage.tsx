import React from "react";
import { Search, ArrowRight, BookOpen, HelpCircle, Shield, MessageCircle, Users, Instagram, ChevronRight, UserCheck, Link2, LogIn, Loader2 } from "lucide-react";
import { APP_CONFIG } from "../config";
import { logoutLine } from "../services/lineIdentity";
import { SectionHead } from "./Section";
import { SlimFooter } from "./Footer";

interface Props {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onSearch: () => void;
  searchNotice?: string;
  boundNick?: string | null;
  lineState: "loading" | "ready" | "can-login" | "unavailable";
  lineProfile?: { name?: string; picture?: string };
  quietLoading?: boolean;
  onLogin: () => void;
  onGuide: () => void;
  onFaq: () => void;
  onAbout: () => void;
}

// 我的訂單：訂單是個人資料，所以入口依「認不認得出你」分三種畫面。
//   已認出   → 直接查他自己的單（不用打暱稱）
//   可登入   → 一顆登入鈕（從外面網址進來的人）
//   認不出   → 退回手打暱稱（LIFF 起不來的環境，不能把人鎖在外面）
const OrdersPage: React.FC<Props> = ({ searchQuery, setSearchQuery, onSearch, searchNotice, boundNick, lineState, lineProfile, quietLoading, onLogin, onGuide, onFaq, onAbout }) => {
  const row = "flex items-center gap-3 px-5 py-4 border-t border-[#283d3e]/10 font-[900] text-[#283d3e] text-[15px] active:bg-[#283d3e]/5 transition";

  return (
    <div className="flex flex-col items-center w-full animate-fade-in-up pt-20 pb-4 text-[#283d3e]">
      <div className="w-full max-w-md px-4">
        <SectionHead en="MY ORDERS" title="我的訂單" />

        {/* ① 認出來了：顯示身分，訂單在下面自動列出 */}
        {boundNick ? (
          <div className="bg-white rounded-3xl px-5 py-4">
            <div className="flex items-center gap-3">
              {/* 大頭貼＋LINE 本名：讓他一眼確認「這是我的 LINE 帳號」，
                  再對照下面綁定的社群暱稱對不對 */}
              {lineProfile?.picture
                ? <img src={lineProfile.picture} alt="" referrerPolicy="no-referrer" className="w-11 h-11 rounded-full object-cover shrink-0 bg-[#e9f5f6]" />
                : <div className="w-11 h-11 rounded-full bg-[#e9f5f6] flex items-center justify-center shrink-0"><UserCheck className="w-5 h-5 stroke-[2.6px] text-[#49d5df]" /></div>}
              <div className="min-w-0 flex-1">
                <div className="font-bold text-[11.5px] text-[#283d3e]/50 truncate">
                  LINE：{lineProfile?.name || "已登入"}
                </div>
                <div className="font-[900] text-[16px] truncate leading-tight mt-0.5">{boundNick}</div>
                <div className="font-bold text-[11px] text-[#49d5df] mt-0.5">已綁定的社群暱稱</div>
              </div>
            </div>
            {quietLoading && (
              <div className="mt-3 flex items-center justify-center gap-2 font-[900] text-[12.5px] text-[#283d3e]/45">
                <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />正在載入你的訂單…
              </div>
            )}
            <button
              onClick={() => { if (window.confirm("要換一個 LINE 帳號嗎？\n這會把你從這個網站登出，下次要重新登入。")) logoutLine(); }}
              className="mt-3 w-full h-10 rounded-full border border-[#283d3e]/15 font-[900] text-[12.5px] text-[#283d3e]/60 active:opacity-60 transition"
            >
              不是我？換 LINE 帳號
            </button>
          </div>
        ) : lineState === "loading" ? (
          <div className="bg-white rounded-3xl px-5 py-6 flex items-center justify-center gap-2 font-[900] text-[#283d3e]/50">
            <Loader2 className="w-4 h-4 animate-spin stroke-[3px]" />確認身分中…
          </div>
        ) : lineState === "can-login" ? (
          /* ② 從外面網址進來的：訂單是個人資料，要先認得出你才給看 */
          <div className="bg-white rounded-3xl px-5 py-6 text-center">
            <LogIn className="w-9 h-9 mx-auto text-[#49d5df] stroke-[2px]" />
            <p className="font-[900] text-[16px] mt-3">用 LINE 登入查看你的訂單</p>
            {/* 會看到這張卡的人就是不在 LINE 裡的人 —— 只對他說話，不要解釋別人的情況 */}
            <p className="font-bold text-[13px] text-[#283d3e]/55 mt-2 leading-relaxed">
              訂單裡有你買了什麼、要付多少錢，所以要先確認是你本人。
            </p>
            <p className="font-bold text-[12.5px] text-[#283d3e]/45 mt-1.5 leading-relaxed">
              登入後就不用再打暱稱，下次自動認出你。
            </p>
            <button onClick={onLogin} className="mt-5 w-full h-12 rounded-full bg-[#06C755] text-white font-[900] text-[15px] active:opacity-60 transition">
              用 LINE 登入
            </button>
          </div>
        ) : (
          /* ③ LIFF 起不來的環境：退回手打暱稱，不能把人鎖在外面 */
          <>
            <div className="bg-white rounded-full p-2 flex items-center gap-2">
              <div className="relative flex-1 flex items-center pl-1">
                <Search className="absolute left-4 text-[#e868a0] w-5 h-5 stroke-[3px]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="請輸入您的社群暱稱"
                  className="w-full pl-11 pr-3 py-2.5 bg-transparent outline-none text-[15px] font-[900] placeholder-[#283d3e]/30"
                  onKeyDown={(e) => { if (e.key === "Enter" && !(e.nativeEvent as any).isComposing) onSearch(); }}
                />
              </div>
              <button onClick={onSearch} aria-label="查詢" className="bg-[#e868a0] text-[#283d3e] w-11 h-11 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition-transform">
                <ArrowRight className="stroke-[3px] w-5 h-5" />
              </button>
            </div>
            {searchNotice && <p className="text-[#e868a0] text-sm font-[900] mt-3 text-center tracking-widest">{searchNotice}</p>}
          </>
        )}

        {/* 沒綁定的人（不管從哪進來）都導向官賴綁定——綁定流程留在官賴，網站不另開一套 */}
        {!boundNick && lineState !== "loading" && (
          <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer"
             className="mt-3 w-full h-12 rounded-full bg-white border border-[#283d3e]/15 flex items-center justify-center gap-2 font-[900] text-[14px] active:opacity-60 transition">
            <Link2 className="w-4 h-4 stroke-[2.6px] text-[#49d5df]" />還沒綁定暱稱？去官賴綁定
          </a>
        )}
      </div>

      <div className="w-full max-w-md px-4 mt-7">
        <div className="bg-white rounded-3xl overflow-hidden">
          <div className="px-5 pt-4 pb-2 font-[900] text-[11px] tracking-[0.2em] text-[#283d3e]/40">購物說明</div>
          <button onClick={onGuide} className={`w-full ${row}`}>
            <BookOpen className="w-5 h-5 stroke-[2.6px] opacity-60" />購物流程
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </button>
          <button onClick={onFaq} className={`w-full ${row}`}>
            <HelpCircle className="w-5 h-5 stroke-[2.6px] opacity-60" />常見問題
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </button>
          <button onClick={onAbout} className={`w-full ${row}`}>
            <Shield className="w-5 h-5 stroke-[2.6px] opacity-60" />關於我們
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </button>

          <div className="px-5 pt-4 pb-2 font-[900] text-[11px] tracking-[0.2em] text-[#283d3e]/40 border-t border-[#283d3e]/10">聯絡我們</div>
          <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className={row}>
            <MessageCircle className="w-5 h-5 stroke-[2.6px] opacity-60" />官方 LINE
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </a>
          <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className={row}>
            <Users className="w-5 h-5 stroke-[2.6px] opacity-60" />LINE 社群
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </a>
          <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className={row}>
            <Instagram className="w-5 h-5 stroke-[2.6px] opacity-60" />Instagram
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </a>
          <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className={row}>
            <MessageCircle className="w-5 h-5 stroke-[2.6px] opacity-60" />Threads
            <ChevronRight className="w-5 h-5 stroke-[3px] ml-auto opacity-25" />
          </a>
        </div>
        <SlimFooter />
      </div>
    </div>
  );
};

export default OrdersPage;

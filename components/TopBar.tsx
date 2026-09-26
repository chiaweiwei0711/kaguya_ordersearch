import React from "react";
import { Menu, ChevronLeft, User } from "lucide-react";

interface Props {
  title: string;         // 這一頁在幹嘛（首頁就是品牌名）
  onHome: () => void;    // 回首頁
  onMenu: () => void;
  showBack?: boolean;    // 非首頁：左邊給一顆返回
  onOrders: () => void;  // 我的訂單（七家電商都把它放頂部列，純圖示是通用慣例）
  tone: "light" | "dark";  // 頁面底色淺（黃）用深字、深（藍紫）用白字
}

// 一直都在的頂部列：大字寫著現在在哪一頁，右邊一顆選單。
// 兩顆各自浮動的圓鈕會跟頁面左上的返回鍵疊在一起，收成一條就不會再打架，
// 也順便解決「捲到一半不知道自己在哪一頁」。
const TopBar: React.FC<Props> = ({ title, onHome, onMenu, showBack, tone, onOrders }) => {
  const ICON = `w-10 h-10 shrink-0 flex items-center justify-center active:opacity-50 transition-opacity ${tone === "dark" ? "text-white" : "text-[#4c59a1]"}`;
  return (
    <header
      // 背景透出頁面自己的底色——固定一塊品牌色會跟黃底的頁面打架。
      // 頁面間的一致感來自「同樣的排版＋同樣的黑框按鈕」，不是同一塊顏色。
      className="fixed top-0 inset-x-0 z-[80] h-16 flex items-center px-2.5 backdrop-blur-xl backdrop-saturate-150"
    >
      {/* 三欄：左返回、中標題、右選單。標題置中，左右兩顆一樣大，畫面才不會偏 */}
      <div className="w-20 shrink-0 flex">
        {showBack && (
          <button
            onClick={() => window.history.back()}
            aria-label="返回"
            className={ICON}
          >
            <ChevronLeft className="w-[22px] h-[22px] stroke-[2.2px]" />
          </button>
        )}
      </div>

      <button
        onClick={onHome}
        className={`flex-1 min-w-0 font-[900] text-[22px] leading-none tracking-widest truncate text-center active:scale-95 transition-transform ${tone === "dark" ? "text-white" : "text-[#4c59a1]"}`}
      >
        {title}
      </button>

      <button
        onClick={onOrders}
        aria-label="我的訂單"
        className={ICON}
      >
        <User className="w-[21px] h-[21px] stroke-[2.2px]" />
      </button>

      <button
        onClick={onMenu}
        aria-label="選單"
        className={ICON}
      >
        <Menu className="w-[22px] h-[22px] stroke-[2.2px]" />
      </button>
    </header>
  );
};

export default TopBar;

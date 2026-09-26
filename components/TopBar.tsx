import React from "react";
import { Menu } from "lucide-react";

interface Props {
  title: string;        // 這一頁在幹嘛（首頁就是品牌名）
  onHome: () => void;   // 點標題回首頁
  onMenu: () => void;
}

// 一直都在的頂部列：大字寫著現在在哪一頁，右邊一顆選單。
// 兩顆各自浮動的圓鈕會跟頁面左上的返回鍵疊在一起，收成一條就不會再打架，
// 也順便解決「捲到一半不知道自己在哪一頁」。
const TopBar: React.FC<Props> = ({ title, onHome, onMenu }) => {
  return (
    <header
      // 永遠同一個樣子（品牌紫色塊），只有標題會變——這樣每頁看起來是同一個系統，
      // 又一眼知道自己在哪一頁。底色讓頁面自己去變，頂部這條不跟著換。
      className="fixed top-0 inset-x-0 z-[80] h-16 flex items-center gap-3 px-5 bg-[#4c59a1] rounded-b-[22px] shadow-[0_4px_14px_rgba(20,24,60,0.22)]"
    >
      <button
        onClick={onHome}
        className="font-[900] text-[26px] leading-none tracking-widest truncate text-white active:scale-95 transition-transform"
      >
        {title}
      </button>
      <button
        onClick={onMenu}
        aria-label="選單"
        className="ml-auto shrink-0 w-11 h-11 rounded-full bg-white border-[3px] border-black shadow-[2px_2px_0px_#000] flex items-center justify-center text-[#4c59a1] active:translate-y-0.5 active:shadow-none transition-all"
      >
        <Menu className="w-5 h-5 stroke-[3px]" />
      </button>
    </header>
  );
};

export default TopBar;

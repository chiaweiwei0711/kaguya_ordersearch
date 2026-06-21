import React, { useState } from "react";
import { ChevronLeft, ChevronDown } from "lucide-react";

interface Props {
  onBack: () => void;
}

// 內容草稿：皆取自 app 現有規則，可直接改字／增減
const CATEGORIES: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "訂單與查詢",
    items: [
      { q: "我要怎麼查我的訂單？", a: "首頁輸入你綁定的社群暱稱，就能查到訂單、金額與出貨狀態。" },
      { q: "為什麼查不到我的訂單？", a: "訂單要「結單」後才正式成立；而且記得到貼文留言「已填單」，未留言不會計算訂購。另外，未在官賴綁定社群暱稱也無法受理訂單喔。" },
      { q: "「填單明細查詢」和「訂單查詢」差在哪？", a: "還沒結單時，用「填單明細查詢」看你的填單預覽；結單後填單會變成正式訂單，請改走首頁的「訂單查詢」。" },
    ],
  },
  {
    title: "付款與金額",
    items: [
      { q: "訂金和尾款怎麼算？", a: "下單時先付訂金；尾款會在商品抵台、要用賣貨便寄出時才結算。" },
      { q: "什麼是「二補」？金額為什麼會變動？", a: "各團規則略有差異，實際金額可能需要二補國際運費或境內運費，最終以結單後的訂單查詢為準。" },
      { q: "匯款後要怎麼回報？", a: "走付款流程到最後一步，複製明細 → 貼到官方 LINE 回傳給我們即可。" },
    ],
  },
  {
    title: "出貨（賣貨便）",
    items: [
      { q: "要怎麼用賣貨便下單出貨？", a: "到「可出貨訂單」勾選要寄的訂單 → 按「賣貨便下單」→ 系統會幫你複製清單 → 到賣貨便把它貼在備註欄就完成，不用自己打字。" },
    ],
  },
];

const FaqSection: React.FC<Props> = ({ onBack }) => {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-40 bg-[#3ac0bf] overflow-y-auto">
      {/* 限寬置中 → 桌機也維持窄欄、跟手機一樣好看 */}
      <div className="w-full max-w-xl mx-auto px-5 sm:px-7 py-8">
        <button
          onClick={onBack}
          aria-label="返回"
          className="w-11 h-11 rounded-full bg-white text-[#3ac0bf] flex items-center justify-center shadow-md active:scale-90 transition mb-5"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-[#fff170] font-[900] text-4xl sm:text-5xl tracking-widest">FAQ</h2>
          <p className="text-white font-[900] text-sm tracking-[0.4em] mt-2">常見問題</p>
        </div>

        <div className="space-y-4">
          {CATEGORIES.map((cat, i) => {
            const isOpen = open === i;
            return (
              <div key={i} className="rounded-[28px] overflow-hidden">
                {/* 分類標題：薄荷軟面板（可按、無黑框） */}
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full px-6 py-5 flex items-center justify-between gap-3 text-left bg-[#d6f3ec] hover:bg-[#c8efe5] active:bg-[#c8efe5] transition-colors"
                >
                  <span className="text-[#1a1a1a] font-[900] text-lg tracking-wide">{cat.title}</span>
                  <ChevronDown className={`w-6 h-6 shrink-0 text-[#1a1a1a] stroke-[3px] transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>

                {/* 答案區：由上往下平順展開（grid-rows 0fr→1fr，無斷裂感） */}
                <div
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
                >
                  <div className="overflow-hidden">
                    <div className="bg-white px-6 py-6 space-y-5">
                      {cat.items.map((it, j) => (
                        <div key={j}>
                          <div className="text-[#3ac0bf] font-[900] text-base mb-1.5 leading-snug">Q{j + 1}. {it.q}</div>
                          <div className="text-[#4c59a1] font-bold text-sm leading-relaxed">{it.a}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-white/90 font-bold text-xs mt-8 leading-relaxed">
          還有其他問題嗎？歡迎私訊官方 LINE，我們會儘速協助你！
        </p>
      </div>
    </div>
  );
};

export default FaqSection;

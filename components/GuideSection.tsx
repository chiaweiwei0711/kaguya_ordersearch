import React from "react";
import { ChevronLeft, ArrowRight } from "lucide-react";

interface Props {
  onBack: () => void;
  onFaq: () => void;
}

// 購物流程五步驟（規則正本在 FAQ；這頁只講「你要做什麼」）。瓦多 2026-09-19 定。
const STEPS: { title: string; desc: string; tags: string[]; warn?: string }[] = [
  { title: "綁定暱稱（只要做一次）", desc: "官賴圖文選單點「綁定暱稱」→ 輸入你在社群的完整暱稱 → 出現 ✅ 綁定成功。", tags: ["官賴"], warn: "沒綁定收不到通知" },
  { title: "填單 → 留言「已填單」", desc: "開團貼文點「填單網址」→ 勾商品、填暱稱送出 → 回貼文留言「已填單」。", tags: ["填單網址", "社群記事本", "結單時間前"], warn: "沒留言不算" },
  { title: "收到訂購付款通知後，前往付款", desc: "結單後官賴會推播通知。點官賴「訂單付款」，照「應付訂金」金額匯款（已扣 100 元尾款），匯完回報。", tags: ["官賴", "查詢系統", "通知後 3 天內"] },
  { title: "等待商品抵台", desc: "依貼文寫的發貨時間等待，商品抵台官賴會推播到貨通知。", tags: ["官賴"] },
  { title: "賣貨便下單", desc: "查詢系統點「可出貨訂單」→「全選」看尾款總額 → 按「賣貨便下單」→ 跳到賣貨便登入、選門市 → 下單金額＝查到的總尾款＋運費 38 元。", tags: ["查詢系統", "賣貨便", "抵台後 30 天內"], warn: "可跟其他團併單" },
];

const GuideSection: React.FC<Props> = ({ onBack, onFaq }) => {
  return (
    <div className="fixed inset-0 z-40 bg-[#f8a3f4] overflow-y-auto">
      <div className="w-full max-w-xl mx-auto px-5 sm:px-7 py-8">
        <button
          onClick={onBack}
          aria-label="返回"
          className="w-11 h-11 rounded-full bg-white text-[#f8a3f4] flex items-center justify-center shadow-md active:scale-90 transition mb-5"
        >
          <ChevronLeft className="w-6 h-6 stroke-[3px]" />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-[#4c59a1] font-[900] text-4xl sm:text-5xl tracking-widest pl-[0.1em]">購物流程</h2>
          <p className="text-[#4c59a1] font-[900] text-sm tracking-[0.4em] pl-[0.4em] mt-2">五步驟一次懂</p>
        </div>

        <ol className="space-y-4">
          {STEPS.map((st, i) => (
            <li key={i} className="bg-white rounded-[24px] p-5 flex gap-4">
              <span className="w-12 h-12 shrink-0 rounded-full bg-[#f8a3f4] text-white font-[900] text-2xl flex items-center justify-center">{i + 1}</span>
              <div className="min-w-0">
                <div className="text-[#1a1a1a] font-[900] text-lg leading-snug">{st.title}</div>
                <div className="text-[#4c59a1] font-bold text-sm leading-relaxed mt-1">{st.desc}</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {st.tags.map((t) => (
                    <span key={t} className="text-[11px] font-[900] rounded-full px-2.5 py-1 bg-[#d6f3ec] text-[#1f9ead]">{t}</span>
                  ))}
                  {st.warn && <span className="text-[11px] font-[900] rounded-full px-2.5 py-1 bg-[#fde7ef] text-[#c4265e]">{st.warn}</span>}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <button
          onClick={onFaq}
          className="mt-8 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-white text-[#3ac0bf] font-[900] active:scale-95 transition"
        >
          完整規則與常見問題
          <ArrowRight className="w-5 h-5 stroke-[3px]" />
        </button>
        <p className="text-center text-white/90 font-bold text-xs mt-5 leading-relaxed">有問題直接私訊官賴，我們會儘速協助你！</p>
      </div>
    </div>
  );
};

export default GuideSection;

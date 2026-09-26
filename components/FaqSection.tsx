import React, { useState } from "react";
import { SlimFooter } from "./Footer";
import { SectionHead } from "./Section";
import { ChevronLeft, ChevronDown, ArrowRight } from "lucide-react";

interface Props {
  onBack: () => void;
  onGuide: () => void;
}

// 規則正本＝這裡（LINE 記事本只放精簡版＋連結）。瓦多 2026-09-19 逐條定稿。
const CATEGORIES: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "綁定與暱稱",
    items: [
      { q: "為什麼一定要綁定暱稱？", a: "綁定後付款提醒、到貨通知會一對一推播到你的 LINE，不會被社群訊息洗掉。未綁定無法受理訂單。" },
      { q: "怎麼綁定？", a: "官賴圖文選單點「綁定暱稱」→ 輸入你在社群的完整暱稱 → 出現「✅ 綁定成功」就好。" },
      { q: "暱稱怎麼取比較好？", a: "有辨識度、自己打得出來、不要太短。單一個字（哈）、單一字母（s）或純表情符號會查到別人的訂單或查不到自己的。例：蘑菇大王／米津律師／wendy1226／アクタ／채원이💙 都可以。" },
      { q: "我改了社群暱稱怎麼辦？", a: "私訊官賴告知「原暱稱＋新暱稱」，我們統一改；沒告知的話訂單會留在舊暱稱下。" },
    ],
  },
  {
    title: "填單與結單",
    items: [
      { q: "怎麼跟團？", a: "開團貼文點「填單網址」→ 勾要買的商品和數量 → 填暱稱送出 → 回到貼文留言「已填單」。" },
      { q: "為什麼填單了還要留言「已填單」？", a: "留言是為了確認您有在群內、之後聯絡的到且喊單是出自於您的個人意願唷！" },
      { q: "填單後可以改或取消嗎？", a: "若需要加單，可以直接重複填單加單，若需要取消或修改請私訊官賴確認，結單後不可取消或修改！" },
      { q: "結單時間是什麼？", a: "停止填單的時間。結單後會發送訂購付款通知，收到通知＝訂購成立，訂單才正式成立。" },
      { q: "為什麼查不到我的訂單？", a: "訂單要結單後才成立。請確認：有留言「已填單」、有綁定暱稱、暱稱沒打錯。結單前用「填單明細查詢」看自己填了什麼。" },
      { q: "「填單明細查詢」和「訂單查詢」差在哪？", a: "結單前看「填單明細查詢」（填單預覽）；結單後填單變成正式訂單，走首頁「訂單查詢」。" },
    ],
  },
  {
    title: "付款",
    items: [
      { q: "要匯多少？", a: "查詢系統顯示的「應付訂金」就是要匯的金額，已扣除每團預留 100 元尾款、無卡存款也已取整。請照匯，不要自己算。" },
      { q: "什麼時候要匯？", a: "收到訂購付款通知後三天內。提醒達三次仍未處理，視為跑單並釋出名額。" },
      { q: "可以用無卡存款嗎？", a: "可以，填單時備註「無卡」，只收中信、國泰。匯完把明細拍照回傳。" },
      { q: "匯款後怎麼回報？", a: "官賴「訂單付款」走到最後一步，複製明細貼回官賴給我們即可。" },
      { q: "什麼是「二補」？", a: "少數團需要補國際運費或日本境內運費，每一團的二補規則開團時就寫在填單頁最上面。二補金額會加在尾款，到貨時一起付。" },
      { q: "多匯了怎麼辦？", a: "多匯款項於下次訂單折抵；要退回的話匯費 15 元由買方負擔。" },
    ],
  },
  {
    title: "到貨與出貨",
    items: [
      { q: "商品多久會到？", a: "看開團貼文寫的發貨時間。預購商品可能延遲，無法耐心等待請勿跟團。" },
      { q: "被砍單怎麼辦？", a: "廠商砍單我們會全額退款，會私訊你要退款帳號。" },
      { q: "怎麼知道到貨了？", a: "商品抵台官賴會推播到貨通知，查詢系統也看得到，並開始 30 天免費保管倒數。" },
      { q: "30 天倒數是什麼？逾期會怎樣？", a: "每團商品各自從抵台日算 30 天免費保管，這段時間可以等其他團到貨一起併單（以最早到那團的 30 天為限）。第 31 天起每天收倉儲費 5 元，直接加在尾款裡；收費滿 90 天（抵台後 120 天）仍未下單且未聯繫，視為放棄該商品，已付款項不退。" },
      { q: "賣貨便怎麼下單？要付多少？", a: "查詢系統點「可出貨訂單」→「全選」看尾款總額 → 按「賣貨便下單」→ 跳轉到賣貨便 → 登入 → 選門市 → 下單金額＝查到的總尾款（每團尾款 100 元，二補、倉儲費都含在內），賣貨便運費 38 元另計。" },
      { q: "可以併單嗎？", a: "能。每團各自算 30 天，在最早到那團的 30 天內「全選」一起下單就好，不用事先告知。現貨賣場也能併，姓名、電話、門市要一致，下單後私訊官賴告知。併單要從不同批貨湊，備貨較慢；想最快拿到就單團出。" },
      { q: "多久出貨？", a: "集中在假日出貨，賣貨便下單後 6 個工作天內出貨。超過請私訊詢問，並先檢查有沒有少下尾款、填錯暱稱。" },
      { q: "商品有小瑕疵？", a: "輕微廠瑕（細小刮痕、印刷微偏、包裝壓痕）屬正常現象，不作為退換理由。錯件、缺件請於收到 3 天內私訊官賴。" },
    ],
  },
  {
    title: "其他",
    items: [
      { q: "未成年可以跟團嗎？", a: "請先取得家長同意再填單。" },
      { q: "拆團代寄？", a: "需代寄及收款者每人酌收 10 元包材費；一般訂單不收包材費。" },
      { q: "可以在社群賣東西／換物嗎？", a: "請勿販售或交換非本賣場購買的商品。若有個資疑慮，交易後可私訊官賴交換聯絡方式。" },
      { q: "想要的商品沒人開團？", a: "私訊官賴許願，評估後有機會開團。" },
    ],
  },
];

const FaqSection: React.FC<Props> = ({ onBack, onGuide }) => {
  const [open, setOpen] = useState<number>(0);

  return (
    <div className="fixed inset-0 z-40 bg-[#f6f9f9] overflow-y-auto">
      {/* 限寬置中 → 桌機也維持窄欄、跟手機一樣好看 */}
      <div className="w-full max-w-xl mx-auto px-5 sm:px-7 pt-20 pb-8">
        <div className="mb-7"><SectionHead en="FAQ" title="常見問題" /></div>

        <button onClick={onGuide} className="w-full mb-6 flex items-center justify-between gap-3 px-6 py-4 rounded-[24px] bg-white text-[#1a1a1a] font-[900] active:scale-[0.99] transition text-left">
          <span>第一次跟團？先看購物流程</span>
          <ArrowRight className="w-5 h-5 shrink-0 stroke-[3px] text-[#e868a0]" />
        </button>

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
                          <div className="text-[#49d5df] font-[900] text-base mb-1.5 leading-snug">Q{j + 1}. {it.q}</div>
                          <div className="text-[#283d3e] font-bold text-sm leading-relaxed">{it.a}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-[#283d3e]/65 font-bold text-xs mt-8 leading-relaxed">
          還有其他問題嗎？歡迎私訊官方 LINE，我們會儘速協助你！
        </p>
        <SlimFooter />
      </div>
    </div>
  );
};

export default FaqSection;

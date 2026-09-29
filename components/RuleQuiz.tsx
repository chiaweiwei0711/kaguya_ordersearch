import React, { useMemo, useState } from "react";
import { ArrowRight, Check, X, RotateCcw, ChevronDown } from "lucide-react";
import { QUIZ_BANK, QUIZ_PICK, QuizItem } from "../services/guideContent";

// 規則小測驗 —— 流程頁和 FAQ 頁底部的彩蛋。
// 刻意不擋任何東西：不是加入前的門檻，答錯也沒有任何後果，就是給願意的人自己對一下。
// 預設收合，不佔版面；點開才抽題。

// 合格線：10 題錯 2 題以內。蓋章式的合格／不合格比單純報分數好笑，瓦多要的。
const PASS_MARK = 8;
const verdict = (right: number, total: number) => {
  const ok = right >= Math.min(PASS_MARK, total);
  if (right === total) return { ok, stamp: "滿分", line: "比我還熟，下次開團你來。" };
  if (ok) return { ok, stamp: "合格", line: "錯的那幾題上面都寫了為什麼，回頭看一眼就好。" };
  if (right >= total / 2) return { ok, stamp: "不合格", line: "差一點。麻煩回去把流程再看一次。" };
  return { ok, stamp: "不合格", line: "這次是真的沒看喔。" };
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const RuleQuiz: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [round, setRound] = useState(0);      // 每次重考重抽題，背答案沒用
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);

  // 題庫裡標了 required 的是必考題（妹妹挑的，都是最常做錯那幾步），一定要抽到
  const quiz: QuizItem[] = useMemo(() => {
    const must = QUIZ_BANK.filter((q) => q.required);
    const rest = shuffle(QUIZ_BANK.filter((q) => !q.required));
    return shuffle([...must, ...rest.slice(0, Math.max(QUIZ_PICK - must.length, 0))]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const done = idx >= quiz.length;
  const right = quiz.length - wrong;
  const cur = quiz[idx];

  const restart = () => { setRound((r) => r + 1); setIdx(0); setPicked(null); setWrong(0); };

  const choose = (i: number) => {
    if (picked !== null) return;              // 一題只答一次，不能一直點到對
    setPicked(i);
    if (i !== cur.answer) setWrong((w) => w + 1);
  };

  if (!open) {
    return (
      <button
        onClick={() => { restart(); setOpen(true); }}
        className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-white text-[#283d3e]/70 font-[900] text-sm active:scale-95 transition"
      >
        都看完了？來考 {QUIZ_PICK} 題
        <ChevronDown className="w-4 h-4 stroke-[3px]" />
      </button>
    );
  }

  return (
    <div className="mt-4 bg-white rounded-[24px] p-6">
      {!done ? (
        <>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[#49d5df] font-[900] text-xs tracking-[0.18em]">
              {String(idx + 1).padStart(2, "0")} / {String(quiz.length).padStart(2, "0")}
            </span>
            {wrong > 0 && <span className="text-[#c4265e] font-[900] text-xs">答錯 {wrong}</span>}
          </div>
          <div className="h-2 rounded-full bg-[#e9f5f6] overflow-hidden mb-4">
            <div className="h-full bg-[#49d5df] rounded-full transition-all" style={{ width: `${(idx / quiz.length) * 100}%` }} />
          </div>

          <h3 className="text-[#283d3e] font-[900] text-lg leading-snug mb-4">{cur.q}</h3>

          <div className="space-y-2.5">
            {cur.options.map((opt, i) => {
              const isAnswer = i === cur.answer;
              const isPicked = picked === i;
              // 答完才上色：正解一定標出來，選錯的那個也標，才知道自己錯在哪
              const tone =
                picked === null ? "bg-[#f6f9f9] text-[#283d3e] active:scale-[0.98]"
                : isAnswer ? "bg-[#d9f5e6] text-[#12744c]"
                : isPicked ? "bg-[#fbe3ef] text-[#c4265e]"
                : "bg-[#f6f9f9] text-[#283d3e]/45";
              return (
                <button
                  key={i}
                  onClick={() => choose(i)}
                  disabled={picked !== null}
                  className={`w-full text-left rounded-[18px] px-4 py-3.5 font-[900] text-sm leading-snug transition flex items-start gap-2.5 ${tone}`}
                >
                  <span className="shrink-0 mt-0.5 w-4">
                    {picked !== null && isAnswer && <Check className="w-4 h-4 stroke-[3.5px]" />}
                    {picked !== null && isPicked && !isAnswer && <X className="w-4 h-4 stroke-[3.5px]" />}
                  </span>
                  <span>{opt}</span>
                </button>
              );
            })}
          </div>

          {picked !== null && (
            <>
              <p className="mt-4 rounded-[16px] bg-[#e9f5f6] text-[#1f7f8a] font-bold text-[13px] leading-relaxed px-4 py-3">{cur.why}</p>
              <button
                onClick={() => { setPicked(null); setIdx((n) => n + 1); }}
                className="mt-4 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#283d3e] text-white font-[900] active:scale-95 transition"
              >
                {idx + 1 === quiz.length ? "看結果" : "下一題"}
                <ArrowRight className="w-5 h-5 stroke-[3px]" />
              </button>
            </>
          )}
        </>
      ) : (
        <div className="text-center">
          {(() => {
            const v = verdict(right, quiz.length);
            return (
              <>
                <div
                  className={`inline-block -rotate-[7deg] rounded-[14px] border-[3px] px-6 py-1.5 font-[900] text-3xl tracking-[0.1em] ${
                    v.ok ? "border-[#12744c] text-[#12744c]" : "border-[#c4265e] text-[#c4265e]"
                  }`}
                >
                  {v.stamp}
                </div>
                <div className="text-[#283d3e] font-[900] text-4xl tracking-tighter mt-4">
                  {right}<span className="text-xl text-[#283d3e]/40"> / {quiz.length}</span>
                </div>
                <p className="text-[#283d3e]/75 font-bold text-sm leading-relaxed mt-2">{v.line}</p>
              </>
            );
          })()}
          <button
            onClick={restart}
            className="mt-5 w-full flex items-center justify-center gap-2 py-4 rounded-full bg-[#e868a0] text-white font-[900] active:scale-95 transition"
          >
            <RotateCcw className="w-5 h-5 stroke-[3px]" />
            換一批再考
          </button>
        </div>
      )}
    </div>
  );
};

export default RuleQuiz;

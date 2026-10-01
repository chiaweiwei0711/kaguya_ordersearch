import React, { useEffect, useState } from "react";
import { ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { subscribePair, reopenPairing, cancelPairing, dismissPairNotice, PairState } from "../services/lineIdentity";

// 配對登入的提示條（2026-10-02）。主畫面 web app 收不到 LINE 登入的回程，改成開瀏覽器登入、web app 自己等卡：
//   waiting ＝ web app 這端：告訴客人「去瀏覽器登入，登好回來就好」
//   handed  ＝ 瀏覽器那端：登好了，請他回 web app
//   failed  ＝ 瀏覽器那端：沒登成，請他回 web app 再按一次
const LoginPairBanner: React.FC = () => {
  const [s, setS] = useState<PairState>(null);
  useEffect(() => subscribePair(setS), []);
  if (!s) return null;

  const btn = "h-10 px-4 rounded-full font-[900] text-[14px] active:opacity-60 transition";
  return (
    <div className="fixed left-0 right-0 bottom-0 z-[60] px-4 pb-[max(16px,env(safe-area-inset-bottom))] animate-fade-in-up">
      <div className="max-w-md mx-auto bg-white rounded-3xl px-5 py-4 shadow-[0_-6px_24px_rgba(0,0,0,0.12)] text-[#283d3e]">
        {s === "waiting" && (
          <>
            <div className="flex items-center gap-2 font-[900] text-[16px]">
              <Loader2 className="w-5 h-5 animate-spin stroke-[2.6px] text-[#06C755] shrink-0" />
              到瀏覽器登入 LINE
            </div>
            <p className="font-bold text-[14px] text-[#283d3e]/60 mt-1.5 leading-relaxed">
              登入好之後回到這裡，會自動完成登入，不用再按一次。
            </p>
            <div className="mt-3 flex gap-2">
              <button onClick={reopenPairing} className={`${btn} flex-1 bg-[#06C755] text-white flex items-center justify-center gap-1.5`}>
                <ExternalLink className="w-4 h-4 stroke-[2.6px]" />重新開啟登入頁
              </button>
              <button onClick={cancelPairing} className={`${btn} bg-[#e9f5f6]`}>取消</button>
            </div>
          </>
        )}
        {s === "handed" && (
          <>
            <div className="flex items-center gap-2 font-[900] text-[16px]">
              <CheckCircle2 className="w-5 h-5 stroke-[2.6px] text-[#06C755] shrink-0" />
              登入完成
            </div>
            <p className="font-bold text-[14px] text-[#283d3e]/60 mt-1.5 leading-relaxed">
              回到主畫面的 KAGUYA，就會自動登入。這個瀏覽器分頁可以關掉了。
            </p>
            <button onClick={dismissPairNotice} className={`${btn} mt-3 w-full bg-[#e9f5f6]`}>知道了</button>
          </>
        )}
        {s === "failed" && (
          <>
            <div className="flex items-center gap-2 font-[900] text-[16px]">
              <AlertCircle className="w-5 h-5 stroke-[2.6px] text-[#e46b58] shrink-0" />
              登入沒有完成
            </div>
            <p className="font-bold text-[14px] text-[#283d3e]/60 mt-1.5 leading-relaxed">
              請回到主畫面的 KAGUYA，再按一次「用 LINE 登入」。
            </p>
            <button onClick={dismissPairNotice} className={`${btn} mt-3 w-full bg-[#e9f5f6]`}>知道了</button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPairBanner;

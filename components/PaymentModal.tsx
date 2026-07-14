import React, { useState, useEffect } from 'react';
import { X, Sparkles, CheckCircle, Truck, ArrowRight, Copy, MessageCircle, CreditCard, Building, ChevronLeft } from 'lucide-react';
import { Order } from '../types';
import { APP_CONFIG } from '../config';

const transferBanks = [
  { name: '中信', code: '822', account: '0000783540394603' },
  { name: '國泰', code: '013', account: '109500025206' },
  { name: '台新', code: '812', account: '28881021603333' },
  { name: '連線商業銀行', code: '824', account: '111013749294' }
];

const cardlessBanks = [
  { name: '中信', code: '822', account: '0000901567316912' },
  { name: '國泰', code: '013', account: '109500025206' }
];

interface PaymentModalProps {
  orders: Order[];
  totalAmount: number;
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'shipping';
}

const PaymentModal: React.FC<PaymentModalProps> = ({ orders, totalAmount, isOpen, onClose, type }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCopied, setIsCopied] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cardless'>('transfer');
  const [selectedBankIdx, setSelectedBankIdx] = useState(0);
  const [last5Digits, setLast5Digits] = useState('');
  const [detailCopied, setDetailCopied] = useState(false);

  const isShipping = type === 'shipping';
  const targetUrl = isShipping ? APP_CONFIG.MAIHUOBIAN_URL : APP_CONFIG.LINE_URL;

  useEffect(() => {
    if (isOpen) {
      setStep(1); setIsCopied(false); setDetailCopied(false); setLast5Digits(''); setSelectedBankIdx(0); setPaymentMethod('transfer');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const generateDetailMessage = () => {
    if (isShipping) return orders.map((o, index) => `【${index + 1}】${o.items[0].name} x${o.totalQuantity}`).join(' /');

    const totalDeposit = orders.reduce((sum, o) => sum + o.depositAmount, 0);
    const groupNamesList = orders.map(o => o.groupName).join('\n');
    const targetBankName = paymentMethod === 'transfer' ? transferBanks[selectedBankIdx].name : `${cardlessBanks[selectedBankIdx].name} (無卡存款)`;
    const last5Str = paymentMethod === 'transfer' ? (last5Digits || '【 請輸入後回傳 】') : '【 無卡存款無須填寫 】';
    const cardlessNote = paymentMethod === 'cardless' ? '\n*（無卡請拍明細回傳）*' : '';

    return `Kaguya訂購付款確認\n--------------------\n♦️社群暱稱：${orders[0].customerPhone || '未知'}\n♦️訂購商品系列：\n${groupNamesList}\n♦️付款金額：$${totalDeposit.toLocaleString()}\n♦️您匯款到哪間銀行：${targetBankName}\n♦️您的匯款帳號末五碼：${last5Str}${cardlessNote}\n---------------------\n已確認訂購商品與付款金額無誤！`;
  };

  // 🎯 解決 LINE 瀏覽器阻擋彈出視窗的完美跳轉邏輯
  const handleNext = () => {
    // 把複製成功後的跳轉動作包裝起來
    const executeJump = () => {
      setIsCopied(true);
      setTimeout(() => {
        if (targetUrl) {
          // 💡 魔法在這裡：放棄 window.open('_blank')
          // 改用 window.location.href 直接跳轉，LINE 絕對不會擋！
          window.location.href = targetUrl;
        }
        setIsCopied(false);
        onClose();
      }, 1300); // 等待約 1.3 秒，讓「已複製」被看到又不拖太久
    };

    if (isShipping) {
      // 賣貨便出貨
      navigator.clipboard.writeText(generateDetailMessage())
        .then(executeJump)
        .catch(() => executeJump()); // 防呆：萬一客人的手機不給複製，還是要讓他能跳轉
    } else {
      // 付訂金流程
      if (step < 3) {
        setStep((s) => (s + 1) as 1 | 2 | 3);
      } else {
        // 訂金付款回報 → 後台「待對帳進帳」分頁（fire-and-forget，就算客人沒貼回 LINE 我們也有資料）
        const totalDeposit = orders.reduce((sum, o) => sum + o.depositAmount, 0);
        fetch(APP_CONFIG.API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            type: 'depositReport',
            nick: orders[0]?.customerPhone || '',
            pay: paymentMethod === 'transfer' ? '匯款' : '無卡',
            items: orders.map(o => o.groupName).join('、'),
            amount: String(totalDeposit),
            bank: paymentMethod === 'transfer' ? transferBanks[selectedBankIdx].name : cardlessBanks[selectedBankIdx].name,
            account: paymentMethod === 'transfer' ? transferBanks[selectedBankIdx].account : cardlessBanks[selectedBankIdx].account,
            last5: paymentMethod === 'transfer' ? last5Digits : '',
          }),
        }).catch(() => {});
        navigator.clipboard.writeText(generateDetailMessage())
          .then(executeJump)
          .catch(() => executeJump());
      }
    }
  };

  // 把「待會要貼上的明細」做成看得到、可點整張複製的卡片
  const copyDetail = () => {
    navigator.clipboard.writeText(generateDetailMessage()).catch(() => {});
    setDetailCopied(true);
    if ((navigator as any).vibrate) (navigator as any).vibrate(12);
  };

  const renderDetailCard = () => {
    const inner = (
      <>
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="text-xs font-[900] tracking-widest text-[#4c59a1]">
            {isShipping ? '欲出貨的商品清單' : '回傳明細預覽'}
          </span>
          {/* 複製指示只在賣貨便流程出現（付訂金靠下方大按鈕自動送出，框只給看） */}
          {isShipping && (
            <span className={`flex items-center gap-1 text-xs font-[900] shrink-0 ${detailCopied ? 'text-[#3ac0bf]' : 'text-[#f8a3f4]'}`}>
              {detailCopied ? <CheckCircle size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
              {detailCopied ? '已複製' : '複製'}
            </span>
          )}
        </div>
        <div className="text-[13px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words font-mono">
          {generateDetailMessage()}
        </div>
        <div className={`mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-[900] rounded-2xl py-2.5 transition-colors ${detailCopied ? 'bg-[#3ac0bf]/15 text-[#3ac0bf]' : 'bg-[#f8a3f4]/15 text-[#4c59a1]'}`}>
          {detailCopied && isShipping && <CheckCircle size={14} strokeWidth={2.5} />}
          {isShipping ? '貼到賣貨便「備註欄第二格」就好，不用自己打字' : '按下方「複製明細並回傳」會自動送出，並跳到官方 LINE 貼上就完成'}
        </div>
      </>
    );
    // 賣貨便：整張框可點複製（真功能）；付訂金：純預覽（不可點，靠下方大按鈕）
    return isShipping ? (
      <button type="button" onClick={copyDetail} className={`w-full text-left rounded-[24px] p-5 border-2 transition-all active:scale-[0.99] ${detailCopied ? 'border-[#3ac0bf] bg-[#3ac0bf]/[0.08]' : 'border-dashed border-[#f8a3f4] bg-[#f8a3f4]/[0.08]'}`}>
        {inner}
      </button>
    ) : (
      <div className="w-full text-left rounded-[24px] p-5 border-2 border-dashed border-[#f8a3f4] bg-[#f8a3f4]/[0.08]">
        {inner}
      </div>
    );
  };

  const currentStepTitle = isShipping ? '確認出貨明細' : (step === 1 ? '確認商品與金額' : step === 2 ? '選擇付款方式與帳號' : '回報付款資訊');

  return (
    <div className="fixed inset-0 bg-[#4c59a1]/40 backdrop-blur-sm z-[100] flex flex-col items-center justify-center animate-fade-in p-4 md:p-8">

      {/* 🎯 模態框主體：白底、無黑框、柔和陰影 */}
      <div className="w-full max-w-md bg-white border-[2.5px] border-black rounded-[32px] sm:rounded-[40px] shadow-[6px_6px_0px_#000] overflow-hidden flex flex-col max-h-[90vh]">

        {/* 🎯 Header (色塊分隔) */}
        <div className="p-6 flex items-center justify-between relative shrink-0">
          <button onClick={() => { if (step > 1 && !isShipping) setStep((s) => (s - 1) as 1 | 2 | 3); else onClose(); }} className="relative z-10 w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 active:scale-95 transition-all">
            {step > 1 && !isShipping ? <ChevronLeft strokeWidth={2.5} size={20} /> : <X strokeWidth={2.5} size={20} />}
          </button>

          <div className="text-center absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <h3 className="font-[900] text-lg text-black tracking-widest">
              {currentStepTitle}
            </h3>
            {/* 柔和進度條 */}
            {!isShipping && (
              <div className="flex gap-1.5 mt-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`h-[4px] rounded-full transition-all duration-300 ${step === s ? 'w-6 bg-[#3ac0bf]' : 'w-4 bg-gray-200'}`} />
                ))}
              </div>
            )}
          </div>
          <div className="w-10"></div>
        </div>

        {/* 🎯 滾動內容區 (✨已換成專屬粉紫滾輪) */}
        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3ac0bf] [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* --- 步驟 1 --- */}
          {(step === 1 || isShipping) && (
            <>
              {isShipping && renderDetailCard()}
              <div>
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
                  <span className="text-gray-400 font-[900] text-xs tracking-widest uppercase">訂單項目清單</span>
                  <span className="bg-[#4c59a1] text-white text-[10px] px-3 py-1 rounded-full font-[900] tracking-widest">{orders.length} 筆</span>
                </div>
                <div className="space-y-3">
                  {orders.map((order, index) => (
                    // 🎯 色塊膠囊
                    <div key={index} className="flex justify-between items-center bg-white p-3.5 rounded-xl shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
                      <span className="text-black font-[900] text-sm truncate pl-1">{order.groupName}</span>
                      <span className="font-[900] text-base text-[#4c59a1] pr-1">
                        ${(isShipping ? order.balanceDue : order.depositAmount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white shadow-[0_4px_0px_rgba(0,0,0,0.10)] rounded-[24px] p-8 text-center">
                <span className="text-[#3ac0bf] font-[900] text-sm tracking-widest uppercase block mb-2">應付總額</span>
                <span className="text-5xl font-[900] text-[#4c59a1] tracking-tighter">
                  ${totalAmount.toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* --- 步驟 2 --- */}
          {step === 2 && !isShipping && (
            <div className="space-y-6">
              <div className="flex gap-3 bg-gray-100 rounded-full p-1.5">
                <button onClick={() => setPaymentMethod('transfer')} className={`flex-1 py-3 text-sm font-[900] rounded-full transition-all flex justify-center items-center gap-2 ${paymentMethod === 'transfer' ? 'bg-white text-[#3ac0bf] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <Building size={18} strokeWidth={2.5} /> 匯款
                </button>
                <button onClick={() => setPaymentMethod('cardless')} className={`flex-1 py-3 text-sm font-[900] rounded-full transition-all flex justify-center items-center gap-2 ${paymentMethod === 'cardless' ? 'bg-white text-[#3ac0bf] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                  <CreditCard size={18} strokeWidth={2.5} /> 無卡存款
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-xs text-gray-400 font-[900] tracking-widest block mb-2">選擇匯入銀行</label>
                  <div className="relative">
                    <select value={selectedBankIdx} onChange={(e) => setSelectedBankIdx(Number(e.target.value))} className="w-full bg-white rounded-xl p-4 text-sm text-black font-[900] outline-none appearance-none cursor-pointer shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
                      {(paymentMethod === 'transfer' ? transferBanks : cardlessBanks).map((bank, idx) => (
                        <option key={idx} value={idx}>{bank.name} ({bank.code})</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-[900] text-xs">▼</div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-[900] tracking-widest block mb-2">對應匯款帳號</label>
                  <div className="bg-white rounded-xl p-5 flex flex-col gap-4 shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
                    <div className="text-xl font-[900] text-[#4c59a1] tracking-[0.1em] text-center">
                      {paymentMethod === 'transfer' ? transferBanks[selectedBankIdx].account : cardlessBanks[selectedBankIdx].account}
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(paymentMethod === 'transfer' ? transferBanks[selectedBankIdx].account : cardlessBanks[selectedBankIdx].account)} className="w-full py-3 bg-gray-100 text-gray-600 font-[900] rounded-full border-[2.5px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all flex items-center justify-center gap-2">
                      <Copy strokeWidth={2.5} size={16} /> 複製帳號
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- 步驟 3 --- */}
          {step === 3 && !isShipping && (
            <div className="space-y-6 pt-4">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-[#3ac0bf]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-[#3ac0bf] w-8 h-8 stroke-[2.5px]" />
                </div>
                <h4 className="text-xl font-[900] text-black tracking-widest">回傳付款資訊</h4>
                <p className="text-gray-400 font-[900] text-xs">一鍵複製明細，貼上官方 LINE 回傳就完成囉！</p>
              </div>

              <div>
                {paymentMethod === 'transfer' ? (
                  <div className="space-y-4">
                    <label className="text-xs text-gray-400 font-[900] tracking-widest block text-center">您的匯款帳號【末五碼】</label>
                    <input type="text" inputMode="numeric" maxLength={5} placeholder="例: 12345" value={last5Digits} onChange={(e) => { setLast5Digits(e.target.value.replace(/\D/g, '')); setDetailCopied(false); }} className="w-full bg-white rounded-xl p-4 text-2xl text-[#4c59a1] font-[900] outline-none tracking-[0.5em] text-center placeholder-gray-200 shadow-[0_4px_0px_rgba(0,0,0,0.10)]" />
                  </div>
                ) : (
                  <div className="p-6 bg-white rounded-xl text-center space-y-3 shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
                    <Sparkles className="w-8 h-8 text-[#f8a3f4] mx-auto" />
                    <p className="text-xs font-[900] text-gray-500 tracking-widest leading-loose">
                      您選擇的是【無卡存款】<br />請拍下存款明細，並點選下方按鈕回傳！
                    </p>
                  </div>
                )}
              </div>

              {renderDetailCard()}
            </div>
          )}
        </div>

        {/* 🎯 Footer 按鈕區 (滿版大色塊無邊框) */}
        <div className="p-6 shrink-0 bg-white">
          <button
            onClick={handleNext}
            disabled={!isShipping && step === 3 && paymentMethod === 'transfer' && last5Digits.length < 5}
            className={`w-full py-4 rounded-full font-[900] text-lg tracking-widest transition-all flex items-center justify-center gap-2
              ${(!isShipping && step === 3 && paymentMethod === 'transfer' && last5Digits.length < 5)
                ? 'opacity-50 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#0090a7] text-white border-[2.5px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none'
              }`}
          >
            {isCopied ? <CheckCircle className="w-5 h-5 animate-bounce" strokeWidth={2.5} /> : <ArrowRight className="w-5 h-5 stroke-[2.5px]" />}
            {isCopied ? (isShipping ? '複製好了！正在開賣貨便…' : '複製好了！正在開 LINE…') : (isShipping ? '複製清單，去賣貨便' : (step === 1 ? '確認無誤，前往付款' : (step === 2 ? '已完成付款，下一步' : '複製明細並回傳')))}
          </button>
        </div>

      </div>
    </div>
  );
};

export default PaymentModal;
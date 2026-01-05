import React, { useState } from 'react';
import { X, Sparkles, CheckCircle, Truck, ArrowRight, Copy, MessageCircle } from 'lucide-react';
import { Order } from '../types';
import { APP_CONFIG } from '../config';

interface PaymentModalProps {
  orders: Order[];
  totalAmount: number;
  isOpen: boolean;
  onClose: () => void;
  type: 'deposit' | 'shipping';
}

const PaymentModal: React.FC<PaymentModalProps> = ({ orders, totalAmount, isOpen, onClose, type }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const isShipping = type === 'shipping';
  const targetUrl = isShipping ? APP_CONFIG.MAIHUOBIAN_URL : APP_CONFIG.LINE_URL;
  
  const themeColor = isShipping ? 'text-[#06C755]' : 'text-pink-500';
  const themeBg = isShipping ? 'bg-[#06C755]' : 'bg-pink-500';
  const themeBorder = isShipping ? 'border-[#06C755]' : 'border-pink-500';
  const themeGradient = isShipping ? 'from-green-600 to-emerald-900' : 'from-pink-600 to-purple-900';
  const themeShadow = isShipping ? 'shadow-[0_0_40px_rgba(6,199,85,0.4)]' : 'shadow-[0_0_40px_rgba(236,72,153,0.4)]';

  const generateDetailMessage = () => {
    if (isShipping) {
        return orders.map(o => `${o.items[0].name} x${o.totalQuantity}`).join('\n');
    }

    const totalDeposit = orders.reduce((sum, o) => sum + o.depositAmount, 0);
    const uniqueGroups = Array.from(new Set(orders.map(o => o.groupName))).join('\n');

    return `Kaguya訂購付款確認
--------------------
♦️社群暱稱：${orders[0].customerPhone}
♦️訂購商品系列：
${uniqueGroups}
♦️付款金額：$${totalDeposit.toLocaleString()}
♦️您的匯款帳號末五碼：【 請點此輸入後回傳 】
*（無卡請拍明細回傳）*
---------------------
已確認訂購商品與付款金額無誤！`;
  };

  const handleAction = () => {
    const message = generateDetailMessage();
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        if (targetUrl) window.open(targetUrl, '_blank');
        setIsCopied(false);
      }, 800);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className={`bg-[#050505] rounded-3xl w-full max-w-md overflow-hidden relative border-2 ${themeBorder} ${themeShadow}`}>
        
        <button 
          onClick={onClose} 
          className={`absolute top-4 right-4 p-2 bg-black hover:${themeBg} rounded-full transition-colors z-10 border-2 border-gray-700 hover:${themeBorder} text-white hover:text-black`}
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        <div className={`bg-gradient-to-br ${themeGradient} p-6 text-white text-center relative overflow-hidden border-b-2 ${themeBorder}`}>
          <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '12px 12px'}}></div>
          <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/50 animate-pulse" />
          
          <h3 className="font-black text-2xl flex items-center justify-center gap-2 drop-shadow-md mb-1">
            {isShipping ? <Truck size={28} /> : <MessageCircle size={28} />}
            {isShipping ? '前往賣貨便' : '訂金結帳'}
          </h3>
          <p className="font-bold opacity-90 text-xs tracking-widest uppercase">
            {isShipping ? 'Shipment Order' : 'PAYMENT CONFIRMATION'}
          </p>
        </div>

        <div className="p-6 bg-[#0a0a0a]">
          <div className="bg-gray-900/40 rounded-2xl p-4 border border-gray-800 mb-6 max-h-60 overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-end mb-4 border-b border-gray-700 pb-2">
                <span className="text-gray-400 font-bold text-xs uppercase">確認項目</span>
                <span className="bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded-full border border-gray-700">{orders.length} 筆</span>
            </div>
            
            <div className="space-y-3">
                {orders.map((order, index) => (
                    <div key={index} className="flex justify-between items-center group">
                        <span className="text-white font-bold text-sm truncate pr-4 group-hover:text-pink-300 transition-colors">{order.groupName}</span>
                        <span className={`font-mono font-bold ${themeColor}`}>
                            ${(isShipping ? order.balanceDue : order.depositAmount).toLocaleString()}
                        </span>
                    </div>
                ))}
            </div>

            <div className="border-t border-gray-700 my-4"></div>

            <div className="flex justify-between items-center">
                <span className="text-gray-400 font-bold text-sm uppercase">應付總額</span>
                <span className={`text-3xl font-black ${themeColor} drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]`}>
                    ${totalAmount.toLocaleString()}
                </span>
            </div>
          </div>

          <button
            onClick={handleAction}
            className={`w-full py-4 rounded-xl font-black text-base md:text-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 border-2 ${
                isShipping
                ? 'bg-[#06C755] text-white border-[#06C755] hover:bg-[#05b54b]'
                : 'bg-pink-500 text-white border-pink-500 hover:bg-pink-400'
            }`}
          >
            {isCopied ? <CheckCircle className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
            {isCopied ? '已複製！正在跳轉...' : (isShipping ? '複製內容＆前往賣場' : '複製明細＆前往LINE付款')}
            {!isCopied && <ArrowRight className="w-5 h-5" />}
          </button>
          
          <p className="text-center text-gray-500 text-xs font-bold mt-3 animate-pulse">
            {isShipping 
              ? '請將訂單明細 複製到「您購買的商品與數量」的輸入欄呦'
              : '[ 轉帳完成後請複製明細並填入末五碼貼給我們 ]'
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
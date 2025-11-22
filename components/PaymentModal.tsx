import React, { useState } from 'react';
import { MessageCircle, Copy, CheckCircle, X, Sparkles } from 'lucide-react';
import { Order } from '../types';

interface PaymentModalProps {
  orders: Order[];
  totalAmount: number;
  isOpen: boolean;
  onClose: () => void;
}

const LINE_PROFILE_URL = "https://lin.ee/cfEklUi"; 

const PaymentModal: React.FC<PaymentModalProps> = ({ orders, totalAmount, isOpen, onClose }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const generateLineMessage = () => {
    const orderList = orders.map(o => {
      const title = o.groupName || o.items[0].name;
      return `- ${title} (訂金: $${o.depositAmount})`;
    }).join('\n');

    return `【Kaguya代購 - 訂金結帳】
社群暱稱：${orders[0].customerPhone}
------------------
${orderList}
------------------
訂金總額：NT$ ${totalAmount.toLocaleString()}

請提供匯款帳號，謝謝！`;
  };

  const handleCopyAndRedirect = () => {
    const message = generateLineMessage();
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        window.open(LINE_PROFILE_URL, '_blank');
      }, 800);
    });
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-[#050505] rounded-3xl shadow-[0_0_40px_rgba(236,72,153,0.4)] w-full max-w-md overflow-hidden relative border-2 border-pink-500">
        
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 bg-black hover:bg-pink-500 rounded-full transition-colors z-10 border-2 border-gray-700 hover:border-pink-500 text-white hover:text-black"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </button>

        {/* Header - Neon Pink Gradient with Pattern - NO ITALIC */}
        <div className="bg-gradient-to-br from-pink-600 to-purple-900 p-8 text-white text-center relative overflow-hidden border-b-2 border-pink-500">
          {/* Decoration */}
          <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '12px 12px'}}></div>
          <Sparkles className="absolute top-4 left-4 w-6 h-6 text-pink-200 animate-pulse" />
          
          <h3 className="font-black text-3xl flex items-center justify-center gap-2 relative z-10 tracking-tighter drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
            訂金結帳
          </h3>
          <p className="text-pink-200 text-xs font-black uppercase tracking-widest mt-2 relative z-10">
            PAYMENT CONFIRMATION
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="bg-black rounded-2xl p-5 border border-gray-800 relative">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">項目清單</span>
              <span className="font-black text-black bg-pink-500 px-2 py-0.5 rounded text-xs shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                {orders.length} 筆
              </span>
            </div>
            
            <div className="space-y-3 max-h-40 overflow-y-auto text-sm text-gray-300 mb-4 pr-1 custom-scrollbar">
               {orders.map(order => (
                 <div key={order.id} className="flex justify-between items-start">
                   <span className="font-bold w-2/3 leading-snug text-white">
                     {order.groupName || order.items[0].name}
                   </span>
                   <span className="font-mono text-pink-400 font-bold text-xs pt-0.5">${order.depositAmount}</span>
                 </div>
               ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
              <span className="text-white font-bold text-sm">應付總額</span>
              {/* Money - NO ITALIC */}
              <span className="text-3xl font-black text-pink-500 tracking-tighter drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                <span className="text-lg mr-1 text-gray-500">$</span>
                {totalAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={handleCopyAndRedirect}
            className={`w-full py-4 px-6 rounded-2xl font-black text-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-lg border-2 relative overflow-hidden group ${
              isCopied 
                ? 'bg-white text-black border-white' 
                : 'bg-[#06C755] text-white border-[#06C755] hover:shadow-[0_0_20px_#06C755]'
            }`}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
            
            <span className="relative z-10 flex items-center gap-2">
                {isCopied ? (
                <>
                    <CheckCircle className="w-6 h-6" /> 已複製！開啟 LINE...
                </>
                ) : (
                <>
                    <Copy className="w-5 h-5" /> 複製明細 & 前往 LINE
                </>
                )}
            </span>
          </button>

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
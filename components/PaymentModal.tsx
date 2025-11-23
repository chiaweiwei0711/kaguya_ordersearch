import React, { useState } from 'react';
import { MessageCircle, Copy, CheckCircle, X, Sparkles, Truck } from 'lucide-react';
import { Order } from '../types';
import { APP_CONFIG } from '../config';

interface PaymentModalProps {
  orders: Order[];
  totalAmount: number;
  isOpen: boolean;
  onClose: () => void;
  // 新增屬性：區分是付訂金還是補尾款
  type: 'deposit' | 'shipping';
}

const PaymentModal: React.FC<PaymentModalProps> = ({ orders, totalAmount, isOpen, onClose, type }) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const isShipping = type === 'shipping';
  
  // 決定目標連結
  const targetUrl = isShipping ? APP_CONFIG.MAIHUOBIAN_URL : APP_CONFIG.LINE_URL;
  
  // 決定主題顏色
  const themeColor = isShipping ? 'text-[#06C755]' : 'text-pink-500';
  const themeBg = isShipping ? 'bg-[#06C755]' : 'bg-pink-500';
  const themeBorder = isShipping ? 'border-[#06C755]' : 'border-pink-500';
  const themeGradient = isShipping ? 'from-green-600 to-emerald-900' : 'from-pink-600 to-purple-900';
  const themeShadow = isShipping ? 'shadow-[0_0_40px_rgba(6,199,85,0.4)]' : 'shadow-[0_0_40px_rgba(236,72,153,0.4)]';

  const generateLineMessage = () => {
    // 1. 補尾款模式 (賣貨便)：簡潔格式
    if (isShipping) {
        return orders.map(o => `${o.groupName}_${o.items[0].name} x${o.totalQuantity}`).join('\n');
    }

    // 2. 付訂金模式 (LINE)：詳細格式
    const totalProduct = orders.reduce((sum, o) => sum + o.productTotal, 0);
    const totalDeposit = orders.reduce((sum, o) => sum + o.depositAmount, 0);
    const seriesList = orders.map(o => o.groupName).join('\n');

    return `您好，我要付款！
♦️社群暱稱：${orders[0].customerPhone}
♦️訂購商品系列：
${seriesList}
♦️商品金額：$${totalProduct.toLocaleString()}
♦️應付訂金：$${totalDeposit.toLocaleString()}
已確認訂購商品與金額無誤！`;
  };

  const handleCopyAndRedirect = () => {
    const message = generateLineMessage();
    navigator.clipboard.writeText(message).then(() => {
      setIsCopied(true);
      setTimeout(() => {
        if (targetUrl) {
            window.open(targetUrl, '_blank');
        }
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

        {/* Header - Dynamic Theme */}
        <div className={`bg-gradient-to-br ${themeGradient} p-8 text-white text-center relative overflow-hidden border-b-2 ${themeBorder}`}>
          <div className="absolute inset-0 opacity-30" style={{backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)', backgroundSize: '12px 12px'}}></div>
          <Sparkles className="absolute top-4 left-4 w-6 h-6 text-white/50 animate-pulse" />
          
          <h3 className="font-black text-3xl flex items-center justify-center gap-2 relative z-10 tracking-tighter drop-shadow-[0_2px_0_rgba(0,0,0,0.5)]">
            {isShipping ? '尾款下單' : '訂金結帳'}
          </h3>
          <p className="text-white/80 text-xs font-black uppercase tracking-widest mt-2 relative z-10">
            {isShipping ? 'SHIPPING CONFIRMATION' : 'PAYMENT CONFIRMATION'}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          <div className="bg-black rounded-2xl p-5 border border-gray-800 relative">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">確認項目</span>
              <span className={`font-black text-black ${themeBg} px-2 py-0.5 rounded text-xs shadow-[0_0_10px_rgba(255,255,255,0.3)]`}>
                {orders.length} 筆
              </span>
            </div>
            
            <div className="space-y-3 max-h-40 overflow-y-auto text-sm text-gray-300 mb-4 pr-1 custom-scrollbar">
               {orders.map(order => (
                 <div key={order.id} className="flex justify-between items-start">
                   <span className="font-bold w-2/3 leading-snug text-white">
                     {order.groupName}
                   </span>
                   <span className={`font-mono ${isShipping ? 'text-[#06C755]' : 'text-pink-400'} font-bold text-xs pt-0.5`}>
                        ${isShipping ? order.balanceDue : order.depositAmount}
                   </span>
                 </div>
               ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
              <span className="text-white font-bold text-sm">應付總額</span>
              <span className={`text-3xl font-black ${themeColor} tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]`}>
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
                : `${themeBg} text-white ${themeBorder} hover:brightness-110`
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
            
            <span className="relative z-10 flex items-center gap-2">
                {isCopied ? (
                <>
                    <CheckCircle className="w-6 h-6" /> 已複製！前往 {isShipping ? '賣貨便' : 'LINE'}...
                </>
                ) : (
                <>
                    {isShipping ? <Truck className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
                    複製明細 & 前往 {isShipping ? '賣貨便' : 'LINE'}
                </>
                )}
            </span>
          </button>
          
          {isShipping && (
              <p className="text-center text-xs text-gray-500 font-bold">
                  * 請將複製的明細貼在賣貨便的「備註欄」
              </p>
          )}

        </div>
      </div>
    </div>
  );
};

export default PaymentModal;

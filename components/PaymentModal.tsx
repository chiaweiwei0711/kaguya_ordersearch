import React, { useState } from 'react';
import { Copy, CheckCircle, X, Sparkles } from 'lucide-react';
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
    // 計算各項總額
    const totalProduct = orders.reduce((sum, o) => sum + o.productTotal, 0);
    const totalDeposit = orders.reduce((sum, o) => sum + o.depositAmount, 0);
    const totalBalance = orders.reduce((sum, o) => sum + o.balanceDue, 0);

    // 商品清單格式：團名_商品名 x數量
    const itemList = orders.map(o => 
      `${o.groupName}_${o.items[0].name} x${o.totalQuantity}`
    ).join('\n');

    return `您好，我要付款！
♦️社群暱稱：${orders[0].customerPhone}

♦️團名_商品：
${itemList}

♦️商品金額：$${totalProduct.toLocaleString()}
♦️應付訂金：$${totalDeposit.toLocaleString()}
♦️抵台尾款：$${totalBalance.toLocaleString()}`;
  };

  const handleCopyAndRedirect = async () => {
    const message = generateLineMessage();
    
    try {
      // 嘗試寫入剪貼簿
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
    } catch (err) {
      console.error('複製失敗', err);
      // 就算複製失敗也要讓使用者知道
      alert("自動複製失敗，請手動複製文字後前往 LINE");
    }

    // 延遲一點點跳轉，讓使用者看到複製成功的動畫
    setTimeout(() => {
      window.open(LINE_PROFILE_URL, '_blank');
    }, 500);
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

        {/* Header */}
        <div className="bg-gradient-to-br from-pink-600 to-purple-900 p-8 text-white text-center relative overflow-hidden border-b-2 border-pink-500">
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
              <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">確認項目</span>
              <span className="font-black text-black bg-pink-500 px-2 py-0.5 rounded text-xs shadow-[0_0_10px_rgba(236,72,153,0.5)]">
                {orders.length} 筆
              </span>
            </div>
            
            <div className="space-y-3 max-h-40 overflow-y-auto text-sm text-gray-300 mb-4 pr-1 custom-scrollbar">
               {orders.map(order => (
                 <div key={order.id} className="flex flex-col border-b border-gray-900 pb-2 last:border-0">
                   <span className="font-bold text-white text-xs mb-1">
                     {order.groupName}
                   </span>
                   <div className="flex justify-between items-center">
                       <span className="text-gray-400 text-xs truncate max-w-[70%]">{order.items[0].name}</span>
                       <span className="font-mono text-pink-400 font-bold text-xs">${order.depositAmount}</span>
                   </div>
                 </div>
               ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-800">
              <span className="text-white font-bold text-sm">應付訂金總額</span>
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

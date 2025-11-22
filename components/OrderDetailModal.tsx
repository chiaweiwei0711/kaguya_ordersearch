import React from 'react';
import { X, Copy, ExternalLink, CheckCircle, Package, DollarSign, Calendar, CreditCard, User } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { APP_CONFIG } from '../config';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    const text = `
社群暱稱: ${order.customerPhone}
團名: ${order.groupName}
商品: ${order.items.map(i => i.name).join(', ')}
總額: ${order.productTotal}
已付: ${order.depositAmount}
餘款: ${order.balanceDue}
付款方式: ${order.paymentMethod}
    `.trim();
    
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const openLine = () => {
    if (APP_CONFIG.LINE_URL) {
      window.open(APP_CONFIG.LINE_URL, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-fade-in">
      <div className="bg-[#050505] rounded-3xl shadow-[0_0_50px_rgba(236,72,153,0.3)] w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh] border-2 border-gray-800 ring-1 ring-pink-500/20">
        
        {/* Header - NO ITALIC */}
        <div className="bg-black text-white p-5 flex justify-between items-center shrink-0 border-b border-gray-800">
          <h3 className="font-black text-2xl tracking-tighter flex items-center gap-3 text-white">
            <div className="bg-pink-500 w-4 h-4 rotate-45 shadow-[0_0_10px_#ec4899]"></div>
            訂單詳情
          </h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-900 hover:bg-pink-500 hover:text-black rounded-full transition-all border-2 border-gray-700 hover:border-pink-500 group">
            <X className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </button>
        </div>

        {/* User Info Banner (PINNED AT TOP) - 這裡絕對看得到 */}
        <div className="bg-gray-900 p-4 border-b border-gray-800 flex items-center gap-4 relative overflow-hidden shrink-0">
             <div className="absolute inset-0 bg-pink-500/5 pointer-events-none"></div>
             <div className="bg-pink-500/20 p-3 rounded-full border border-pink-500/50 shrink-0 relative z-10">
               <User className="w-6 h-6 text-pink-500" />
             </div>
             <div className="relative z-10">
               <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">社群暱稱 (請核對)</p>
               <p className="text-xl font-black text-white tracking-tight leading-none">{order.customerPhone}</p>
             </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar bg-[#0a0a0a]">
          
          {/* Status Badges - NO ITALIC */}
          <div className="flex flex-wrap gap-2 mb-6">
              {order.isShipped ? (
                  <span className="bg-[#06C755] text-black px-3 py-1 rounded-md text-xs font-black uppercase tracking-wide border-2 border-[#06C755] shadow-[0_0_10px_rgba(6,199,85,0.4)]">已出貨</span>
              ) : (
                  <span className="bg-red-500 text-white px-3 py-1 rounded-md text-xs font-black uppercase tracking-wide border-2 border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]">未出貨</span>
              )}
              
              {order.shippingStatus && (
                 <span className="bg-blue-900/40 text-blue-300 border border-blue-500 px-3 py-1 rounded-md text-xs font-bold">
                    {order.shippingStatus}
                 </span>
              )}

              <span className={`px-3 py-1 rounded-md text-xs font-bold border ${
                  order.status === OrderStatus.PAID 
                  ? 'bg-pink-500/20 text-pink-400 border-pink-500/50' 
                  : 'bg-gray-800 text-gray-400 border-gray-600'
              }`}>
                  {order.status === OrderStatus.PAID ? '已付訂金' : '未付訂金'}
              </span>
          </div>

          {/* Main Info - NO ITALIC */}
          <div className="mb-6 border-l-4 border-pink-500 pl-4">
            <p className="font-bold text-2xl text-white">{order.groupName}</p>
          </div>

          {/* Additional Info Grid: Shipping Date & Payment Method */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex items-start gap-3">
               <div className="bg-gray-800 p-2 rounded-lg shrink-0">
                 <Calendar className="w-5 h-5 text-pink-400" />
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold mb-0.5">預計出貨</p>
                 <p className="text-sm font-black text-white leading-tight">
                    {order.shippingDate || "尚未排定"}
                 </p>
               </div>
            </div>
            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 flex items-start gap-3">
               <div className="bg-gray-800 p-2 rounded-lg shrink-0">
                 <CreditCard className="w-5 h-5 text-[#06C755]" />
               </div>
               <div>
                 <p className="text-xs text-gray-400 font-bold mb-0.5">付款方式</p>
                 <p className="text-sm font-black text-white leading-tight">
                    {order.paymentMethod}
                 </p>
               </div>
            </div>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h4 className="text-sm font-black text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Package className="w-4 h-4 text-pink-500" /> 購買清單
            </h4>
            <div className="bg-black rounded-xl p-4 space-y-4 border border-gray-800 relative overflow-hidden">
               {/* Dot pattern overlay */}
               <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '8px 8px'}}></div>
               
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-3 relative z-10">
                   <span className="font-bold text-gray-200 text-sm leading-relaxed">{item.name}</span>
                   <span className="bg-pink-500 px-2 py-1 rounded text-xs font-black text-black shadow-[0_0_5px_rgba(236,72,153,0.5)] whitespace-nowrap">
                     x {item.quantity || order.totalQuantity}
                   </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financials - NO ITALIC */}
          <div className="mb-6">
             <h4 className="text-sm font-black text-gray-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <DollarSign className="w-4 h-4 text-pink-500" /> 金額試算
             </h4>
             <div className="space-y-3 px-2 bg-gray-900/30 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-bold">商品總額</span>
                    <span className="font-bold text-white">${order.productTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm font-bold">已付訂金</span>
                    <span className="font-bold text-gray-500">
                        - ${order.depositAmount.toLocaleString()}
                    </span>
                </div>
                <div className="border-t border-gray-700 my-2"></div>
                <div className="flex justify-between items-center">
                    <span className="font-black text-white text-lg">應補尾款</span>
                    <span className={`font-black text-2xl ${order.balanceDue > 0 ? 'text-pink-500 drop-shadow-[0_0_5px_rgba(236,72,153,0.6)]' : 'text-gray-600'}`}>
                        ${order.balanceDue.toLocaleString()}
                    </span>
                </div>
             </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-gray-800 grid grid-cols-2 gap-3 bg-black shrink-0">
            <button 
                onClick={handleCopy}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl border-2 border-gray-700 font-bold text-gray-300 bg-gray-900 hover:bg-gray-800 hover:border-gray-500 transition-all"
            >
                {isCopied ? <CheckCircle className="w-5 h-5 text-green-500"/> : <Copy className="w-5 h-5"/>}
                {isCopied ? "已複製" : "複製"}
            </button>
            <button 
                onClick={openLine}
                className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-[#06C755] text-white font-black hover:bg-[#05b54b] transition-all shadow-[0_0_15px_rgba(6,199,85,0.4)] border-2 border-[#06C755] active:scale-95"
            >
                <ExternalLink className="w-5 h-5" />
                聯絡客服
            </button>
        </div>

      </div>
    </div>
  );
};

export default OrderDetailModal;

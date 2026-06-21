import React from 'react';
import { X, Copy, ExternalLink, Package, DollarSign, Calendar, CreditCard, User } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { APP_CONFIG } from '../config';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

// --- 📅 1. 計算剩餘天數 (輕盈色塊版) ---
const getStorageStatus = (dateStr?: string) => {
  if (!dateStr) return null;
  const arrival = new Date(dateStr);
  const today = new Date();
  const diffTime = today.getTime() - arrival.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const LIMIT_DAYS = 25;
  const daysLeft = LIMIT_DAYS - diffDays;

  if (daysLeft < 0) {
    return { label: `逾期 ${Math.abs(daysLeft)} 天`, className: 'bg-[#f8a3f4] text-white' };
  } else if (daysLeft <= 5) {
    return { label: `剩 ${daysLeft} 天過期`, className: 'bg-[#fff170] text-black' };
  } else {
    return { label: `剩 ${daysLeft} 天可併單`, className: 'bg-[#3ac0bf] text-white' };
  }
};

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose }) => {
  const [isCopied, setIsCopied] = React.useState(false);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    const text = `Kaguya訂購付款確認\n--------------------\n♦️社群暱稱：${order.customerPhone}\n♦️訂購商品系列：\n${order.groupName}\n♦️付款金額：$${order.depositAmount.toLocaleString()}\n♦️您匯款到哪個銀行：【 請輸入後回傳 】\n♦️您的匯款帳號末五碼：【 請輸入後回傳 】\n*（無卡請拍明細回傳）*\n---------------------\n已確認訂購商品與付款金額無誤`;
    navigator.clipboard.writeText(text).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  const openLine = () => {
    if (APP_CONFIG.LINE_URL) window.open(APP_CONFIG.LINE_URL, '_blank');
  };

  const storageInfo = getStorageStatus(order.arrivalDate);

  return (
    <div className="fixed inset-0 bg-[#4c59a1]/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-8 animate-fade-in">
      {/* 🎯 卡片主體：純白底色、柔和陰影、無黑框 */}
      <div className="bg-white border-[2.5px] border-black rounded-[32px] sm:rounded-[40px] shadow-[6px_6px_0px_#000] w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">

        {/* 🎯 Header */}
        <div className="p-6 flex justify-between items-center shrink-0">
          <h3 className="font-[900] text-2xl tracking-widest flex items-center gap-2 text-black">
            <span className="text-2xl text-[#f8a3f4]">◇</span> 訂單詳情
          </h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 active:scale-95 transition-all">
            <X strokeWidth={3} size={20} />
          </button>
        </div>

        {/* 🎯 User Info Banner (色塊) */}
        <div className="bg-white shadow-[0_4px_0px_rgba(0,0,0,0.10)] rounded-[20px] mx-6 p-4 flex items-center gap-4 shrink-0">
          <div className="bg-[#f8a3f4] p-3 rounded-full shadow-sm md:shadow-md shadow-[#f8a3f4]/30">
            <User className="w-6 h-6 text-white stroke-[2.5px]" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-[900] uppercase tracking-widest mb-0.5">社群暱稱 (請核對)</p>
            <p className="text-lg font-[900] text-black tracking-widest leading-none">{order.customerPhone}</p>
          </div>
        </div>

        {/* 🎯 滾動內容區 (💡 魔法在這裡：直接用 Tailwind 覆寫滾輪樣式為 #f8a3f4) */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#3ac0bf] [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* 狀態標籤 (純色膠囊) */}
          <div className="flex flex-wrap gap-2">
            {order.isShipped ? (
              <span className="bg-[#3ac0bf] text-white px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">已出貨</span>
            ) : (
              <span className="bg-[#4c59a1] text-white px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">尚未出貨</span>
            )}
            {order.shippingStatus && (
              <span className="bg-[#fff170] text-black px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">
                {order.shippingStatus}
              </span>
            )}
            <span className={`px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest ${order.status === OrderStatus.PAID ? 'bg-[#3ac0bf]/15 text-[#3ac0bf]' : 'bg-gray-100 text-gray-400'}`}>
              {order.status === OrderStatus.PAID ? '已付訂金' : '未付訂金'}
            </span>

            {/* 倒數期限標籤 */}
            {storageInfo && !order.isShipped && (
              <span className={`px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest ${storageInfo.className}`}>
                {storageInfo.label}
              </span>
            )}
          </div>

          {/* 商品標題 (粉紅粗左邊框) */}
          <div className="border-l-[4px] border-[#f8a3f4] pl-4 py-1">
            <p className="font-[900] text-xl md:text-2xl text-[#4c59a1] leading-snug">{order.groupName}</p>
          </div>

          {/* 日期與付款方式 Grid (色塊) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white shadow-[0_4px_0px_rgba(0,0,0,0.10)] p-4 rounded-[20px] flex items-center gap-3">
              <Calendar className="w-7 h-7 text-[#f8a3f4] stroke-[2px]" />
              <div>
                <p className="text-[10px] text-gray-400 font-[900] mb-1">預計出貨</p>
                <p className="text-sm font-[900] text-black leading-tight">{order.shippingDate || "尚未排定"}</p>
              </div>
            </div>
            <div className="bg-white shadow-[0_4px_0px_rgba(0,0,0,0.10)] p-4 rounded-[20px] flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-[#3ac0bf] stroke-[2px]" />
              <div>
                <p className="text-[10px] text-gray-400 font-[900] mb-1">付款方式</p>
                <p className="text-sm font-[900] text-black leading-tight">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* 購買清單 (色塊) */}
          <div>
            <h4 className="text-xs font-[900] text-[#3ac0bf] mb-3 flex items-center gap-2 tracking-widest">
              <Package className="w-4 h-4 text-[#3ac0bf] stroke-[3px]" /> 購買清單
            </h4>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-3 bg-white p-3.5 rounded-xl shadow-[0_4px_0px_rgba(0,0,0,0.10)]">
                  <span className="font-[900] text-black text-sm">{item.name}</span>
                  <span className="bg-[#f8a3f4] px-3 py-1 rounded-full text-xs font-[900] text-white whitespace-nowrap">
                    x {item.quantity || order.totalQuantity}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 備註區 (僅當有 notes 才顯示) */}
          {order.notes && (
            <div className="bg-[#fef9c3] border border-[#fde68a] rounded-[20px] p-4">
              <p className="text-xs font-[900] text-[#92400e] mb-1.5 tracking-widest">📝 備註</p>
              <p className="text-sm font-[700] text-[#78350f] whitespace-pre-wrap leading-relaxed">{order.notes}</p>
            </div>
          )}

          {/* 金額結算 (色塊) */}
          <div>
            <h4 className="text-xs font-[900] text-[#3ac0bf] mb-3 flex items-center gap-2 tracking-widest">
              <DollarSign className="w-4 h-4 text-[#3ac0bf] stroke-[3px]" /> 金額結算
            </h4>
            <div className="space-y-4 bg-white shadow-[0_4px_0px_rgba(0,0,0,0.10)] p-6 rounded-[24px]">
              {/* 商品金額（純商品） */}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm font-[900] tracking-widest">商品金額</span>
                <span className="font-[900] text-black">${(order.productTotal - (order.domesticShipping || 0)).toLocaleString()}</span>
              </div>
              {/* 境內運費（若 > 0） */}
              {order.domesticShipping && order.domesticShipping > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-[900] tracking-widest">境內運費</span>
                  <span className="font-[900] text-black">+ ${order.domesticShipping.toLocaleString()}</span>
                </div>
              ) : null}
              {/* 合計（有境內運才顯示）— 大、黑體 */}
              {order.domesticShipping && order.domesticShipping > 0 ? (
                <div className="flex justify-between items-center">
                  <span className="text-black text-base font-[900] tracking-widest">合計</span>
                  <span className="font-[900] text-black text-xl">${order.productTotal.toLocaleString()}</span>
                </div>
              ) : null}
              <div className="border-t-2 border-dashed border-gray-200"></div>
              {/* 應付訂金 — 青綠、無負號、大字 */}
              <div className="flex justify-between items-center">
                <span className="font-[900] text-black text-lg tracking-widest">應付訂金</span>
                <span className="font-[900] text-[#3ac0bf] text-3xl tracking-tighter">$ {order.depositAmount.toLocaleString()}</span>
              </div>
              {/* 有國際運費時：原尾款（= 合計 − 應付訂金、前端自算）+ 國際運費 */}
              {order.internationalShipping && order.internationalShipping > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-[900] tracking-widest">原尾款</span>
                    <span className="font-[900] text-black">${(order.productTotal - order.depositAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm font-[900] tracking-widest">國際運費</span>
                    <span className="font-[900] text-black">+ ${order.internationalShipping.toLocaleString()}</span>
                  </div>
                </>
              ) : null}
              {/* 總尾款 / 尾款 — 粉、大字 */}
              <div className="flex justify-between items-center">
                <span className="font-[900] text-black text-lg tracking-widest">
                  {order.internationalShipping && order.internationalShipping > 0 ? '總尾款' : '尾款'}（抵台時賣貨便下單）
                </span>
                <span className={`font-[900] text-3xl tracking-tighter whitespace-nowrap ${order.balanceDue > 0 ? 'text-[#4c59a1]' : 'text-gray-300'}`}>
                  $ {order.balanceDue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* 🎯 Footer 按鈕區 (無邊框、純色塊) */}
        <div className="p-6 grid grid-cols-2 gap-3 shrink-0">
          <button onClick={handleCopy} className="flex items-center justify-center gap-2 py-4 rounded-full font-[900] text-gray-600 bg-gray-100 border-[2.5px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
            <Copy className="w-5 h-5 stroke-[2.5px]" />
            {isCopied ? "已複製" : "複製付款回報"}
          </button>
          <button onClick={openLine} className="flex items-center justify-center gap-2 py-4 rounded-full bg-[#3ac0bf] text-white font-[900] border-[2.5px] border-black shadow-[3px_3px_0px_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none transition-all">
            <ExternalLink className="w-5 h-5 stroke-[2.5px]" />
            聯絡客服
          </button>
        </div>

      </div>
    </div>
  );
};

export default OrderDetailModal;
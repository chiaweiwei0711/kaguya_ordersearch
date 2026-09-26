import React from 'react';
import { X, ExternalLink, Package, DollarSign, Calendar, CreditCard, User, ArrowRight } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { APP_CONFIG } from '../config';
import { getStorageInfo, balanceWithFee } from '../services/storage';

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onPay?: (order: Order) => void;   // 依訂單狀態走正路付款（付訂金 or 賣貨便尾款）
}

// 倉儲倒數／倉儲費：算式統一在 services/storage.ts
const getStorageStatus = (dateStr?: string) => getStorageInfo(dateStr);

const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ order, isOpen, onClose, onPay }) => {
  if (!isOpen || !order) return null;

  const openLine = () => {
    if (APP_CONFIG.LINE_URL) window.open(APP_CONFIG.LINE_URL, '_blank');
  };

  // 這張訂單「當下該做的付款動作」：待付款→付訂金；已付訂金且已抵台未出貨→付尾款；其餘→無
  const isPending = order.status !== OrderStatus.PAID;
  const isArrived = (order.shippingStatus || '').includes('已抵台');
  const payLabel = isPending ? '前往付款' : (isArrived && !order.isShipped ? '賣貨便下單' : null);

  const storageInfo = getStorageStatus(order.arrivalDate);

  return (
    <div className="fixed inset-0 bg-[#283d3e]/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 md:p-8 animate-fade-in">
      {/* 🎯 卡片主體：純白底色、柔和陰影、無黑框 */}
      <div className="bg-white border-[2.5px] border-black rounded-[32px] sm:rounded-[40px] w-full max-w-md overflow-hidden relative flex flex-col max-h-[90vh]">

        {/* 🎯 Header */}
        <div className="p-6 flex justify-between items-center shrink-0">
          <h3 className="font-[900] text-2xl tracking-widest flex items-center gap-2 text-black">
            <span className="text-2xl text-[#e868a0]">◇</span> 訂單詳情
          </h3>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-full text-gray-500 active:scale-95 transition-all">
            <X strokeWidth={3} size={20} />
          </button>
        </div>

        {/* 🎯 User Info Banner (色塊) */}
        <div className="bg-white rounded-[20px] mx-6 p-4 flex items-center gap-4 shrink-0">
          <div className="bg-[#e868a0] p-3 rounded-full shadow-sm md:shadow-md shadow-[#e868a0]/30">
            <User className="w-6 h-6 text-white stroke-[2.5px]" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-[900] uppercase tracking-widest mb-0.5">社群暱稱 (請核對)</p>
            <p className="text-lg font-[900] text-black tracking-widest leading-none">{order.customerPhone}</p>
          </div>
        </div>

        {/* 🎯 滾動內容區 (💡 魔法在這裡：直接用 Tailwind 覆寫滾輪樣式為 #e868a0) */}
        <div className="px-6 py-5 overflow-y-auto flex-1 space-y-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#49d5df] [&::-webkit-scrollbar-thumb]:rounded-full">

          {/* 狀態標籤 (純色膠囊) */}
          <div className="flex flex-wrap gap-2">
            {order.isShipped ? (
              <span className="bg-[#49d5df] text-[#283d3e] px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">已出貨</span>
            ) : (
              <span className="bg-[#283d3e] text-white px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">尚未出貨</span>
            )}
            {order.shippingStatus && (
              <span className="bg-[#f6f9f9] text-black px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest">
                {order.shippingStatus}
              </span>
            )}
            <span className={`px-3 py-1.5 rounded-full text-xs font-[900] tracking-widest ${order.status === OrderStatus.PAID ? 'bg-[#49d5df]/15 text-[#49d5df]' : 'bg-gray-100 text-gray-400'}`}>
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
          <div className="border-l-[4px] border-[#e868a0] pl-4 py-1">
            <p className="font-[900] text-xl md:text-2xl text-[#283d3e] leading-snug">{order.groupName}</p>
          </div>

          {/* 日期與付款方式 Grid (色塊) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-4 rounded-[20px] flex items-center gap-3">
              <Calendar className="w-7 h-7 text-[#e868a0] stroke-[2px]" />
              <div>
                <p className="text-[10px] text-gray-400 font-[900] mb-1">預計出貨</p>
                <p className="text-sm font-[900] text-black leading-tight">{order.shippingDate || "尚未排定"}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-[20px] flex items-center gap-3">
              <CreditCard className="w-7 h-7 text-[#49d5df] stroke-[2px]" />
              <div>
                <p className="text-[10px] text-gray-400 font-[900] mb-1">付款方式</p>
                <p className="text-sm font-[900] text-black leading-tight">{order.paymentMethod}</p>
              </div>
            </div>
          </div>

          {/* 購買清單 (色塊) */}
          <div>
            <h4 className="text-xs font-[900] text-[#49d5df] mb-3 flex items-center gap-2 tracking-widest">
              <Package className="w-4 h-4 text-[#49d5df] stroke-[3px]" /> 購買清單
            </h4>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center gap-3 bg-white p-3.5 rounded-xl">
                  <span className="font-[900] text-black text-sm">{item.name}</span>
                  <span className="bg-[#e868a0] px-3 py-1 rounded-full text-xs font-[900] text-white whitespace-nowrap">
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
            <h4 className="text-xs font-[900] text-[#49d5df] mb-3 flex items-center gap-2 tracking-widest">
              <DollarSign className="w-4 h-4 text-[#49d5df] stroke-[3px]" /> 金額結算
            </h4>
            <div className="space-y-4 bg-white p-6 rounded-[24px]">
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
              {/* 帳單式：商品金額 → 扣掉應付訂金 → 尾款（＋國際運費）→ 追加倉儲費 → 總尾款 */}
              {(() => {
                const intl = order.internationalShipping && order.internationalShipping > 0 ? order.internationalShipping : 0;
                const baseBalance = order.productTotal - order.depositAmount;           // 純尾款（每團預留 100）
                const fee = storageInfo && !order.isShipped ? storageInfo.fee : 0;
                const hasExtra = intl > 0 || fee > 0;
                const total = balanceWithFee(order);
                return (
                  <>
                    {isPending ? (
                      /* 待付款：商品金額 → 扣掉預留尾款 → 線 → 應付訂金（大字） */
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm font-[900] tracking-widest">預留尾款</span>
                          <span className="font-[900] text-black">− $ {baseBalance.toLocaleString()}</span>
                        </div>
                        <div className="border-t-2 border-dashed border-gray-200"></div>
                        <div className="flex justify-between items-center">
                          <span className="font-[900] text-black text-lg tracking-widest">應付訂金</span>
                          <span className="font-[900] text-[#49d5df] text-3xl tracking-tighter">$ {order.depositAmount.toLocaleString()}</span>
                        </div>
                      </>
                    ) : (
                      /* 已付訂金：商品金額 → 扣掉已付訂金 → 線 → 尾款（＋追加）→ 總尾款 */
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500 text-sm font-[900] tracking-widest">已付訂金</span>
                          <span className="font-[900] text-[#49d5df]">− $ {order.depositAmount.toLocaleString()}</span>
                        </div>
                        <div className="border-t-2 border-dashed border-gray-200"></div>
                        <div className="flex justify-between items-center">
                          <span className={`font-[900] tracking-widest ${hasExtra ? 'text-gray-500 text-sm' : 'text-black text-lg'}`}>尾款</span>
                          <span className={`font-[900] whitespace-nowrap ${hasExtra ? 'text-black' : 'text-[#283d3e] text-3xl tracking-tighter'}`}>$ {baseBalance.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {!isPending && intl > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500 text-sm font-[900] tracking-widest">追加國際運費</span>
                        <span className="font-[900] text-black">+ $ {intl.toLocaleString()}</span>
                      </div>
                    )}
                    {!isPending && fee > 0 && storageInfo && (
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-gray-500 text-sm font-[900] tracking-widest">追加倉儲費</div>
                          <div className="text-[11px] text-gray-400 font-bold leading-snug mt-0.5">
                            {storageInfo.arrival.getMonth() + 1}/{storageInfo.arrival.getDate()} 抵台・免費保管至 {storageInfo.freeUntil.getMonth() + 1}/{storageInfo.freeUntil.getDate()}・逾期 {storageInfo.overdueDays} 天 × $5
                          </div>
                        </div>
                        <span className="font-[900] text-[#e868a0] whitespace-nowrap">+ $ {fee.toLocaleString()}</span>
                      </div>
                    )}
                    {!isPending && hasExtra && (
                      <>
                        <div className="border-t-2 border-dashed border-gray-200"></div>
                        <div className="flex justify-between items-center">
                          <span className="font-[900] text-black text-lg tracking-widest">總尾款</span>
                          <span className="font-[900] text-3xl tracking-tighter whitespace-nowrap text-[#283d3e]">$ {total.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                    {storageInfo && !order.isShipped && fee === 0 && (
                      <p className="text-[11px] text-gray-500 font-bold leading-relaxed">{storageInfo.detail}</p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

        </div>

        {/* 🎯 Footer 按鈕區：付款動作依訂單狀態變（走正路 PaymentModal），已付款不出現付款鈕 */}
        <div className="p-6 flex gap-3 shrink-0">
          {payLabel ? (
            <>
              <button onClick={() => onPay && onPay(order)} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-[#49d5df] text-[#283d3e] font-[900] border-[2.5px] border-black active:translate-x-[3px] active:opacity-60 transition-all">
                <ArrowRight className="w-5 h-5 stroke-[3px]" />
                {payLabel}
              </button>
              <button onClick={openLine} className="flex items-center justify-center gap-2 px-5 py-4 rounded-full bg-gray-100 text-gray-600 font-[900] border-[2.5px] border-black active:translate-x-[3px] active:opacity-60 transition-all">
                <ExternalLink className="w-5 h-5 stroke-[2.5px]" />
                客服
              </button>
            </>
          ) : (
            <button onClick={openLine} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-full bg-[#49d5df] text-[#283d3e] font-[900] border-[2.5px] border-black active:translate-x-[3px] active:opacity-60 transition-all">
              <ExternalLink className="w-5 h-5 stroke-[2.5px]" />
              聯絡客服
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default OrderDetailModal;

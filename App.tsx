import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, Check, Square, CheckSquare, MessageCircle, Truck, Box, AlertCircle, Sparkles, Bell, Star, Filter, Circle, CheckCircle2 } from 'lucide-react';
import { Order, OrderStatus } from './types';
import PaymentModal from './components/PaymentModal';
import OrderDetailModal from './components/OrderDetailModal';
import { fetchOrdersFromSheet } from './services/googleSheetService';
import { APP_CONFIG } from './config';

type TabType = 'deposit' | 'balance' | 'completed' | 'all';

// Row 1: Logistics Status (Multi-select)
const ITEM_STATUS_OPTIONS = ['已登記', '已訂購', '日方發貨', '商品轉送中', '已抵台'];
// Row 2: Fulfillment Status (Single-select)
const DELIVERY_STATUS_OPTIONS = ['已出貨', '尚未出貨'];

const App: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  
  const [payingOrders, setPayingOrders] = useState<Order[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  
  // Detail Modal State
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // --- New Filter State ---
  // Row 1: Multi-select
  const [cargoFilters, setCargoFilters] = useState<string[]>([]);
  // Row 2: Single-select (string or null)
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);

  // --- 篩選邏輯 ---
  const filteredOrders = useMemo(() => {
    return foundOrders.filter(order => {
      const isPending = order.status === OrderStatus.PENDING; // 尚未付款
      const isPaid = order.status === OrderStatus.PAID; // 已付款 (已對帳)
      const isArrived = order.shippingStatus.includes("已抵台");
      const isShipped = order.isShipped;

      // 1. Tab Filtering (Basic Tabs)
      let matchesTab = false;
      if (activeTab === 'deposit') {
        matchesTab = isPending;
      } else if (activeTab === 'balance') {
        // 顯示：已付款 + 已抵台 + 尚未出貨 (需要補尾款/下單)
        matchesTab = isPaid && isArrived && !isShipped;
      } else if (activeTab === 'completed') {
        matchesTab = isPaid && isArrived && isShipped;
      } else {
        matchesTab = true;
      }

      if (!matchesTab) return false;

      // 2. Advanced Status Filtering (Only applies to 'all' tab)
      if (activeTab === 'all') {
        
        // Check Row 1: Cargo Filters (OR Logic within this row)
        // If no filters selected, pass. If filters selected, must match at least one.
        let matchesCargo = true;
        if (cargoFilters.length > 0) {
            matchesCargo = cargoFilters.some(filter => 
                order.shippingStatus && order.shippingStatus.includes(filter)
            );
        }

        // Check Row 2: Delivery Filter (Single Logic)
        // If no filter selected, pass. If selected, must match exactly.
        let matchesDelivery = true;
        if (deliveryFilter) {
            if (deliveryFilter === '已出貨') {
                matchesDelivery = order.isShipped;
            } else if (deliveryFilter === '尚未出貨') {
                matchesDelivery = !order.isShipped;
            }
        }

        // Composite Logic: Tab AND Cargo AND Delivery
        return matchesCargo && matchesDelivery;
      }

      return true;
    });
  }, [foundOrders, activeTab, cargoFilters, deliveryFilter]);

  const selectedOrdersData = useMemo(() => {
    return filteredOrders.filter(o => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  // 計算金額
  const totalSelectedAmount = useMemo(() => {
    if (activeTab === 'deposit') {
      return selectedOrdersData.reduce((sum, o) => sum + o.depositAmount, 0);
    } else if (activeTab === 'balance') {
      return selectedOrdersData.reduce((sum, o) => sum + o.balanceDue, 0);
    }
    return 0;
  }, [selectedOrdersData, activeTab]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) return;
    
    setIsLoading(true);
    setHasSearched(false);
    setErrorMsg('');
    setFoundOrders([]);
    setSelectedOrderIds(new Set());
    // Reset filters on new search
    setCargoFilters([]);
    setDeliveryFilter(null);
    
    try {
      const results = await fetchOrdersFromSheet(searchQuery);
      setFoundOrders(results);
      setHasSearched(true);
      
      const hasPending = results.some(o => o.status === OrderStatus.PENDING);
      const hasReadyToShip = results.some(o => o.status === OrderStatus.PAID && o.shippingStatus.includes("已抵台") && !o.isShipped);
      const hasCompleted = results.some(o => o.status === OrderStatus.PAID && o.shippingStatus.includes("已抵台") && o.isShipped);
      
      if (hasPending) setActiveTab('deposit');
      else if (hasReadyToShip) setActiveTab('balance');
      else if (hasCompleted) setActiveTab('completed');
      else setActiveTab('all');

    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "查詢發生錯誤");
      setFoundOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOrderSelection = (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrderIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedOrderIds.size === filteredOrders.length && filteredOrders.length > 0) {
      setSelectedOrderIds(new Set());
    } else {
      const allIds = new Set(filteredOrders.map(o => o.id));
      setSelectedOrderIds(allIds);
    }
  };

  // Row 1 Logic: Multi-select
  const toggleCargoFilter = (filter: string) => {
    setCargoFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  // Row 2 Logic: Single-select (Toggle on/off)
  const toggleDeliveryFilter = (filter: string) => {
    setDeliveryFilter(prev => prev === filter ? null : filter);
  };

  const openDetailModal = (order: Order) => {
    setSelectedDetailOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleBottomAction = () => {
    if (selectedOrdersData.length === 0) return;

    if (activeTab === 'deposit') {
      setPayingOrders(selectedOrdersData);
      setIsPaymentModalOpen(true);
    } else if (activeTab === 'balance') {
      if (APP_CONFIG.MAIHUOBIAN_URL) {
        window.open(APP_CONFIG.MAIHUOBIAN_URL, '_blank');
      }
    }
  };

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.length === selectedOrderIds.size;

  return (
    <div className="min-h-screen font-sans pb-32 text-white selection:bg-pink-500 selection:text-white">
      
      {/* --- Y2K Header --- */}
      <div className="relative pt-12 pb-12 px-6 flex flex-col items-center text-center overflow-hidden">
        
        {/* Background Decorations (Y2K Glows) */}
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        
        {/* Star Decoration */}
        <Sparkles className="absolute top-10 right-10 text-pink-500 w-8 h-8 animate-pulse" />
        <Star className="absolute top-20 left-10 text-pink-400 w-5 h-5 animate-bounce" />

        {/* Logo Area - MOVED TO TOP */}
        <div className="relative z-10 mb-4 animate-float">
          <div className="h-28 md:h-40 mx-auto flex items-center justify-center">
             <img 
               src="https://duk.tw/ZhYY5L.png" 
               alt="Kaguya Logo" 
               className="h-full w-auto object-contain drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]" 
             />
          </div>
        </div>

        {/* Main Title - Bold & Big */}
        <h2 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-[0_2px_0_rgba(236,72,153,1)]">
          自助查詢訂單系統
        </h2>

        {/* Subtitle - KEEP ITALIC */}
        <p className="text-pink-400 font-black italic tracking-widest uppercase text-sm md:text-base drop-shadow-sm mb-6 border-b-2 border-pink-500/30 pb-1">
          Kaguya日本動漫周邊專業代購
        </p>

        {/* Announcement Bar (Large Info Card) */}
        <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md border-2 border-pink-500 rounded-3xl p-6 mb-8 animate-fade-in-up shadow-[0_0_25px_rgba(236,72,153,0.25)] text-center relative overflow-hidden group hover:border-pink-400 transition-colors">
          {/* Scanlines effect overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]"></div>
          
          <div className="relative z-10">
             <div className="flex items-center justify-center gap-2 mb-3">
                <Bell className="w-5 h-5 text-pink-500 fill-pink-500 animate-pulse" />
                <span className="text-pink-500 font-black text-xs uppercase tracking-widest">Welcome</span>
             </div>

             <p className="text-gray-300 text-sm md:text-base font-bold leading-relaxed mb-5">
               本查詢系統提供 Kaguyaさま 的顧客們更輕鬆便利的一站式訂單查詢體驗，從付款、貨況查詢到抵台下單出貨，所有流程都可以簡單完成！希望大家可以開心購物！
             </p>
             
             {/* Divider */}
             <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent my-4"></div>

             {/* Reminders */}
             <div className="flex flex-col gap-3 text-sm md:text-lg font-bold text-white">
                <div className="flex items-center justify-center gap-2 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-700 hover:border-pink-500 transition-colors w-full">
                   <MessageCircle size={18} className="text-pink-400 shrink-0"/> 
                   <span>付款請查 <span className="text-pink-400 text-xl ml-1">待付款訂單</span></span>
                </div>
                <div className="flex items-center justify-center gap-2 bg-gray-900/50 px-4 py-2 rounded-full border border-gray-700 hover:border-[#06C755] transition-colors w-full">
                   <Truck size={18} className="text-[#06C755] shrink-0"/> 
                   <span>已抵台下單請查 <span className="text-[#06C755] text-xl ml-1">可出貨訂單</span></span>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-20">
        
        {/* Search Box (Y2K Style: Thick Border, High Contrast) */}
        <div className="mb-8">
            <div className="bg-black rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-2 flex items-center gap-2 border-2 border-pink-500 ring-4 ring-pink-500/20">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-pink-500 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="請輸入您的社群暱稱（請務必完全正確，不然查不到您的訂單）"
                  className="w-full pl-12 pr-4 py-4 bg-transparent rounded-2xl outline-none text-lg font-bold placeholder-gray-600 text-white"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-pink-500 hover:bg-pink-400 text-black p-4 rounded-2xl font-black transition-all shadow-[0_0_15px_rgba(236,72,153,0.6)] active:scale-95 flex items-center justify-center border-2 border-pink-300"
              >
                {isLoading ? '...' : <ArrowRight className="w-6 h-6" />}
              </button>
            </div>
            {/* Warning Text */}
            <p className="text-pink-500 text-xs md:text-sm font-bold mt-3 text-center drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]">
               若您更改社群暱稱 請務必私訊官賴協助修改 否則查不到訂單喔！
            </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-400 text-sm">查詢錯誤</h4>
              <p className="text-red-200 text-sm mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Tabs & Results */}
        {hasSearched && !errorMsg && (
          <div className="animate-fade-in space-y-6">
            
            {/* Y2K Pill Tabs */}
            <div className="flex justify-center gap-3 overflow-x-auto pb-4 px-2">
              {[
                { id: 'deposit', label: '待付款訂單' },
                { id: 'balance', label: '可出貨訂單' },
                { id: 'completed', label: '已完成' },
                { id: 'all', label: '全部' },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => { 
                      setActiveTab(tab.id as TabType); 
                      setSelectedOrderIds(new Set()); 
                      setCargoFilters([]); 
                      setDeliveryFilter(null); 
                  }}
                  className={`px-6 py-3 rounded-full text-sm font-black transition-all whitespace-nowrap border-2 relative overflow-hidden group
                    ${activeTab === tab.id
                      ? 'bg-pink-500 text-black border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.5)] scale-105 z-10' 
                      : 'bg-black text-gray-400 border-gray-700 hover:border-pink-500 hover:text-pink-300'}
                  `}
                >
                  {/* Gloss Effect */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none opacity-50"></div>
                  <span className="relative z-10">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Advanced Status Filters (Only visible for 'All' tab) */}
            {activeTab === 'all' && (
                <div className="bg-[#111] p-5 rounded-2xl border border-gray-800 animate-fade-in space-y-5">
                    {/* Row 1: Cargo Status (Multi-select) */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-pink-500 text-base font-black tracking-wider">貨況篩選 (可多選)</span>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {ITEM_STATUS_OPTIONS.map(filter => {
                                const isActive = cargoFilters.includes(filter);
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => toggleCargoFilter(filter)}
                                        className={`px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center gap-2 active:scale-95
                                        ${isActive 
                                            ? 'bg-blue-900/40 text-blue-300 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                            : 'bg-black text-gray-500 border-gray-800 hover:border-gray-600'}
                                        `}
                                    >
                                        {isActive ? <CheckSquare className="w-4 h-4"/> : <Square className="w-4 h-4"/>}
                                        {filter}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-gray-800/50"></div>

                    {/* Row 2: Delivery Status (Single-select) */}
                    <div className="flex flex-col items-center gap-3">
                        <span className="text-[#06C755] text-base font-black tracking-wider">出貨篩選 (單選)</span>
                        <div className="flex flex-wrap gap-3 justify-center">
                            {DELIVERY_STATUS_OPTIONS.map(filter => {
                                const isActive = deliveryFilter === filter;
                                const isShipped = filter === '已出貨';
                                return (
                                    <button
                                        key={filter}
                                        onClick={() => toggleDeliveryFilter(filter)}
                                        className={`px-4 py-2.5 rounded-full text-sm font-bold border-2 transition-all flex items-center gap-2 active:scale-95
                                        ${isActive 
                                            ? (isShipped 
                                                ? 'bg-[#06C755]/20 text-[#06C755] border-[#06C755] shadow-[0_0_10px_rgba(6,199,85,0.3)]'
                                                : 'bg-red-900/20 text-red-400 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]')
                                            : 'bg-black text-gray-500 border-gray-800 hover:border-gray-600'}
                                        `}
                                    >
                                        {/* Use Circle/CheckCircle for single select feel */}
                                        {isActive ? <CheckCircle2 className="w-4 h-4"/> : <Circle className="w-4 h-4"/>}
                                        {filter}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Bar */}
            {(activeTab === 'deposit' || activeTab === 'balance') && filteredOrders.length > 0 && (
               <div className="flex justify-between items-center px-4 bg-gray-900/80 backdrop-blur rounded-full py-2 border border-gray-700">
                  <span className="text-xs font-black text-pink-400 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {activeTab === 'deposit' ? '選擇訂金項目' : '選擇補款項目'}
                  </span>
                  <button 
                    onClick={toggleSelectAll}
                    className={`text-xs font-bold flex items-center gap-1 px-3 py-1 rounded-full transition-colors border ${
                        isAllSelected 
                        ? 'bg-pink-500 text-black border-pink-500' 
                        : 'bg-black text-gray-400 border-gray-600'
                    }`}
                  >
                    {isAllSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                    {isAllSelected ? "取消全選" : "全選"}
                  </button>
               </div>
            )}

            {filteredOrders.length === 0 ? (
              <div className="text-center py-16 bg-black/40 rounded-3xl border-2 border-dashed border-gray-800">
                <div className="bg-gray-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-700">
                  <Box className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 font-bold">
                   {activeTab === 'all' && (cargoFilters.length > 0 || deliveryFilter) 
                      ? '沒有符合篩選條件的訂單' 
                      : '沒有此狀態的訂單'}
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => {
                  const isPending = order.status === OrderStatus.PENDING; 
                  const isSelected = selectedOrderIds.has(order.id);
                  
                  // Actionable logic
                  const isActionable = (activeTab === 'deposit' && isPending) || 
                                       (activeTab === 'balance' && !order.isShipped);

                  return (
                    <div 
                      key={order.id} 
                      onClick={() => openDetailModal(order)}
                      className={`group relative bg-[#111] rounded-2xl p-5 transition-all duration-300 cursor-pointer border-2 overflow-hidden
                        ${isSelected 
                          ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] bg-gray-900' 
                          : 'border-gray-800 hover:border-pink-500/50 hover:bg-gray-900/50'}
                      `}
                    >
                       {/* Active Selection Glow Background */}
                       {isSelected && <div className="absolute inset-0 bg-pink-500/5 pointer-events-none"></div>}

                       <div className="flex gap-4 items-start relative z-10">
                         {/* Custom Checkbox */}
                         {isActionable && (
                           <div className="pt-1" onClick={(e) => e.stopPropagation()}> 
                              <button 
                                onClick={(e) => toggleOrderSelection(e, order.id)}
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 shadow-lg ${
                                  isSelected 
                                    ? 'bg-pink-500 border-pink-500 rotate-3 scale-110' 
                                    : 'bg-black border-gray-600 group-hover:border-pink-500'
                                }`}
                              >
                                {isSelected && <Check className="w-4 h-4 text-black stroke-[3]" />}
                              </button>
                           </div>
                         )}

                         <div className="flex-1 min-w-0">
                            {/* Labels */}
                            <div className="flex flex-wrap items-center gap-2 mb-3">
                               {order.isShipped ? (
                                 <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-[#06C755] text-black tracking-wide uppercase shadow-[0_0_10px_rgba(6,199,85,0.4)]">
                                   已出貨
                                 </span>
                               ) : (
                                 <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded bg-red-500 text-white tracking-wide uppercase border border-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                                   未出貨
                                 </span>
                               )}

                               {order.shippingStatus && (
                                  <span className={`text-[10px] font-bold px-2 py-1 rounded border ${
                                    order.shippingStatus.includes("已抵台") 
                                      ? 'border-blue-500 bg-blue-900/30 text-blue-300' 
                                      : 'border-gray-600 bg-gray-800 text-gray-400'
                                  }`}>
                                    {order.shippingStatus}
                                  </span>
                               )}

                               {order.status === OrderStatus.PENDING && (
                                 <span className="text-[10px] font-bold px-2 py-1 rounded bg-pink-500/10 text-pink-400 border border-pink-500/30">
                                   未付訂金
                                 </span>
                               )}
                            </div>

                            {/* Title (Group Name) - NO ITALIC */}
                            <h4 className="font-black text-white text-xl leading-snug mb-1 tracking-tight">
                               {order.groupName || order.items[0].name}
                            </h4>
                            
                            <p className="text-xs text-gray-500 font-bold mb-4">
                              包含 <span className="text-white">{order.totalQuantity}</span> 件商品
                            </p>

                            {/* Money Bar - NO ITALIC */}
                            <div className="flex items-center justify-between bg-black rounded-xl p-3 border border-gray-800">
                                <div className="flex gap-6">
                                   <div className="flex flex-col">
                                     <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">訂金</span>
                                     <span className={`text-sm font-bold ${order.depositAmount > 0 ? 'text-white' : 'text-gray-600'}`}>
                                        ${order.depositAmount}
                                     </span>
                                   </div>
                                   <div className="flex flex-col">
                                     <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">尾款</span>
                                     <span className={`text-sm font-bold ${order.balanceDue > 0 ? 'text-pink-400' : 'text-gray-600'}`}>
                                        ${order.balanceDue}
                                     </span>
                                   </div>
                                </div>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors border ${isSelected ? 'bg-pink-500 text-black border-pink-400' : 'bg-gray-900 text-gray-600 border-gray-700'}`}>
                                   <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                         </div>
                       </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Action Bar (Y2K Style) */}
      {selectedOrderIds.size > 0 && (activeTab === 'deposit' || activeTab === 'balance') && (
        <div className="fixed bottom-6 left-4 right-4 z-40 animate-fade-in-up">
          <div className="max-w-3xl mx-auto bg-black/90 backdrop-blur-xl text-white rounded-3xl shadow-[0_0_30px_rgba(236,72,153,0.4)] p-4 flex items-center justify-between border-2 border-pink-500">
            <div className="flex items-center gap-4">
              <div className="bg-pink-500 w-10 h-10 rounded-full flex items-center justify-center font-black text-black shadow-lg shadow-pink-500/50 text-lg">
                {selectedOrderIds.size}
              </div>
              <div>
                <p className="text-pink-400 text-[10px] font-black uppercase tracking-wider mb-0.5">
                   {activeTab === 'deposit' ? '訂金總計' : '尾款總計'}
                </p>
                <p className="text-2xl font-black tracking-tighter">
                  <span className="text-gray-500 text-lg mr-1">$</span>
                  {totalSelectedAmount.toLocaleString()}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleBottomAction}
              className={`px-6 py-3 rounded-2xl font-black transition-all flex items-center gap-2 shadow-lg active:scale-95 border-2 relative overflow-hidden
                ${activeTab === 'deposit' 
                   ? 'bg-[#06C755] border-[#06C755] text-white hover:shadow-[0_0_15px_#06C755]' 
                   : 'bg-white border-white text-black hover:bg-gray-100 hover:shadow-[0_0_15px_white]'}
              `}
            >
              {/* Gloss */}
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none"></div>
              <span className="relative z-10 flex items-center gap-2">
                {activeTab === 'deposit' ? <MessageCircle className="w-5 h-5 fill-current" /> : <Truck className="w-5 h-5 fill-current" />}
                {activeTab === 'deposit' ? 'LINE 結帳' : '去賣貨便'}
              </span>
            </button>
          </div>
        </div>
      )}

      <PaymentModal 
        orders={payingOrders}
        totalAmount={totalSelectedAmount}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
      />

      <OrderDetailModal 
        order={selectedDetailOrder}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />
      
    </div>
  );
};

export default App;
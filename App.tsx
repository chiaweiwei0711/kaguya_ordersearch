import React, { useState, useMemo } from 'react';
import { Search, ArrowRight, Check, Square, CheckSquare, MessageCircle, Truck, Box, AlertCircle, Sparkles, Bell, Star, Circle, CheckCircle2 } from 'lucide-react';
import { Order, OrderStatus } from './types';
import PaymentModal from './components/PaymentModal';
import OrderDetailModal from './components/OrderDetailModal';
import { fetchOrdersFromSheet } from './services/googleSheetService';
import { APP_CONFIG } from './config';

type TabType = 'deposit' | 'balance' | 'completed' | 'all';

// Row 1: Cargo Status (Multi-select)
const ITEM_STATUS_OPTIONS = ['已登記', '已訂購', '日方發貨', '商品轉送中', '已抵台'];
// Row 2: Delivery Status (Single-select)
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
  // 新增：控制 Modal 是「付訂金(deposit)」還是「補尾款(shipping)」模式
  const [modalType, setModalType] = useState<'deposit' | 'shipping'>('deposit');
  
  // Detail Modal State
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Selection State
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // --- New Filter State ---
  const [cargoFilters, setCargoFilters] = useState<string[]>([]);
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
        let matchesCargo = true;
        if (cargoFilters.length > 0) {
            matchesCargo = cargoFilters.some(filter => 
                order.shippingStatus && order.shippingStatus.includes(filter)
            );
        }

        let matchesDelivery = true;
        if (deliveryFilter) {
            if (deliveryFilter === '已出貨') {
                matchesDelivery = order.isShipped;
            } else if (deliveryFilter === '尚未出貨') {
                matchesDelivery = !order.isShipped;
            }
        }
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

  const toggleCargoFilter = (filter: string) => {
    setCargoFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  };

  const toggleDeliveryFilter = (filter: string) => {
    setDeliveryFilter(prev => prev === filter ? null : filter);
  };

  const openDetailModal = (order: Order) => {
    setSelectedDetailOrder(order);
    setIsDetailModalOpen(true);
  };

  const handleBottomAction = () => {
    if (selectedOrdersData.length === 0) return;

    setPayingOrders(selectedOrdersData);
    
    // 判斷是付訂金還是補尾款
    if (activeTab === 'deposit') {
      setModalType('deposit');
    } else if (activeTab === 'balance') {
      setModalType('shipping');
    }
    
    setIsPaymentModalOpen(true);
  };

  const isAllSelected = filteredOrders.length > 0 && filteredOrders.length === selectedOrderIds.size;

  return (
    <div className="min-h-screen font-sans pb-32 text-white selection:bg-pink-500 selection:text-white relative flex flex-col">
      
      {/* --- Y2K Header --- */}
      <div className="relative pt-12 pb-8 px-6 flex flex-col items-center text-center overflow-hidden shrink-0">
        <div className="absolute top-[-150px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
        <Sparkles className="absolute top-10 right-10 text-pink-500 w-8 h-8 animate-pulse" />
        <Star className="absolute top-20 left-10 text-pink-400 w-5 h-5 animate-bounce" />

        <div className="relative z-10 mb-6 animate-float">
          <div className="h-32 md:h-48 mx-auto flex items-center justify-center">
             <img 
               src="https://duk.tw/ZhYY5L.png" 
               alt="Kaguya Logo" 
               className="h-full w-auto object-contain drop-shadow-[0_0_25px_rgba(236,72,153,0.6)]" 
             />
          </div>
        </div>

        <h2 className="text-4xl md:text-6xl font-black text-white mb-3 tracking-tight drop-shadow-[0_3px_0_rgba(236,72,153,1)]">
          自助查詢訂單系統
        </h2>

        <p className="text-pink-400 font-black italic tracking-widest uppercase text-base md:text-lg drop-shadow-sm mb-8 border-b-2 border-pink-500/30 pb-2">
          Kaguya日本動漫周邊專業代購
        </p>

        <div className="w-full max-w-2xl bg-black/40 backdrop-blur-md border-2 border-pink-500 rounded-3xl p-6 mb-8 animate-fade-in-up shadow-[0_0_25px_rgba(236,72,153,0.25)] text-center relative overflow-hidden group hover:border-pink-400 transition-colors">
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_2px,3px_100%]"></div>
          
          <div className="relative z-10">
             <div className="flex items-center justify-center gap-2 mb-3">
                <Bell className="w-6 h-6 text-pink-500 fill-pink-500 animate-pulse" />
                <span className="text-pink-500 font-black text-sm uppercase tracking-widest">Welcome</span>
             </div>

             <p className="text-gray-300 text-base md:text-lg font-bold leading-relaxed mb-6">
               本查詢系統提供 Kaguyaさま 的顧客們更輕鬆便利的一站式訂單查詢體驗，從付款、貨況查詢到抵台下單出貨，所有流程都可以簡單完成！希望大家可以開心購物！
             </p>
             
             <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-500/50 to-transparent my-5"></div>

             <div className="flex flex-col gap-4 text-base md:text-xl font-bold text-white">
                <div className="flex items-center justify-center gap-3 bg-gray-900/50 px-5 py-3 rounded-full border border-gray-700 hover:border-pink-500 transition-colors w-full">
                   <MessageCircle size={20} className="text-pink-400 shrink-0"/> 
                   <span>付款請查 <span className="text-pink-400 text-2xl ml-1 font-black">待付款訂單</span></span>
                </div>
                <div className="flex items-center justify-center gap-3 bg-gray-900/50 px-5 py-3 rounded-full border border-gray-700 hover:border-[#06C755] transition-colors w-full">
                   <Truck size={20} className="text-[#06C755] shrink-0"/> 
                   <span>已抵台下單請查 <span className="text-[#06C755] text-2xl ml-1 font-black">可出貨訂單</span></span>
                </div>
             </div>
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-20 flex-1 w-full">
        
        {/* Search Box */}
        <div className="mb-8">
            <div className="bg-black rounded-3xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] p-2 flex items-center gap-2 border-2 border-pink-500 ring-4 ring-pink-500/20">
              <div className="relative flex-1">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-pink-500 w-6 h-6" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="請輸入您的社群暱稱（請務必完全正確，不然查不到您的訂單）"
                  className="w-full pl-14 pr-4 py-5 bg-transparent rounded-2xl outline-none text-xl font-bold placeholder-gray-600 text-white"
                />
              </div>
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-pink-500 hover:bg-pink-400 text-black p-3 rounded-2xl font-black transition-all shadow-[0_0_15px_rgba(236,72,153,0.6)] active:scale-95 flex items-center justify-center border-2 border-pink-300 min-w-[60px]"
              >
                {isLoading ? (
                    <span className="text-sm font-bold whitespace-nowrap px-2">查詢中請稍候</span>
                ) : (
                    <ArrowRight className="w-6 h-6" />
                )}
              </button>
            </div>
            <p className="text-pink-500 text-sm md:text-base font-bold mt-3 text-center drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]">
               若您更改社群暱稱 請務必私訊官賴協助修改 否則查不到訂單喔！
            </p>
        </div>

        {errorMsg && (
          <div className="bg-red-900/30 border-2 border-red-500 rounded-2xl p-4 mb-6 flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-400 text-sm">查詢錯誤</h4>
              <p className="text-red-200 text-sm mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {hasSearched && !errorMsg && (
          <div className="animate-fade-in space-y-6">
            
            {/* Tabs */}
            <div className="flex justify-center gap-4 overflow-x-auto pb-4 px-2">
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
                  className={`px-6 py-3 rounded-full font-black whitespace-nowrap transition-all border-2 ${
                    activeTab === tab.id
                      ? 'bg-pink-500 text-black border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)] scale-105'
                      : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-pink-500 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'all' && (
                <div className="bg-gray-900/50 border-2 border-gray-700 rounded-3xl p-6 mb-6">
                    <div className="mb-6">
                        <h4 className="text-pink-400 font-black text-base uppercase mb-3 flex items-center gap-2">
                            <Box className="w-5 h-5" /> 貨況篩選
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {ITEM_STATUS_OPTIONS.map(status => {
                                const isSelected = cargoFilters.includes(status);
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggleCargoFilter(status)}
                                        className={`px-6 py-3 rounded-xl text-sm md:text-base font-bold border-2 transition-all flex items-center gap-2 ${
                                            isSelected 
                                            ? 'bg-pink-500 text-black border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] scale-105' 
                                            : 'bg-black text-gray-400 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                                        {status}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[#06C755] font-black text-base uppercase mb-3 flex items-center gap-2">
                            <Truck className="w-5 h-5" /> 出貨篩選
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {DELIVERY_STATUS_OPTIONS.map(status => {
                                const isSelected = deliveryFilter === status;
                                return (
                                    <button
                                        key={status}
                                        onClick={() => toggleDeliveryFilter(status)}
                                        className={`px-6 py-3 rounded-xl text-sm md:text-base font-bold border-2 transition-all flex items-center gap-2 ${
                                            isSelected 
                                            ? 'bg-[#06C755] text-white border-[#06C755] shadow-[0_0_10px_rgba(6,199,85,0.5)] scale-105' 
                                            : 'bg-black text-gray-400 border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        {isSelected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                        {status}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 text-gray-500 bg-gray-900/30 rounded-3xl border border-gray-800 border-dashed">
                  <p className="text-xl font-bold">沒有找到符合的訂單</p>
                </div>
              ) : (
                <>
                  {(activeTab === 'deposit' || activeTab === 'balance') && (
                    <div className="flex justify-end px-2">
                      <button 
                        onClick={toggleSelectAll}
                        className="text-sm font-bold text-pink-400 hover:text-pink-300 flex items-center gap-2 transition-colors"
                      >
                        {isAllSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        全選本頁
                      </button>
                    </div>
                  )}

                  {filteredOrders.map((order) => {
                    const isSelected = selectedOrderIds.has(order.id);
                    const showCheckbox = activeTab === 'deposit' || activeTab === 'balance';
                    
                    return (
                      <div 
                        key={order.id} 
                        onClick={() => openDetailModal(order)}
                        className={`bg-[#0a0a0a] border-2 rounded-3xl p-5 cursor-pointer transition-all hover:-translate-y-1 group relative overflow-hidden ${
                          isSelected 
                            ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.2)]' 
                            : 'border-gray-800 hover:border-gray-600 hover:shadow-lg'
                        }`}
                      >
                        <div className="absolute inset-0 bg-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                        <div className="flex items-center gap-4 relative z-10">
                          {showCheckbox && (
                            <div 
                              onClick={(e) => toggleOrderSelection(e, order.id)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border-2 shrink-0 ${
                                isSelected ? 'bg-pink-500 border-pink-500 text-black' : 'bg-black border-gray-600 text-transparent hover:border-pink-500'
                              }`}
                            >
                              <Check size={20} strokeWidth={4} />
                            </div>
                          )}

                          <div className="flex-1">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {order.isShipped ? (
                                    <span className="bg-[#06C755] text-black px-2 py-0.5 rounded text-[10px] font-black uppercase border border-[#06C755]">已出貨</span>
                                ) : (
                                    <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase border border-red-500 animate-pulse">尚未出貨</span>
                                )}
                                
                                {order.shippingStatus && (
                                    <span className="bg-gray-800 text-gray-300 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-600">
                                        {order.shippingStatus}
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-black text-white mb-1 line-clamp-1">
                                {order.groupName}
                            </h3>
                            
                            <div className="flex justify-between items-end mt-3">
                                <span className="text-gray-500 text-xs font-bold bg-gray-900 px-2 py-1 rounded border border-gray-800">
                                    共 {order.totalQuantity} 件商品
                                </span>
                                
                                <div className="text-right">
                                    <p className="text-xs text-gray-400 font-bold mb-0.5">
                                        {activeTab === 'deposit' ? '應付訂金' : (activeTab === 'balance' ? '應補尾款' : '商品總額')}
                                    </p>
                                    <p className="text-2xl font-black text-pink-500 tracking-tighter drop-shadow-[0_0_5px_rgba(236,72,153,0.6)]">
                                        ${activeTab === 'deposit' ? order.depositAmount : (activeTab === 'balance' ? order.balanceDue : order.productTotal)}
                                    </p>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Disclaimer for Deposit Tab */}
            {activeTab === 'deposit' && foundOrders.length > 0 && (
              <div className="mt-8 p-4 rounded-2xl bg-gray-900/50 border border-gray-800 text-center animate-fade-in">
                <p className="text-gray-400 text-xs md:text-sm font-bold leading-relaxed">
                  <span className="text-pink-500 mr-1">⚠️</span>
                  已付款但顯示尚未付款，代表尚未對帳完成。
                  <br className="hidden md:block" />
                  如官賴已回覆已對帳，2日內狀態卻未改變，請私訊官賴詢問！
                </p>
              </div>
            )}

          </div>
        )}
      </div>

      {(selectedOrdersData.length > 0) && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/80 backdrop-blur-xl border-t-2 border-pink-500 z-40 animate-fade-in-up">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">已選擇 {selectedOrdersData.length} 筆</p>
              <p className="text-3xl font-black text-white tracking-tighter">
                <span className="text-pink-500 mr-1">$</span>
                {totalSelectedAmount.toLocaleString()}
              </p>
            </div>
            
            <button
              onClick={handleBottomAction}
              className={`px-8 py-4 rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center gap-2 shadow-lg border-2 ${
                activeTab === 'deposit' 
                  ? 'bg-[#06C755] text-white border-[#06C755] shadow-[0_0_20px_rgba(6,199,85,0.4)]'
                  : 'bg-pink-500 text-black border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]'
              }`}
            >
              {activeTab === 'deposit' ? (
                 <>
                   <MessageCircle className="w-6 h-6" /> 
                   官方LINE付款
                 </>
              ) : (
                 <>
                   <Truck className="w-6 h-6" /> 
                   前往賣貨便下單
                 </>
              )}
            </button>
          </div>
        </div>
      )}

      <PaymentModal 
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        orders={payingOrders}
        totalAmount={totalSelectedAmount}
        type={modalType}
      />

      <OrderDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        order={selectedDetailOrder}
      />

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 text-xs font-bold relative z-10 mt-auto">
        <p>本網頁由 Kaguyaさま日本動漫周邊代購 設計</p>
        <p className="mt-1">統編：60071756</p>
        <p className="mt-2 opacity-50">© {new Date().getFullYear()} All Rights Reserved.</p>
      </footer>
      
    </div>
  );
};

export default App;

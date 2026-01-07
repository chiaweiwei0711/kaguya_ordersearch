import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRight, Check, MessageCircle, Truck, Box, AlertCircle, Sparkles, Star, Instagram, Send, Info, ShoppingBag, Bell, Lock, CheckSquare, Square, ChevronRight, Hash, Calendar, X, Circle, CheckCircle2 } from 'lucide-react';
import { Order, OrderStatus, Announcement } from './types';
import PaymentModal from './components/PaymentModal';
import OrderDetailModal from './components/OrderDetailModal';
import AdminDashboard from './components/AdminDashboard';
import NewsModal from './components/NewsModal';
import { fetchOrdersFromSheet, fetchAnnouncements } from './services/googleSheetService';
import { APP_CONFIG } from './config';

type MainView = 'query' | 'info';
type TabType = 'deposit' | 'balance' | 'completed' | 'all';

// --- 補回：篩選選項常數 ---
// Row 1: Cargo Status (Multi-select)
const ITEM_STATUS_OPTIONS = ['已登記', '已訂購', '日方發貨', '商品轉送中', '已抵台'];
// Row 2: Delivery Status (Single-select)
const DELIVERY_STATUS_OPTIONS = ['已出貨', '尚未出貨'];

// --- 新版：更厲害的核子反應爐讀取動畫 ---
import React, { useState, useEffect } from 'react';

// 確保這裡是 React.FC
const LoadingOverlay: React.FC = () => {
  const [status, setStatus] = useState<string>("Kaguya系統努力讀取中...");

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStatus("正在連線至雲端資料庫...");
    }, 3500);

    const timer2 = setTimeout(() => {
      setStatus("正在查找您的訂單...");
    }, 8000);

    const timer3 = setTimeout(() => {
      setStatus("即將完成，正在準備結果...");
    }, 12000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050505]/90 backdrop-blur-xl">
      {/* 1. 主要動畫區塊 (完全保留你原本的 CSS) */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        <div className="absolute inset-[-20px] rounded-full border-[6px] border-transparent border-t-purple-600/60 border-r-purple-500/40 animate-[spin_3s_linear_infinite_reverse] shadow-[0_0_30px_#9333ea]"></div>
        <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-pink-500 border-l-pink-600/50 animate-[spin_1.5s_linear_infinite] shadow-[0_0_20px_#ec4899] ring-4 ring-pink-500/20"></div>
        <div className="relative z-10 flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-pink-500 rounded-full animate-ping opacity-30"></div>
          <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-purple-700 rounded-full animate-pulse shadow-[0_0_40px_#ec4899] border-2 border-pink-300/50 flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-full blur-[2px] animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* 2. 文字區塊 */}
      <div className="mt-12 text-center space-y-3 relative z-20">
        <h3 
          className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-400 to-pink-500 font-[900] tracking-[0.3em] text-2xl uppercase animate-pulse filter drop-shadow-[0_0_10px_#ec4899]"
          style={{ fontFamily: "'Arial Black', sans-serif" }}
        >
          SYSTEM LOADING
        </h3>
        <p className="text-pink-400 font-bold text-sm tracking-widest animate-bounce min-h-[1.5em]">
          {status}
        </p>
      </div>
      
      {/* 3. 背景裝飾網格 */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGZSIHN0cm9rZT0icmdiYSgyMzYsIDcyLCAxNTMsIDAuMSkiIHN0cm9rZS13aWR0aD0iMSI+PHBhdGggZD0iTTAgNDBoNDBNNDAgMGg0ME0wIDBoNDBNNDAgNDBoNDAiLz48L2c+PC9zdmc+')] opacity-20 z-0 pointer-events-none"></div>
    </div>
  );
};


const AllNewsModal = ({ news, isOpen, onClose, onSelectNews }: { news: Announcement[], isOpen: boolean, onClose: () => void, onSelectNews: (n: Announcement) => void }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[80] p-4 flex items-center justify-center animate-fade-in">
            <div className="w-full max-w-2xl bg-[#050505] border-2 border-pink-500/30 rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_100px_rgba(236,72,153,0.1)]">
                <div className="p-6 border-b border-gray-900 flex justify-between items-center bg-black">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-6 bg-pink-500 rounded-full shadow-[0_0_10px_#ec4899]"></div>
                        <h3 className="text-white font-black text-xl tracking-tight">所有公告清單</h3>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-900 hover:bg-pink-500 rounded-full text-white hover:text-black border border-gray-800 transition-all"><X size={20}/></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    <div className="space-y-1">
                        {news.map((item, idx) => (
                            <button 
                                key={idx}
                                onClick={() => { onSelectNews(item); }}
                                className="w-full flex items-center justify-between py-4 border-b border-gray-900 group text-left px-4 hover:bg-white/5 rounded-2xl transition-all"
                            >
                                <div className="flex items-center gap-4 min-w-0 flex-1">
                                    <span className="text-white font-bold text-sm md:text-base whitespace-nowrap opacity-60 font-mono">{item.date}</span>
                                    <span className="text-gray-200 font-bold text-sm md:text-base truncate group-hover:text-pink-400 transition-colors">
                                        {item.title}
                                    </span>
                                </div>
                                {item.isImportant && (
                                    <span className="ml-4 bg-[#f43f5e] text-white px-3 py-1 rounded-full text-[10px] font-black shadow-[0_0_10px_rgba(244,63,94,0.3)] whitespace-nowrap">
                                        重要
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
// --- 購物流程輪播組件 (已填入您的 7 張圖片) ---
const ShoppingGuide = () => {
  // ✅ 已幫您轉換成正確的直連網址
  const images = [
    "https://i.imgur.com/239DJw6.jpg", 
    "https://i.imgur.com/j76KqeA.jpg",
    "https://i.imgur.com/megTTli.jpg",
    "https://i.imgur.com/Hr88EIy.jpg",
    "https://i.imgur.com/bXInaiN.jpg",
    "https://i.imgur.com/HlR5PEQ.jpg",
    "https://i.imgur.com/7DycaFf.jpg"
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  // 自動輪播邏輯
  useEffect(() => {
    if (isModalOpen) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 4000); 
    return () => clearInterval(timer);
  }, [isModalOpen, images.length]);

  const nextSlide = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevSlide = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  // 手機滑動偵測
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) nextSlide();
    if (isRightSwipe) prevSlide();
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <>
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-8 bg-pink-500 rounded-full shadow-[0_0_15px_#ec4899]"></div>
             <h3 className="text-white font-black text-2xl tracking-tight">購物流程</h3>
          </div>
          <span className="text-pink-500 font-black text-xs uppercase tracking-[0.2em]">SHOPPING GUIDE</span>
        </div>

      <div 
  // 1. aspect-video 改成 aspect-[4/5] (符合您的圖片比例)
  // 2. 加上 max-w-md mx-auto (限制寬度並置中，避免在電腦版變太巨大)
  className="relative group rounded-2xl overflow-hidden border-2 border-pink-500/30 shadow-[0_0_30px_rgba(236,72,153,0.1)] bg-black aspect-[4/5] max-w-md mx-auto cursor-pointer"
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  onClick={() => setIsModalOpen(true)}
>
          {/* 圖片層 */}
          <div className="w-full h-full relative">
             <img 
               src={images[currentIndex]} 
               alt={`Step ${currentIndex + 1}`}
               // 👇 防擋圖機制：加上這個就能顯示 Imgur 圖片
               referrerPolicy="no-referrer"
               className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
             />
             <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60"></div>
             
             <div className="absolute bottom-10 left-0 right-0 text-center">
                <p className="text-white text-xs md:text-sm font-bold tracking-widest uppercase opacity-80">
                   點擊圖片放大檢視
                </p>
             </div>
          </div>

          <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-pink-500"><ChevronRight className="rotate-180 w-6 h-6" /></button>
          <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-pink-500"><ChevronRight className="w-6 h-6" /></button>

          {/* 下方點點導航 */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10 px-4 flex-wrap">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex ? 'w-6 bg-pink-500 shadow-[0_0_10px_#ec4899]' : 'bg-gray-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 放大檢視 Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in" onClick={() => setIsModalOpen(false)}>
          <button className="absolute top-6 right-6 p-3 bg-gray-900 rounded-full text-white hover:bg-pink-500 transition-colors border border-gray-700 z-[110]">
            <X size={24} />
          </button>
          
          <div className="relative w-full max-w-5xl px-4 flex items-center justify-center h-full" onClick={e => e.stopPropagation()}>
             <img 
               src={images[currentIndex]} 
               referrerPolicy="no-referrer"
               className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-gray-800"
               alt="Full size"
             />
             
             <button onClick={prevSlide} className="absolute left-4 p-4 bg-black/50 rounded-full text-white hover:bg-pink-500 transition-all backdrop-blur-sm border border-white/10">
                <ChevronRight className="rotate-180 w-8 h-8" />
             </button>
             <button onClick={nextSlide} className="absolute right-4 p-4 bg-black/50 rounded-full text-white hover:bg-pink-500 transition-all backdrop-blur-sm border border-white/10">
                <ChevronRight className="w-8 h-8" />
             </button>
          </div>
        </div>
      )}
    </>
  );
};
const InfoHub = ({ news, onSelectNews, onOpenAllNews }: { news: Announcement[], onSelectNews: (n: Announcement) => void, onOpenAllNews: () => void }) => {
  
  // 1. 👇 新增邏輯：從公告中過濾掉跑馬燈，只顯示一般公告
  const displayNews = useMemo(() => {
    return news
      .filter(n => !n.title.includes("跑馬燈")) 
      .slice(0, 4);
  }, [news]);

  // 2. 👇 新增邏輯：自動抓取標題有「跑馬燈」的內容
  const marqueeText = useMemo(() => {
    const marqueeItem = news.find(n => n.title.includes("跑馬燈"));
    // 有找到就顯示內容，沒找到就顯示預設文字
    return marqueeItem ? marqueeItem.content : "⚠️ 年末年初日本廠商/集運公司多在放假,商品有可能會發生延誤抵台情形,請大家預留收貨時間。";
  }, [news]);

  return (
    <div className="space-y-12 animate-fade-in-up mt-8 pb-32">
      
      {/* 👇 跑馬燈區塊 (已修改為讀取變數 {marqueeText}) */}
      <div className="relative overflow-hidden bg-black border-2 border-pink-500/50 rounded-2xl py-3 px-4 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
        <div className="whitespace-nowrap flex animate-marquee">
          <span className="text-pink-500 font-bold text-sm md:text-base px-4">
            {marqueeText}
          </span>
          <span className="text-pink-500 font-bold text-sm md:text-base px-4">
            {marqueeText}
          </span>
        </div>
      </div>

      {/* 👇 最新公告區塊 (已修改為讀取過濾後的 displayNews) */}
      <div className="space-y-4 px-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-pink-500 rounded-full shadow-[0_0_15px_#ec4899]"></div>
            <h3 className="text-white font-black text-2xl tracking-tight">最新公告</h3>
          </div>
          <button 
            onClick={onOpenAllNews}
            className="text-pink-500 font-black text-xs uppercase tracking-[0.2em] flex items-center gap-1 hover:opacity-70 transition-opacity"
          >
            ALL NEWS <ChevronRight size={14} />
          </button>
        </div>

        <div className="space-y-1">
          {displayNews.length === 0 ? (
            <div className="text-center py-10 text-gray-700 font-bold italic tracking-widest border border-dashed border-gray-800 rounded-2xl">NO RECENT NEWS</div>
          ) : (
            displayNews.map((item, idx) => (
              <button 
                key={idx}
                onClick={() => onSelectNews(item)}
                className="w-full flex items-center justify-between py-3.5 border-b border-gray-900 group text-left"
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <span className="text-white font-bold text-base md:text-lg whitespace-nowrap">{item.date}</span>
                  <span className="text-gray-200 font-bold text-base md:text-lg truncate group-hover:text-pink-400 transition-colors">
                    {item.title}
                  </span>
                </div>
                {item.isImportant && (
                  <span className="ml-4 bg-[#f43f5e] text-white px-5 py-1.5 rounded-full text-[12px] font-black shadow-[0_0_15px_rgba(244,63,94,0.4)] whitespace-nowrap">
                    重要
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

     {/* 官方傳送門 (已更新為 6 個項目) */}
      <div className="space-y-6 px-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-8 bg-pink-500 rounded-full shadow-[0_0_15px_#ec4899]"></div>
            <h3 className="text-white font-black text-2xl tracking-tight">官方傳送門</h3>
          </div>
          <span className="text-pink-500 font-black text-xs uppercase tracking-[0.2em]">SOCIAL HUB</span>
        </div>
        
        {/* 使用 Grid 排版，手機單欄，平板以上雙欄 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* 1. 🟢 官方 LINE */}
          <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-[#06C755]/30 hover:border-[#06C755] transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-[#06C755] p-3 rounded-xl shadow-[0_0_15px_rgba(6,199,85,0.3)]"><MessageCircle className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">官方 LINE 帳號</span>
                  <span className="text-[#06C755] text-[10px] font-bold uppercase tracking-tighter">Official Line</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-[#06C755] group-hover:translate-x-1 transition-all" />
          </a>

          {/* 2. 🔵 LINE 社群 */}
          <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-blue-500/30 hover:border-blue-500 transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 p-3 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)]"><Star className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">LINE 社群 (商品資訊/喊單區)</span>
                  <span className="text-blue-500 text-[10px] font-bold uppercase tracking-tighter">Open Chat</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </a>

          {/* 3. 🟣 Instagram */}
          <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-[#E1306C]/30 hover:border-[#E1306C] transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-tr from-[#FCAF45] via-[#E1306C] to-[#833AB4] p-3 rounded-xl shadow-[0_0_15px_rgba(225,48,108,0.3)]"><Instagram className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">Instagram</span>
                  <span className="text-[#E1306C] text-[10px] font-bold uppercase tracking-tighter">Follow Us</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-[#E1306C] group-hover:translate-x-1 transition-all" />
          </a>

          {/* 4. ⚫ Threads */}
          <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-white/30 hover:border-white transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-black border border-gray-700 p-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.1)]"><Hash className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">Threads</span>
                  <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">Latest News</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </a>

          {/* 5. 🟠 賣貨便下單賣場 */}
          <a href={APP_CONFIG.MAIHUOBIAN_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-orange-500/30 hover:border-orange-500 transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-orange-600 p-3 rounded-xl shadow-[0_0_15px_rgba(234,88,12,0.3)]"><ShoppingBag className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">賣貨便下單賣場</span>
                  <span className="text-orange-500 text-[10px] font-bold uppercase tracking-tighter">Pre-Order</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
          </a>

           {/* 6. 🔴 賣貨便現貨賣場 */}
           <a href={APP_CONFIG.MAIHUOBIAN_STOCK_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between p-4 rounded-2xl bg-gray-900 border-2 border-red-500/30 hover:border-red-500 transition-all group shadow-lg hover:-translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-red-600 p-3 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)]"><Box className="text-white w-6 h-6" /></div>
              <div className="flex flex-col">
                  <span className="text-white font-black text-lg">賣貨便現貨賣場</span>
                  <span className="text-red-500 text-[10px] font-bold uppercase tracking-tighter">In Stock</span>
              </div>
            </div>
            <ArrowRight className="text-gray-700 group-hover:text-red-500 group-hover:translate-x-1 transition-all" />
          </a>

        </div>
      </div>
      {/* 5. 新增：購物流程輪播 (放在最下面) */}
      <ShoppingGuide />

    </div>
  );
};
const App: React.FC = () => {
  const [mainView, setMainView] = useState<MainView>('query');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [news, setNews] = useState<Announcement[]>([]);
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null);
  const [isAllNewsOpen, setIsAllNewsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // --- 補回：篩選器狀態 ---
  const [cargoFilters, setCargoFilters] = useState<string[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingOrders, setPayingOrders] = useState<Order[]>([]);
  const [modalType, setModalType] = useState<'deposit' | 'shipping'>('deposit');
  
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements().then(setNews);
  }, []);

  // --- 核心篩選邏輯 (Filter logic) (已修復) ---
  const filteredOrders = useMemo(() => {
    return foundOrders.filter(order => {
      const isPending = order.status === OrderStatus.PENDING;
      const isPaid = order.status === OrderStatus.PAID;
      const isArrived = order.shippingStatus.includes("已抵台");
      const isShipped = order.isShipped;
      
      if (activeTab === 'deposit') return isPending;
      if (activeTab === 'balance') return isPaid && isArrived && !isShipped;
      if (activeTab === 'completed') return isPaid && isArrived && isShipped;
      
      // --- 修復：全部 (All) 分頁的進階篩選 ---
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

  // --- 選取狀態與金額計算邏輯 (Selection & Amount logic) ---
  const selectedOrdersData = useMemo(() => {
    return filteredOrders.filter(o => selectedOrderIds.has(o.id));
  }, [filteredOrders, selectedOrderIds]);

  const totalSelectedAmount = useMemo(() => {
    if (activeTab === 'deposit') {
      return selectedOrdersData.reduce((sum, o) => sum + o.depositAmount, 0);
    } else if (activeTab === 'balance') {
      return selectedOrdersData.reduce((sum, o) => sum + o.balanceDue, 0);
    }
    return 0;
  }, [selectedOrdersData, activeTab]);

// --- 正式版搜尋功能 (後端真實搜尋) ---
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery) return;
    
    // 1. 顯示 Loading (真的開始去網路抓了)
    setIsLoading(true);

    // 清空畫面
    setFoundOrders([]);
    setSelectedOrderIds(new Set());
    setCargoFilters([]);
    setDeliveryFilter(null);
    
    try {
      // 2. 呼叫 API (這行會等待 1.5 ~ 3 秒，視 Google 狀況而定)
      const results = await fetchOrdersFromSheet(searchQuery);
      
      setFoundOrders(results);
      setHasSearched(true);
      
      // 智慧切換 Tab
      const hasPending = results.some(o => o.status === OrderStatus.PENDING);
      if (hasPending) setActiveTab('deposit');
      else setActiveTab('all');

    } catch (error: any) {
      console.error(error);
    } finally {
      // 3. 抓完資料 (或失敗)，關閉 Loading
      setIsLoading(false);
    }
  };

  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  // --- 全選本頁邏輯 (Select All logic) ---
  const handleSelectAll = () => {
    const currentIds = filteredOrders.map(o => o.id);
    const areAllSelected = currentIds.every(id => selectedOrderIds.has(id));
    
    if (areAllSelected) {
      const newSet = new Set(selectedOrderIds);
      currentIds.forEach(id => newSet.delete(id));
      setSelectedOrderIds(newSet);
    } else {
      const newSet = new Set(selectedOrderIds);
      currentIds.forEach(id => newSet.add(id));
      setSelectedOrderIds(newSet);
    }
  };

  // --- 補回：篩選切換函式 ---
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

  const openPaymentModal = () => {
    if (selectedOrdersData.length === 0) return;
    setPayingOrders(selectedOrdersData);
    setModalType(activeTab === 'deposit' ? 'deposit' : 'shipping');
    setIsPaymentModalOpen(true);
  };

  const footerContent = (
    <footer className="pt-12 pb-8 text-center text-gray-600 text-[11px] font-bold space-y-2 opacity-70">
      <div className="footer text-gray-500 font-black">
        本網頁由 Kaguyaさま日本動漫周邊代購 設計 <br /> 統編：60071756
      </div>
      <p className="mt-2">© {new Date().getFullYear()} All Rights Reserved.</p>
      <button onClick={() => setIsAdminOpen(true)} className="mt-4 opacity-20"><Lock size={12}/></button>
    </footer>
  );

  return (
    <div className="min-h-screen font-sans pb-40 text-white selection:bg-pink-500 relative flex flex-col">
      {isLoading && <LoadingOverlay />}
      
      {/* 導覽列 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 flex bg-black/40 backdrop-blur-md p-1 rounded-full border border-gray-800 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        <button 
          onClick={() => { setMainView('query'); setHasSearched(false); }} 
          className={`px-4 md:px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${mainView === 'query' ? 'bg-pink-500 text-black shadow-[0_0_10px_#ec4899]' : 'text-gray-500'}`}
        >
          訂單查詢
        </button>
        <button 
          onClick={() => setMainView('info')} 
          className={`px-4 md:px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${mainView === 'info' ? 'bg-pink-500 text-black shadow-[0_0_10px_#ec4899]' : 'text-gray-500'}`}
        >
          官方資訊
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 w-full flex-1 pt-16">
        {mainView === 'query' ? (
          <>
            {!hasSearched ? (
              <div className="flex flex-col items-center animate-fade-in-up">
                <div className="mt-8 mb-6 relative">
                  <div className="bg-black p-4 rounded-2xl border-2 border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.3)] relative z-10">
                     <img src="https://duk.tw/ZhYY5L.png" alt="Logo" className="w-24 h-24 object-contain" />
                  </div>
                </div>
                <h1 
                  className="text-4xl md:text-6xl font-[900] text-white mb-2 text-center"
                  style={{ 
                    textShadow: '0 0 10px rgba(255, 0, 127, 0.5)',
                    fontFamily: "'Arial Black', 'Heiti TC', sans-serif",
                    letterSpacing: '1px'
                  }}
                >
                  自助查詢訂單系統
                </h1>
                <p className="text-pink-500 text-base font-bold tracking-[0.2em] italic uppercase mb-12">KAGUYA日本動漫周邊專業代購</p>
                <div className="w-full max-w-xl bg-black/40 rounded-[2.5rem] border-2 border-pink-500/50 p-8 md:p-10 relative mb-8 shadow-inner">
                  <p className="text-gray-300 text-sm text-center font-bold mb-10 leading-relaxed">
                   本查詢系統提供 Kaguyaさま 的顧客們更輕鬆便利的一站式訂單查詢體驗，從付款、貨況查詢到抵台下單出貨，所有流程都可以簡單完成！希望大家可以開心購物！
                  </p>
                  <div className="space-y-4">
                    <button 
                      onClick={() => { handleSearch(); setActiveTab('deposit'); }} 
                      className="w-full bg-gray-900/80 border-2 border-gray-800 p-4 rounded-2xl flex items-center justify-center gap-3 group hover:border-[#FF007F] hover:shadow-[0_0_20px_rgba(255,0,127,0.3)] transition-all"
                    >
                      <MessageCircle className="text-pink-500" />
                      <span className="text-gray-400 font-bold">付款請查</span>
                      <span className="text-pink-500 font-black">待付款訂單</span>
                    </button>
                    <button 
                      onClick={() => { handleSearch(); setActiveTab('balance'); }} 
                      className="w-full bg-gray-900/80 border-2 border-gray-800 p-4 rounded-2xl flex items-center justify-center gap-3 group hover:border-[#00FF7F] hover:shadow-[0_0_20px_rgba(0,255,127,0.3)] transition-all"
                    >
                      <Truck className="text-[#06C755]" />
                      <span className="text-gray-400 font-bold">已抵台下單請查</span>
                      <span className="text-[#06C755] font-black">可出貨訂單</span>
                    </button>
                  </div>
                </div>
                <div className="w-full max-w-xl">
                   <div className="bg-black rounded-3xl p-2 flex items-center gap-2 border-2 border-pink-500 ring-4 ring-pink-500/20">
                    <div className="relative flex-1">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-500" />
                     <input 
                       type="text" 
                       value={searchQuery} 
                       onChange={e => setSearchQuery(e.target.value)} 
                       placeholder="請輸入您的完整社群暱稱" 
                       className="w-full pl-14 pr-4 py-4 bg-transparent outline-none text-lg font-bold text-white placeholder-gray-400" 
                       // 👇 修改這裡：加上 !(e.nativeEvent as any).isComposing
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
                           handleSearch();
                         }
                       }} 
                       />
                    </div>
                    <button onClick={() => handleSearch()} className="bg-pink-500 text-black p-3 rounded-2xl font-black min-w-[60px] flex items-center justify-center"><ArrowRight /></button>
                  </div>
                  {/* 新增小提醒 */}
                  <p className="text-pink-500 text-sm md:text-base font-bold mt-3 text-center drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]">
                     若有更改社群暱稱，請務必私訊官賴協助修改，否則查不到訂單喔！
                  </p>
                </div>
                {footerContent}
              </div>
            ) : (
              <div className="animate-fade-in space-y-6 pt-4">
                {/* 搜尋列還原 */}
                <div className="bg-black rounded-3xl p-2 flex items-center gap-2 border-2 border-pink-500 ring-4 ring-pink-500/20 mb-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-pink-500 w-5 h-5" />
                     <input 
                      type="text" 
                       value={searchQuery} 
                       onChange={e => setSearchQuery(e.target.value)} 
                       className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-base font-bold text-white" 
                       // 👇 修改這裡：加上 !(e.nativeEvent as any).isComposing
                       onKeyDown={(e) => {
                         if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) {
                           handleSearch();
                         }
                       }} 
                       />
                    </div>
                    <button onClick={() => handleSearch()} className="bg-pink-500 text-black p-2 rounded-xl min-w-[50px] flex items-center justify-center"><ArrowRight size={20}/></button>
                </div>

                {/* 篩選標籤還原 (Filter Tabs) */}
                <div className="flex justify-center gap-1 overflow-x-auto pb-4 no-scrollbar">
                  {[
                    { id: 'deposit', label: '待付款訂單' }, 
                    { id: 'balance', label: '可出貨訂單' }, 
                    { id: 'completed', label: '已完成' }, 
                    { id: 'all', label: '全部' }
                  ].map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => { 
                        setActiveTab(tab.id as TabType); 
                        setSelectedOrderIds(new Set()); 
                        // 重置篩選
                        if(tab.id !== 'all') {
                            setCargoFilters([]);
                            setDeliveryFilter(null);
                        }
                      }} 
                      className={`px-4 py-2 rounded-full font-black whitespace-nowrap transition-all border-2 text-[11px] uppercase tracking-widest ${activeTab === tab.id ? 'bg-pink-500 text-black border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'bg-transparent text-gray-500 border-gray-800 hover:border-pink-500/50'}`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* --- 補回：全部 (All) 分頁的篩選按鈕介面 --- */}
                {activeTab === 'all' && (
                    <div className="bg-gray-900/50 border-2 border-gray-700 rounded-3xl p-6 mb-6">
                        <div className="mb-6">
                            <h4 className="text-pink-400 font-black text-xs uppercase mb-3 flex items-center gap-2">
                                <Box className="w-4 h-4" /> 貨況篩選
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {ITEM_STATUS_OPTIONS.map(status => {
                                    const isSelected = cargoFilters.includes(status);
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => toggleCargoFilter(status)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-2 ${
                                                isSelected 
                                                ? 'bg-pink-500 text-black border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)] scale-105' 
                                                : 'bg-black text-gray-400 border-gray-700 hover:border-gray-500'
                                            }`}
                                        >
                                            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                                            {status}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[#06C755] font-black text-xs uppercase mb-3 flex items-center gap-2">
                                <Truck className="w-4 h-4" /> 出貨篩選
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {DELIVERY_STATUS_OPTIONS.map(status => {
                                    const isSelected = deliveryFilter === status;
                                    return (
                                        <button
                                            key={status}
                                            onClick={() => toggleDeliveryFilter(status)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold border-2 transition-all flex items-center gap-2 ${
                                                isSelected 
                                                ? 'bg-[#06C755] text-white border-[#06C755] shadow-[0_0_10px_rgba(6,199,85,0.5)] scale-105' 
                                                : 'bg-black text-gray-400 border-gray-700 hover:border-gray-500'
                                            }`}
                                        >
                                            {isSelected ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                                            {status}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* 全選按鈕 (Select All) */}
                {(activeTab === 'deposit' || activeTab === 'balance') && filteredOrders.length > 0 && (
                  <div className="flex justify-end px-2 mb-2">
                    <button 
                      onClick={handleSelectAll}
                      className="flex items-center gap-2 text-[10px] font-black text-gray-500 hover:text-pink-500 uppercase tracking-widest transition-colors"
                    >
                      {filteredOrders.every(o => selectedOrderIds.has(o.id)) ? <CheckSquare size={14} className="text-pink-500" /> : <Square size={14} />}
                      全選本頁 ({filteredOrders.length})
                    </button>
                  </div>
                )}

                {/* 訂單列表 */}
                <div className="space-y-4">
                  {filteredOrders.length === 0 ? <div className="text-center py-20 text-gray-500 font-bold italic">沒有找到符合的訂單</div> : (
                    filteredOrders.map(order => (
                      <div 
                        key={order.id} 
                        onClick={() => { setSelectedDetailOrder(order); setIsDetailModalOpen(true); }} 
                        className={`bg-[#0a0a0a] border-2 rounded-3xl p-5 cursor-pointer transition-all hover:bg-[#111] ${selectedOrderIds.has(order.id) ? 'border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.1)]' : 'border-gray-800'}`}
                      >
                        <div className="flex items-center gap-4 relative z-10">
                          {(activeTab === 'deposit' || activeTab === 'balance') && (
                            <div 
                              onClick={e => { e.stopPropagation(); toggleOrderSelection(order.id); }} 
                              className={`w-8 h-8 rounded-xl flex items-center justify-center border-2 transition-all shrink-0 ${selectedOrderIds.has(order.id) ? 'bg-pink-500 border-pink-500 text-black shadow-[0_0_10px_rgba(236,72,153,0.4)]' : 'bg-black border-gray-700 text-transparent'}`}
                            >
                              <Check size={20} strokeWidth={4} />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            {/* 補回：卡片上的狀態標籤 */}
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

                            <h3 className="text-lg font-bold text-white truncate">{order.groupName}</h3>
                            <div className="flex justify-between items-end mt-3">
                                <span className="text-gray-600 text-[10px] font-bold bg-gray-900/50 px-2 py-1 rounded border border-gray-800/50">共 {order.totalQuantity} 件商品</span>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 font-bold mb-0.5">{activeTab === 'deposit' ? '應付訂金' : activeTab === 'balance' ? '應付餘款' : '商品總額'}</p>
                                    <p className="text-2xl font-black text-pink-500 tracking-tighter">${(activeTab === 'deposit' ? order.depositAmount : activeTab === 'balance' ? order.balanceDue : order.productTotal).toLocaleString()}</p>
                                </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {footerContent}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col">
            <InfoHub 
              news={news} 
              onSelectNews={setSelectedNews} 
              onOpenAllNews={() => setIsAllNewsOpen(true)} 
            />
            {footerContent}
          </div>
        )}
      </div>

      {/* 底部操作列 (Action Bar) */}
      {selectedOrdersData.length > 0 && (activeTab === 'deposit' || activeTab === 'balance') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur-2xl border-t-2 border-pink-500 z-40 animate-fade-in-up shadow-[0_-10px_50px_rgba(236,72,153,0.2)]">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1">已選 {selectedOrdersData.length} 筆訂單</p>
              <div className="flex items-baseline gap-1">
                <span className="text-pink-500 font-black text-xl">$</span>
                <span className="text-3xl md:text-4xl font-black text-white tracking-tighter">{totalSelectedAmount.toLocaleString()}</span>
              </div>
            </div>
            <button 
              onClick={openPaymentModal}
              className={`flex-1 md:flex-none md:min-w-[200px] py-4 rounded-2xl font-black text-lg border-2 shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${activeTab === 'deposit' ? 'bg-[#06C755] text-white border-[#06C755] shadow-[0_0_20px_rgba(6,199,85,0.4)]' : 'bg-pink-500 text-black border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]'}`}
            >
              {activeTab === 'deposit' ? (
                <><MessageCircle size={20}/> 官方LINE付款</>
              ) : (
                <><Truck size={20}/> 賣貨便下單</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 所有的彈窗元件 */}
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} orders={payingOrders} totalAmount={totalSelectedAmount} type={modalType} />
      <OrderDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} order={selectedDetailOrder} />
      <AdminDashboard isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />
      <NewsModal news={selectedNews} isOpen={!!selectedNews} onClose={() => setSelectedNews(null)} />
      <AllNewsModal 
        news={news} 
        isOpen={isAllNewsOpen} 
        onClose={() => setIsAllNewsOpen(false)} 
        onSelectNews={(n) => { setSelectedNews(n); setIsAllNewsOpen(false); }} 
      />
    </div>
  );
};

export default App;

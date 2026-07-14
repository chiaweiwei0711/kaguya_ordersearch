import React, { useState, useMemo, useEffect } from 'react';
import { Search, ArrowRight, Check, MessageCircle, Truck, Box, Sparkles, Star, Instagram, ShoppingBag, Lock, CheckSquare, Square, ChevronRight, Hash, X, CheckCircle2, Circle, Menu, ExternalLink, Heart, ChevronLeft, AlarmClock } from 'lucide-react';
import { Order, OrderStatus, Announcement, GroupTeam, GroupProduct } from './types';
import PaymentModal from './components/PaymentModal';
import OrderDetailModal from './components/OrderDetailModal';
import AdminDashboard from './components/AdminDashboard';
import NewsModal from './components/NewsModal';
import { fetchOrdersFromSheet, fetchAnnouncements, fetchNicknameByLineId, incrementAnnouncementLike } from './services/googleSheetService';
import liff from '@line/liff';
import { APP_CONFIG } from './config';

// 👇 1. 引入極光
import Aurora from './components/Aurora';
import AboutSection from './components/AboutSection';
import GroupOrderList from './components/GroupOrderList';
import ClosingList from './components/ClosingList';
import FaqSection from './components/FaqSection';
import OrderForm from './components/OrderForm';
import OrderLookup from './components/OrderLookup';
import { fetchTeams, closingSoon, fmtMDHM } from './services/groupOrderService';

// --- 類型定義 ---
type MainView = 'query' | 'info' | 'about' | 'order' | 'faq' | 'closing';
type TabType = 'deposit' | 'balance' | 'completed' | 'all';

// --- 📅 倉儲倒數計算核心邏輯 (Soft Pop 無黑框撞色進化版) ---
const getStorageStatus = (dateStr?: string) => {
  if (!dateStr) return null;
  const arrival = new Date(dateStr);
  const today = new Date();
  const diffTime = today.getTime() - arrival.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const LIMIT_DAYS = 25;
  const daysLeft = LIMIT_DAYS - diffDays;

  if (daysLeft < 0) {
    // 逾期：粉紅底 `#f8a3f4` 配白字 (緊急！)
    return { label: `逾期 ${Math.abs(daysLeft)} 天`, className: 'bg-[#f8a3f4] text-white' };
  } else if (daysLeft <= 5) {
    // 警告：亮黃底 `#fff170` 配黑字 (請盡快)
    return { label: `剩 ${daysLeft} 天過期`, className: 'bg-[#fff170] text-black' };
  } else {
    // 良好：薄荷綠底 `#3ac0bf` 配白字 (可併單)
    return { label: `剩 ${daysLeft} 天可併單`, className: 'bg-[#3ac0bf] text-white' };
  }
};

// --- 篩選選項 ---
const ITEM_STATUS_OPTIONS = ['已登記', '已訂購', '日方發貨', '轉送中', '已抵台'];
const DELIVERY_STATUS_OPTIONS = ['已出貨', '尚未出貨'];

// // --- 全新 Soft Pop 風格：跳跳音浪 Loading 動畫 ---
const LoadingOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#fdfbf0]/80 backdrop-blur-sm animate-fade-in">
      {/* 音浪/小蚯蚓跳動區塊 */}
      <div className="flex items-center justify-center gap-2.5 h-16">
        <div className="w-3 h-8 bg-[#f8a3f4] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-12 bg-[#3ac0bf] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '100ms' }}></div>
        <div className="w-3 h-6 bg-[#4c59a1] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '200ms' }}></div>
        <div className="w-3 h-10 bg-[#fff170] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }}></div>
        <div className="w-3 h-8 bg-[#f8a3f4] rounded-full animate-bounce shadow-sm" style={{ animationDelay: '400ms' }}></div>
      </div>

      {/* 提示文字 */}
      <p className="mt-6 text-[#4c59a1] font-[900] tracking-widest text-sm animate-pulse">
        KAGUYA 努力為您尋找中...
      </p>
    </div>
  );
};

// --- 🎨 2.0 進化版：立體浮游糖果點點資料 (網格生成確保均勻，含動畫參數) ---
const DOT_COLORS = ['#4ceade', '#77dbf1', '#ffaefe', '#eeda22'];
const COLS = 8; // 橫向 8 列
const ROWS = 8; // 縱向 8 行
const TOTAL_DOTS = COLS * ROWS; // 總共 64 顆，絕對夠多！
const CELL_WIDTH = 100 / COLS;
const CELL_HEIGHT = 100 / ROWS;

const BACKGROUND_DOTS = Array.from({ length: TOTAL_DOTS }).map((_, i) => {
  const col = i % COLS;
  const row = Math.floor(i / COLS);

  // 🎯 網格均勻散落魔法：在每個網格格子里隨機定位，確保整體均勻但看起來不呆板
  const top = `${row * CELL_HEIGHT + (Math.random() * (CELL_HEIGHT - 2)) + 1}%`;
  const left = `${col * CELL_WIDTH + (Math.random() * (CELL_WIDTH - 2)) + 1}%`;

  return {
    id: i,
    top,
    left,
    size: 16, // 🎯 聽老闆的，大小統一 16px
    color: DOT_COLORS[i % DOT_COLORS.length],
    opacity: 0.9, // 🎯 聽老闆的，超級清晰飽和
    // 🌀 為每一顆點點生成隨機的動畫延遲和時間，看起來更自然
    delay: `${Math.random() * 5}s`,
    duration: `${15 + Math.random() * 10}s`, // 15s 到 25s 緩慢浮游
    animType: Math.random() > 0.5 ? 'floatA' : 'floatB' // 兩種不同的浮游路徑
  };
});

// 🌀 注入微微移動的 CSS 動畫 (放在元件外面即可)
const injectAnimationCSS = () => {
  if (typeof document === 'undefined') return;
  const styleId = 'kaguya-dots-animation';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    @keyframes floatA {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-8px, 6px); }
      50% { transform: translate(6px, -8px); }
      75% { transform: translate(-4px, -4px); }
    }
    @keyframes floatB {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(8px, -6px); }
      50% { transform: translate(-6px, 8px); }
      75% { transform: translate(4px, 4px); }
    }
    .animate-float {
      animation-iteration-count: infinite;
      animation-timing-function: ease-in-out;
    }
  `;
  document.head.appendChild(style);
};
injectAnimationCSS(); // 執行注入



// --- 主應用程式 ---
const App: React.FC = () => {
  const [mainView, setMainView] = useState<MainView>('query');
  const [searchQuery, setSearchQuery] = useState('');
  const [foundOrders, setFoundOrders] = useState<Order[]>([]);
  const [news, setNews] = useState<Announcement[]>([]);
  const [selectedNews, setSelectedNews] = useState<Announcement | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('deposit');
  const [visibleLimit, setVisibleLimit] = useState(10); // 🎯 控制目前顯示幾筆訂單
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [cargoFilters, setCargoFilters] = useState<string[]>([]);
  const [deliveryFilter, setDeliveryFilter] = useState<string | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payingOrders, setPayingOrders] = useState<Order[]>([]);
  const [modalType, setModalType] = useState<'deposit' | 'shipping'>('deposit');
  const [payingTotal, setPayingTotal] = useState(0);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // 💖 愛心計數器專用狀態 
  const [currentLikes, setCurrentLikes] = useState(0);
  const [hasLikedNews, setHasLikedNews] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // ── 開團訂購 ──
  const [teams, setTeams] = useState<GroupTeam[]>([]);
  const [groupProducts, setGroupProducts] = useState<GroupProduct[]>([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [showLookup, setShowLookup] = useState(false); // 填單明細查詢
  const [lookupInitialNick, setLookupInitialNick] = useState(''); // 從填單成功頁帶入的暱稱

  // 載入時抓一次開團資料（首頁卡片＋列表共用）
  useEffect(() => {
    setTeamsLoading(true);
    fetchTeams()
      .then(({ teams, products }) => { setTeams(teams); setGroupProducts(products); })
      .finally(() => setTeamsLoading(false));
  }, []);

  // hash 路由：#/order = 列表、#/order/<團代號> = 填單（支援外部直接連結）
  useEffect(() => {
    const applyHash = () => {
      if (window.location.hash.startsWith('#/closing')) { setMainView('closing'); setSelectedTeamCode(null); return; }
      const m = window.location.hash.match(/^#\/order(?:\/([^/?]+))?/);
      if (m) { setMainView('order'); setSelectedTeamCode(m[1] ? decodeURIComponent(m[1]) : null); }
      else { setMainView((mv) => (mv === 'order' || mv === 'closing' ? 'query' : mv)); setSelectedTeamCode(null); }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  // 今日／明日結單的團（首頁「結單倒數」橫幅用；今日排前面）
  const closingTeams = useMemo(() => {
    const list = teams
      .map((t) => ({ team: t, when: closingSoon(t) }))
      .filter((x): x is { team: GroupTeam; when: 'today' | 'tomorrow' } => x.when !== null);
    return list.sort((a, b) => (a.when === b.when ? 0 : a.when === 'today' ? -1 : 1));
  }, [teams]);

  const goOrderList = () => { setMainView('order'); setSelectedTeamCode(null); setIsMenuOpen(false); window.location.hash = '#/order'; window.scrollTo(0, 0); };
  const goOrderTeam = (code: string) => { setSelectedTeamCode(code); window.location.hash = '#/order/' + code; window.scrollTo(0, 0); };
  const goClosing = () => { setMainView('closing'); window.location.hash = '#/closing'; window.scrollTo(0, 0); };
  const exitOrderToQuery = () => { setSelectedTeamCode(null); setMainView('query'); setHasSearched(false); if (window.location.hash) window.location.hash = ''; window.scrollTo(0, 0); };

  useEffect(() => {
    if (selectedNews) {
      // 點進公告時，只讀取表單傳來的真實數字，絕對不查手機記憶！
      setCurrentLikes(selectedNews.likes || 0);
    }
  }, [selectedNews]);

  const handleLikeNews = async () => {
    if (!selectedNews) return;

    // 1. 畫面數字立刻 +1，並觸發超快彈跳動畫 (讓客人享受狂按的快感)
    setCurrentLikes(prev => prev + 1);
    setIsBouncing(true);
    setTimeout(() => setIsBouncing(false), 150);

    // 2. 在背景偷偷呼叫 API 寫入表單
    try {
      await incrementAnnouncementLike(selectedNews.id);
    } catch (e) {
      console.error('更新愛心失敗:', e);
    }
  };

  // 📊 模擬訪問量統計 (讓網頁感覺有熱度)
  // 🌟 二次搜尋與排序狀態
  const [subQuery, setSubQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price_desc' | 'price_asc' | 'strokes'>('default');


  // LIFF 自動登入查單時的過場頁。只有「查單首頁＋真的登入了」才蓋，
  // 填單頁(#/order)、明日結單(#/closing)、或沒登入都不跳（不然客人點填單連結也被蓋、還是假的）
  const [liffBoot, setLiffBoot] = useState(false);

  // 🌟 【核武器啟動】：LIFF 自動登入與初始化 (精準抓蟲版)
  useEffect(() => {
    const initApp = async () => {
      fetchAnnouncements().then(setNews);

      try {
        await liff.init({ liffId: '2009367290-DGz77pHN' });

        const h = window.location.hash || '';
        const isOrderOrClosing = h.indexOf('#/order') === 0 || h.indexOf('#/closing') === 0;

        // 唯一該自動查單的情境：透過 LIFF（查訂單按鈕）進到查單首頁、且已登入
        if (liff.isLoggedIn() && !isOrderOrClosing) {
          setLiffBoot(true);
          const bootSafety = setTimeout(() => setLiffBoot(false), 15000); // LIFF 卡死的保險絲
          try {
            const profile = await liff.getProfile();
            const nickname = await fetchNicknameByLineId(profile.userId);
            if (nickname) {
              setSearchQuery(nickname);
              await executeSearch(nickname);
            } else {
              // 🚨 如果後台沒回傳暱稱，我們直接把手機的 LINE ID 印出來對答案！
              alert("❌ 系統有抓到您的 LINE，但表單沒查到暱稱！\n請核對會員資料B欄有沒有這串ID：\n" + profile.userId);
            }
          } finally {
            clearTimeout(bootSafety);
            setLiffBoot(false);
          }
        }
      } catch (err: any) {
        // 🚨 把原本笨笨的 JSON.stringify 換掉，逼它吐出真正的英文死因！
        alert("⚠️ LIFF 錯誤：\n" + (err.message || String(err)));
        setLiffBoot(false);
      }
    };
    initApp();
  }, []);
  const filteredOrders = useMemo(() => {
    let result = foundOrders.filter(order => {
      const isPending = order.status === OrderStatus.PENDING;
      const isPaid = order.status === OrderStatus.PAID;
      const isArrived = order.shippingStatus.includes("已抵台");
      const isShipped = order.isShipped;

      if (activeTab === 'deposit') { if (!isPending) return false; }
      else if (activeTab === 'balance') { if (!(isPaid && isArrived && !isShipped)) return false; }
      else if (activeTab === 'completed') { if (!(isPaid && isArrived && isShipped)) return false; }
      else if (activeTab === 'all') {
        let matchesCargo = true;
        if (cargoFilters.length > 0) matchesCargo = cargoFilters.some(f => order.shippingStatus && order.shippingStatus.includes(f));
        let matchesDelivery = true;
        if (deliveryFilter) matchesDelivery = deliveryFilter === '已出貨' ? order.isShipped : !order.isShipped;
        if (!matchesCargo || !matchesDelivery) return false;
      }

      // 🌟 二次搜尋邏輯
      if (subQuery.trim()) {
        const q = subQuery.toLowerCase();
        const matchGroup = order.groupName.toLowerCase().includes(q);
        const matchItems = order.items.some(item => item.name.toLowerCase().includes(q));
        if (!matchGroup && !matchItems) return false;
      }
      return true;
    });

    // 🌟 排序邏輯
    if (sortBy === 'price_desc') {
      result.sort((a, b) => {
        const priceA = activeTab === 'deposit' ? a.depositAmount : (activeTab === 'balance' ? a.balanceDue : a.productTotal);
        const priceB = activeTab === 'deposit' ? b.depositAmount : (activeTab === 'balance' ? b.balanceDue : b.productTotal);
        return priceB - priceA;
      });
    } else if (sortBy === 'price_asc') {
      result.sort((a, b) => {
        const priceA = activeTab === 'deposit' ? a.depositAmount : (activeTab === 'balance' ? a.balanceDue : a.productTotal);
        const priceB = activeTab === 'deposit' ? b.depositAmount : (activeTab === 'balance' ? b.balanceDue : b.productTotal);
        return priceA - priceB;
      });
    } else if (sortBy === 'strokes') {
      result.sort((a, b) => a.groupName.localeCompare(b.groupName, 'zh-TW'));
    }
    return result;
  }, [foundOrders, activeTab, cargoFilters, deliveryFilter, subQuery, sortBy]);

  const selectedOrdersData = useMemo(() => filteredOrders.filter(o => selectedOrderIds.has(o.id)), [filteredOrders, selectedOrderIds]);
  const totalSelectedAmount = useMemo(() => {
    if (activeTab === 'deposit') return selectedOrdersData.reduce((sum, o) => sum + o.depositAmount, 0);
    if (activeTab === 'balance') return selectedOrdersData.reduce((sum, o) => sum + o.balanceDue, 0);
    return 0;
  }, [selectedOrdersData, activeTab]);

  // 🌟 1. 自動搜尋的大腦：讓程式可以自己呼叫並帶入暱稱
  const executeSearch = async (queryToSearch: string) => {
    if (!queryToSearch) return;
    setIsLoading(true);
    setFoundOrders([]); setSelectedOrderIds(new Set()); setCargoFilters([]); setDeliveryFilter(null);
    setSubQuery(''); setSortBy('default');
    try {
      const results = await fetchOrdersFromSheet(queryToSearch);
      setFoundOrders(results);
      setHasSearched(true);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
      const hasPending = results.some(o => o.status === OrderStatus.PENDING);
      const hasReadyToShip = results.some(o => o.status === OrderStatus.PAID && o.shippingStatus.includes("已抵台") && !o.isShipped);
      if (hasPending) setActiveTab('deposit');
      else if (hasReadyToShip) setActiveTab('balance');
      else setActiveTab('all');
    } catch (error: any) { console.error(error); } finally { setIsLoading(false); }
  };

  // 🌟 2. 手動搜尋的按鈕：給客人手動按 Enter 或點擊箭頭用的
  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    executeSearch(searchQuery);
  };

  const toggleOrderSelection = (id: string) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedOrderIds(newSet);
  };

  const handleSelectAll = () => {
    const currentIds = filteredOrders.map(o => o.id);
    const areAllSelected = currentIds.every(id => selectedOrderIds.has(id));
    if (areAllSelected) { const newSet = new Set(selectedOrderIds); currentIds.forEach(id => newSet.delete(id)); setSelectedOrderIds(newSet); }
    else { const newSet = new Set(selectedOrderIds); currentIds.forEach(id => newSet.add(id)); setSelectedOrderIds(newSet); }
  };

  const toggleCargoFilter = (filter: string) => setCargoFilters(prev => prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]);
  const toggleDeliveryFilter = (filter: string) => setDeliveryFilter(prev => prev === filter ? null : filter);
  const openPaymentModal = () => { if (selectedOrdersData.length === 0) return; setPayingOrders(selectedOrdersData); setPayingTotal(totalSelectedAmount); setModalType(activeTab === 'deposit' ? 'deposit' : 'shipping'); setIsPaymentModalOpen(true); };
  // 從訂單詳情頁付單一張：待付款→付訂金；可出貨→賣貨便付尾款（依訂單狀態，不看目前分頁）
  const payOneOrder = (order: Order) => {
    const isPending = order.status !== OrderStatus.PAID;
    setPayingOrders([order]);
    setPayingTotal(isPending ? order.depositAmount : order.balanceDue);
    setModalType(isPending ? 'deposit' : 'shipping');
    setIsDetailModalOpen(false);
    setIsPaymentModalOpen(true);
  };

  const footerContent = (
    <footer className="pt-12 pb-8 text-center text-gray-600 text-[11px] font-bold space-y-2 opacity-70">
      <div className="footer text-gray-500 font-black">本網頁由 Kaguyaさま日本動漫周邊代購 設計 <br /> 統編：60071756</div>
      <p className="mt-2">© {new Date().getFullYear()} All Rights Reserved.</p>
      <button onClick={() => setIsAdminOpen(true)} className="mt-4 opacity-20"><Lock size={12} /></button>
    </footer>
  );

  return (
    // 🎯 1. 最外層深藍色背景
    <div className="min-h-screen font-sans text-black selection:bg-[#e891d4] relative bg-[#4c59a1] flex justify-center overflow-x-hidden">
      {/* 🎯 全新加入：靜態糖果色背景圓點 (放底層不擋點擊) */}
      {mainView === 'query' && !hasSearched && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {BACKGROUND_DOTS.map(dot => (
            <div
              key={dot.id}
              // 🌀 加入 animate-float 類名
              className={`absolute rounded-full animate-float ${dot.animType === 'floatA' ? 'animate-[floatA]' : 'animate-[floatB]'}`}
              style={{
                top: dot.top,
                left: dot.left,
                width: `${dot.size}px`,
                height: `${dot.size}px`,
                backgroundColor: dot.color,
                opacity: dot.opacity,
                // 🌀 注入隨機的動畫時間和延遲，創造層次感
                animationDuration: dot.duration,
                animationDelay: dot.delay,
                // 加上微微的立體陰影，質感更好
                boxShadow: 'inset -2px -2px 4px rgba(0,0,0,0.2), 2px 2px 5px rgba(0,0,0,0.1)'
              }}
            />
          ))}
        </div>
      )}
      {isLoading && <LoadingOverlay />}

      {/* LINE 內開啟的自動登入過場：蓋住 liff.init→查綁定→自動查單的空白期 */}
      {liffBoot && (
        <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-[#4c59a1]">
          <div className="flex items-center justify-center gap-2.5 h-16">
            <div className="w-3 h-8 bg-[#f8a3f4] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-3 h-12 bg-[#3ac0bf] rounded-full animate-bounce" style={{ animationDelay: '100ms' }}></div>
            <div className="w-3 h-6 bg-[#fff170] rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
            <div className="w-3 h-10 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <p className="text-white font-[900] text-lg tracking-widest mt-6">LINE 自動登入中</p>
          <p className="text-[#fff170] font-[900] text-sm tracking-widest mt-2">正在為您查詢訂單，請稍候…</p>
        </div>
      )}
      {/* 🎯 2. 左上角 MENU 按鈕 (💡 聽老闆的：只有在「未搜尋」的首頁才顯示，不擋路！) */}
      {!hasSearched && mainView !== 'order' && mainView !== 'faq' && mainView !== 'about' && mainView !== 'closing' && (
        <button
          onClick={() => setIsMenuOpen(true)}
          className="fixed top-6 left-6 z-40 bg-[#3ac0bf] border-2 border-[#3be4d6] text-white font-[900] text-sm tracking-widest px-5 py-2.5 rounded-full shadow-[0_4px_10px_rgba(0,0,0,0.2)] transition-transform active:scale-95 hover:bg-[#34adab]"
        >
          MENU
        </button>
      )}

      {/* 全新全螢幕 MENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[100] bg-[#c3ccfd] flex flex-col items-center justify-center animate-fade-in">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 left-8 bg-[#3ac0bf] text-white font-[900] text-xl tracking-widest px-6 py-2 rounded-full shadow-md active:scale-95 transition-transform hover:bg-[#34adab]"
          >
            CLOSE
          </button>

          <div className="flex flex-col items-center gap-10 text-[#4c59a1] font-[900] text-4xl tracking-widest">
            <button onClick={() => { setMainView('query'); setHasSearched(false); setIsMenuOpen(false); if (window.location.hash) window.location.hash = ''; window.scrollTo(0, 0); }} className="hover:scale-110 active:scale-95 transition-transform">訂單查詢</button>
            <button onClick={goOrderList} className="hover:scale-110 active:scale-95 transition-transform">預購填單</button>
            {/* 🎯 錨點：滑動到首頁 NEWS 區塊 */}
            <button onClick={() => {
              setMainView('query');
              setHasSearched(false);
              setIsMenuOpen(false);
              setTimeout(() => document.getElementById('news-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }} className="hover:scale-110 active:scale-95 transition-transform">最新公告</button>
            {/* 🎯 錨點：滑動到首頁 SNS 區塊 */}
            <button onClick={() => {
              setMainView('query');
              setHasSearched(false);
              setIsMenuOpen(false);
              setTimeout(() => document.getElementById('sns-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
            }} className="hover:scale-110 active:scale-95 transition-transform">連結專區</button>
            <button onClick={() => { setMainView('about'); setIsMenuOpen(false); }} className="hover:scale-110 active:scale-95 transition-transform">關於我們</button>
            <button onClick={() => { setMainView('faq'); setIsMenuOpen(false); window.scrollTo(0, 0); }} className="hover:scale-110 active:scale-95 transition-transform">常見問題</button>
          </div>
        </div>
      )}

      {/* 主內容容器 */}
      <div className="w-full max-w-2xl min-h-screen relative flex flex-col pt-8 z-0 mx-auto px-6 md:px-12">

        <div className="w-full flex-1 relative z-10 flex flex-col items-center">
          {mainView === 'query' ? (
            <>
              {!hasSearched ? (
                // --- 🎯 首頁未搜尋狀態 ---
                <div className="flex flex-col items-center animate-fade-in-up w-full">

                  {/* 第一屏 (🎯 解決手機版捲動跳動 Bug，鎖死在螢幕下方) */}
                  <div className="w-full flex flex-col items-center min-h-[88svh] md:min-h-[85vh] pb-8 pt-4 justify-between">

                    {/* 上半部：Logo 圖片 */}
                    <img
                      src="https://i.imgur.com/OVkii3R.png" alt="Kaguya 自助查詢系統" referrerPolicy="no-referrer"
                      className="w-[95%] max-w-sm h-auto object-contain mx-auto mt-8 filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.15)]"
                    />

                    {/* 下半部：搜尋框 (🎯 mt-auto 把它硬推到這一個螢幕的最底端) */}
                    <div className="w-full flex flex-col items-center mt-auto">
                      <div className="text-[#3ac0bf] font-[900] text-5xl mb-6 animate-bounce [animation-duration:1.5s]">↓</div>
                      <div className="w-full max-w-md px-4">
                        <div className="bg-[#ffffff] rounded-full p-2 flex items-center gap-2 shadow-[6px_6px_0px_#000] border-[3px] border-black mb-3 transition-transform focus-within:-translate-y-1">
                          <div className="relative flex-1 flex items-center pl-1">
                            <Search className="absolute left-4 text-[#f8a3f4] w-6 h-6 stroke-[3px]" />
                            <input
                              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                              placeholder="請輸入您的社群暱稱"
                              className="w-full pl-12 pr-4 py-3 bg-transparent outline-none text-base md:text-lg font-[900] text-[#222] placeholder-gray-400"
                              onKeyDown={(e) => { if (e.key === 'Enter' && !(e.nativeEvent as any).isComposing) { handleSearch(); } }}
                            />
                          </div>
                          <button onClick={() => handleSearch()} className="bg-[#f8a3f4] text-white w-12 h-12 rounded-full border-[3px] border-black flex items-center justify-center shrink-0 active:scale-90 transition-transform">
                            <ArrowRight className="stroke-[3px]" />
                          </button>
                        </div>
                        <p className="text-[#3ac0bf] text-xs sm:text-sm font-[900] mt-4 text-center tracking-widest">
                          ※若有更改社群暱稱，請務必私訊官賴協助修改！
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 第二屏：NEWS 與 SNS 區塊 */}
                  <div className="w-full space-y-10 flex flex-col items-center pt-10">
                    {/* 明日結單區塊：固定存在（載入中／明日沒團也保留，不忽隱忽現） */}
                    <div className="w-full max-w-lg">
                        {/* 窄條標題：紅膠囊（可點，進 #/closing 明日結單頁）＋滑動提示 */}
                        <div className="flex items-center gap-2.5 px-4 md:px-1 mb-3">
                          <button onClick={goClosing} className="bg-[#f43f5e] text-white font-[900] text-sm pl-3.5 pr-2.5 py-1.5 rounded-full flex items-center gap-1.5 shrink-0 shadow-[0_3px_0px_rgba(0,0,0,0.25)] active:translate-y-0.5 active:shadow-none transition-all">
                            <AlarmClock className="w-4 h-4 stroke-[3px]" />
                            即將結單
                            <ChevronRight className="w-4 h-4 stroke-[3px]" />
                          </button>
                          {closingTeams.length > 2 && (
                            <span className="text-white/80 font-[900] text-[11px] tracking-widest">左右滑動看今明日結單</span>
                          )}
                        </div>
                        {teamsLoading ? (
                          <div className="px-4 md:px-1">
                            <div className="bg-white rounded-2xl px-5 py-4 shadow-[0_4px_0px_rgba(0,0,0,0.15)] text-[#4c59a1]/60 font-[900] text-sm text-center">載入中…</div>
                          </div>
                        ) : closingTeams.length === 0 ? (
                          <div className="px-4 md:px-1">
                            <div className="bg-white rounded-2xl px-5 py-4 shadow-[0_4px_0px_rgba(0,0,0,0.15)] text-[#4c59a1]/70 font-[900] text-sm text-center">明日沒有結單的團</div>
                          </div>
                        ) : (
                        <div className="flex gap-3 overflow-x-auto pb-3 px-4 md:px-1 snap-x" style={{ scrollbarWidth: 'none' }}>
                          {closingTeams.map(({ team, when }) => {
                            const img = groupProducts.find((p) => p.team === team.code && p.img)?.img;
                            return (
                              <button
                                key={team.code}
                                onClick={() => goOrderTeam(team.code)}
                                className="snap-start shrink-0 w-36 bg-white rounded-2xl overflow-hidden text-left shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all"
                              >
                                <div className="w-full h-28 bg-[#eef0fa] relative">
                                  {img ? (
                                    <img src={img} alt={team.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[#4c59a1]/40">
                                      <ShoppingBag className="w-9 h-9 stroke-[2px]" />
                                    </div>
                                  )}
                                  <span className={`absolute top-1.5 left-1.5 text-[10px] font-[900] px-2 py-0.5 rounded-full shadow-sm ${when === 'today' ? 'bg-[#f43f5e] text-white' : 'bg-[#fff170] text-black'}`}>
                                    {when === 'today' ? '今日結單' : '明日結單'}
                                  </span>
                                </div>
                                <div className="px-2.5 py-2">
                                  <div className="font-[900] text-[12px] text-[#4c59a1] leading-tight line-clamp-2 min-h-[30px]">{team.name}</div>
                                  <div className="text-[10px] font-[900] text-[#f43f5e] mt-1">{fmtMDHM(team.closeAt)} 止</div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        )}
                    </div>
                    {(teamsLoading || teams.length > 0) && (
                      <GroupOrderList teams={teams} products={groupProducts} preview loading={teamsLoading} onSelect={goOrderTeam} onMore={goOrderList} />
                    )}
                    <div id="news-section" className="w-full max-w-lg bg-[#ffaefe] rounded-[40px] px-6 py-10 flex flex-col items-center">
                      <h2 className="text-[#4c59a1] font-[900] text-4xl mb-6 tracking-widest">NEWS</h2>
                      <div className="w-full space-y-4 text-[#4c59a1] font-[900] text-base md:text-lg">
                        {news.slice(0, 3).map((item, idx) => (
                          <div
                            key={idx}
                            onClick={() => setSelectedNews(item)}
                            className="flex justify-between items-center border-b-[3px] border-[#4c59a1]/20 pb-3 cursor-pointer hover:opacity-70 active:scale-95 transition-all"
                          >
                            <span className="truncate mr-4 flex-1">{item.title}</span>
                            <span className="shrink-0">{item.date}</span>
                          </div>
                        ))}
                        {news.length === 0 && <p className="text-center opacity-70">載入中…</p>}
                      </div>
                      {/* 🎯 點擊 More 進入全新粉紅列表頁面 */}
                      <button onClick={() => { setMainView('info'); window.scrollTo(0, 0); }} className="mt-8 ml-auto text-[#4c59a1] font-[900] text-lg flex items-center border-b-[3px] border-[#4c59a1] hover:opacity-70 active:translate-x-2 transition-all">
                        More... <ArrowRight className="ml-1 w-5 h-5 stroke-[3px]" />
                      </button>
                    </div>

                    <div id="sns-section" className="w-full max-w-lg bg-[#3ac0bf] rounded-[40px] px-6 py-10 flex flex-col items-center">
                      <h2 className="text-[#fff170] font-[900] text-4xl mb-8 tracking-widest">SNS</h2>
                      <div className="w-full space-y-4">
                        <a href={APP_CONFIG.LINE_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><MessageCircle className="w-6 h-6 stroke-[2.5px] text-[#06C755]" /> 加官方賴好友</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                        <a href={APP_CONFIG.LINE_COMMUNITY_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><Star className="w-6 h-6 stroke-[2.5px] text-blue-500" /> LINE購物社群</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                        <a href={APP_CONFIG.INSTAGRAM_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><Instagram className="w-6 h-6 stroke-[2.5px] text-[#E1306C]" /> Official Instagram</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                        <a href={APP_CONFIG.THREADS_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><Hash className="w-6 h-6 stroke-[2.5px]" /> Official Threads</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                        <a href={APP_CONFIG.MAIHUOBIAN_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><ShoppingBag className="w-6 h-6 stroke-[2.5px] text-orange-500" /> 預購下單賣場</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                        <a href={APP_CONFIG.MAIHUOBIAN_STOCK_URL} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full bg-white text-black font-[900] text-lg px-6 py-4 rounded-full shadow-[0_4px_0px_rgba(0,0,0,0.15)] active:translate-y-1 active:shadow-none transition-all hover:bg-gray-50">
                          <div className="flex items-center gap-3"><Box className="w-6 h-6 stroke-[2.5px] text-red-500" /> 現貨賣場</div>
                          <ExternalLink className="w-5 h-5 opacity-40" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <footer className="pt-16 pb-32 text-center text-[#3ac0bf] text-[11px] font-[900] space-y-2">
                    <div className="opacity-80">本網頁由 Kaguyaさま日本動漫周邊代購 設計 <br /> 統編：60071756</div>
                    <p className="mt-2 opacity-80">© {new Date().getFullYear()} All Rights Reserved.</p>
                  </footer>
                </div>
              ) : (
                // --- 🎯 搜尋結果頁面開始 (佔滿剩餘高度) ---
                <div className="animate-fade-in w-full flex flex-col flex-1 h-full pt-2">

                  <div className="w-full flex flex-col items-center px-2 mb-6 space-y-5">

                    {/* 🎯 1. 頂部暱稱藥丸與返回按鈕 (顯示客人暱稱) */}
                    <div className="w-full max-w-md bg-white rounded-full p-2 pl-6 flex items-center justify-between shadow-[4px_4px_0px_#000] border-[3px] border-black">
                      <h1 className="text-[#3ac0bf] font-[900] text-2xl tracking-widest truncate flex-1 mr-4">
                        {searchQuery || 'Guest'}
                      </h1>
                      <button onClick={() => setHasSearched(false)} className="bg-[#f8a3f4] text-white w-10 h-10 rounded-full border-2 border-black flex items-center justify-center active:translate-y-1 transition-all hover:bg-[#eb92e7] shrink-0 shadow-[2px_2px_0px_#000]">
                        <X className="stroke-[3px]" />
                      </button>
                    </div>

                    {/* 2. 分頁標籤 */}
                    <div className="flex justify-start sm:justify-center gap-3 overflow-x-auto w-full max-w-md no-scrollbar pb-1">
                      {[
                        { id: 'deposit', label: '待付款訂單' },
                        { id: 'balance', label: '可出貨訂單' },
                        { id: 'completed', label: '已完成' },
                        { id: 'all', label: '所有訂單' }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setActiveTab(tab.id as TabType);
                            setSelectedOrderIds(new Set());
                            setVisibleLimit(10);
                            if (tab.id !== 'all') { setCargoFilters([]); setDeliveryFilter(null); }
                          }}
                          className={`px-4 py-2 rounded-full font-[900] whitespace-nowrap transition-all border-2 text-[13px] tracking-widest ${activeTab === tab.id
                            ? 'bg-[#3ac0bf] border-[#3ac0bf] text-white shadow-[0_2px_0px_rgba(0,0,0,0.2)]'
                            : 'bg-transparent border-[#3ac0bf] text-[#3ac0bf] hover:bg-[#3ac0bf]/10'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* 3. 子搜尋框 */}
                    {foundOrders.length > 0 && (
                      <div className="w-full max-w-md bg-white rounded-full p-1.5 flex items-center border-[4px] border-[#3be4d6] shadow-sm">
                        <input
                          type="text"
                          placeholder="在結果中搜尋團名和商品..."
                          value={subQuery}
                          onChange={(e) => setSubQuery(e.target.value)}
                          className="w-full px-4 py-1.5 bg-transparent outline-none text-sm font-[900] text-[#4c59a1] placeholder-gray-400"
                        />
                      </div>
                    )}
                  </div>

                  {/* --- 🎯 下半部：米色大圓弧畫布 (#fdfbf0) --- */}
                  <div className="w-full bg-[#fdfbf0] rounded-t-[40px] flex-1 flex flex-col items-center pt-8 px-4 sm:px-8 shadow-[0_-10px_20px_rgba(0,0,0,0.1)]">
                    {/* 🎯 排序、全選與數量統計 */}
                    {filteredOrders.length > 0 && (
                      <div className="w-full max-w-md flex justify-between items-center mb-6 px-1">

                        {/* 左側：排序 */}
                        <div className="relative">
                          <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="pl-4 pr-8 py-1.5 bg-transparent border-[2.5px] border-[#3ac0bf] text-[#3ac0bf] rounded-full text-sm font-[900] outline-none appearance-none cursor-pointer"
                          >
                            <option value="default">預設排序(依時間)</option>
                            <option value="price_desc">金額：由高至低</option>
                            <option value="price_asc">金額：由低至高</option>
                            <option value="strokes">團名：依筆畫</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#3ac0bf] font-[900] text-xs">▼</div>
                        </div>

                        {/* 右側：智慧切換全選或數量 */}
                        {(activeTab === 'deposit' || activeTab === 'balance') ? (
                          <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-[900] text-[#3ac0bf] bg-transparent border-[2.5px] border-dashed border-[#3ac0bf] px-4 py-1.5 rounded-full hover:bg-[#3ac0bf]/10 active:scale-95 transition-all"
                          >
                            {filteredOrders.every(o => selectedOrderIds.has(o.id)) ? <CheckSquare size={16} strokeWidth={3} /> : <Square size={16} strokeWidth={3} />}
                            全選本頁 ({selectedOrderIds.size})
                          </button>
                        ) : (
                          <span className="text-[#3ac0bf] font-[900] tracking-widest text-sm md:text-base pr-1">
                            共 {filteredOrders.length} 個訂單
                          </span>
                        )}
                      </div>
                    )}

                    {/* 🎯 3. 剛剛被妳罵我弄丟的：貨況與出貨篩選面板 (智商上線精緻版) */}
                    {/* 套用：白底、黑粗框、立體陰影、圓角藥丸樣式，完美搭配米色底色！ */}
                    {activeTab === 'all' && (
                      <div className="w-full max-w-md bg-white border-2 border-black rounded-[30px] p-6 mb-8 shadow-[4px_4px_0px_#000]">

                        {/* 貨況篩選：使用粉紫色標題 */}
                        <div className="mb-6">
                          <h4 className="text-[#4c59a1] font-[900] text-sm md:text-base mb-4 flex items-center gap-2 tracking-widest uppercase">
                            <Box className="w-6 h-6 stroke-[3px] text-[#f8a3f4]" /> 貨況篩選
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {ITEM_STATUS_OPTIONS.map(status => {
                              const isSelected = cargoFilters.includes(status);
                              return (
                                <button
                                  key={status}
                                  onClick={() => toggleCargoFilter(status)}
                                  // 🎯 圓角藥丸、撞色風格 (選中是粉色solid，未選是米色+黑框)
                                  className={`px-4 py-2 rounded-full text-xs font-[900] tracking-widest border-2 border-black transition-all flex items-center gap-2 active:scale-95 ${isSelected
                                    ? 'bg-[#f8a3f4] text-white shadow-none'
                                    : 'bg-[#fdfbf0] text-black shadow-[3px_3px_0px_#000] hover:-translate-y-1'
                                    }`}
                                >
                                  {isSelected ? <CheckSquare size={16} strokeWidth={3} /> : <Square size={16} strokeWidth={3} />}
                                  {status}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 出貨篩選：使用薄荷綠標題 */}
                        <div>
                          <h4 className="text-[#4c59a1] font-[900] text-sm md:text-base mb-4 flex items-center gap-2 tracking-widest uppercase">
                            <Truck className="w-6 h-6 stroke-[3px] text-[#3ac0bf]" /> 出貨篩選
                          </h4>
                          <div className="flex flex-wrap gap-2.5">
                            {DELIVERY_STATUS_OPTIONS.map(status => {
                              const isSelected = deliveryFilter === status;
                              return (
                                <button
                                  key={status}
                                  onClick={() => toggleDeliveryFilter(status)}
                                  // 🎯 圓角藥丸、撞色風格 (選中是薄荷綠solid，未選是米色+黑框)
                                  className={`px-4 py-2 rounded-full text-xs font-[900] tracking-widest border-2 border-black transition-all flex items-center gap-2 active:scale-95 ${isSelected
                                    ? 'bg-[#3ac0bf] text-white shadow-none'
                                    : 'bg-[#fdfbf0] text-black shadow-[3px_3px_0px_#000] hover:-translate-y-1'
                                    }`}
                                >
                                  {isSelected ? <CheckCircle2 size={16} strokeWidth={3} /> : <Circle size={16} strokeWidth={3} />}
                                  {status}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 🎯 白色的訂單卡片列表 */}
                    <div className="w-full max-w-md space-y-4">
                      {filteredOrders.length === 0 ? (
                        <div className="text-center py-20 text-[#4c59a1] font-[900] text-lg bg-white rounded-3xl border-2 border-dashed">目前沒有相關訂單</div>
                      ) : (
                        (activeTab === 'completed' || activeTab === 'all'
                          ? filteredOrders.slice(0, visibleLimit)
                          : filteredOrders
                        ).map(order => {
                          const isSelected = selectedOrderIds.has(order.id);
                          return (
                            <div
                              key={order.id}
                              onClick={() => { setSelectedDetailOrder(order); setIsDetailModalOpen(true); }}
                              // 🎯 白色卡片 (#ffffff) + 細黑邊框
                              className={`bg-white border-[2.5px] border-black rounded-[24px] p-5 cursor-pointer transition-all shadow-[4px_4px_0px_#000] relative overflow-hidden flex items-start gap-4 ${isSelected ? '-translate-y-1 shadow-[6px_6px_0px_#3ac0bf] border-[#3ac0bf]' : 'hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] active:translate-y-0 active:shadow-[2px_2px_0px_#000]'}`}
                            >
                              {/* 圓形 Checkbox */}
                              {(activeTab === 'deposit' || activeTab === 'balance') && (
                                <div
                                  onClick={e => { e.stopPropagation(); toggleOrderSelection(order.id); }}
                                  className={`w-6 h-6 mt-1.5 rounded-full flex items-center justify-center border-[2.5px] border-black transition-all shrink-0 ${isSelected ? 'bg-black text-white' : 'bg-transparent text-transparent'}`}
                                >
                                  <Check size={14} strokeWidth={4} />
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                {/* 🎯 究極進化：無黑框撞色標籤區 */}
                                <div className="flex flex-wrap gap-2 mb-3">

                                  {/* 🎯 1 & 2: 已出貨 -> 薄荷綠solid 配白字，無黑框 */}
                                  {order.isShipped ? (
                                    <span className="bg-[#3ac0bf] text-white px-3 py-1.5 rounded-full text-[11px] font-[900]">已出貨</span>
                                  ) : (
                                    <span className="bg-[#4c59a1] text-white px-3 py-1.5 rounded-full text-[11px] font-[900]">尚未出貨</span>
                                  )}

                                  {/* 🎯 2: 白底標籤 (已抵台等) -> 亮黃底 `#fff170` 配黑字，無黑框 */}
                                  {order.shippingStatus && (
                                    <span className="bg-[#fff170] text-black px-3 py-1.5 rounded-full text-[11px] font-[900]">
                                      {order.shippingStatus}
                                    </span>
                                  )}

                                  {/* 🎯 3: 完美復活！併單倒數標籤 (顯示在卡片外面、正確！) */}
                                  {(() => {
                                    const storageStatus = getStorageStatus(order.arrivalDate);
                                    if (storageStatus && !order.isShipped) {
                                      return (
                                        <span className={`${storageStatus.className} px-3 py-1.5 rounded-full text-[11px] font-[900]`}>
                                          {storageStatus.label}
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>

                                <h3 className="text-xl font-[900] text-black leading-snug mb-4">{order.groupName}</h3>

                                <div className="flex justify-between items-end">
                                  {/* 🎯 共 1 件 (白底 + 黑邊框 + 無陰影) */}
                                  <span className="text-black text-[11px] font-[900] bg-white border-2 border-black px-3 py-1.5 rounded-full leading-none">共 {order.totalQuantity} 件</span>

                                  <div className="text-right flex flex-col items-end">
                                    <span className="text-[10px] text-gray-600 font-[900] mb-0.5">{activeTab === 'deposit' ? '應付訂金' : activeTab === 'balance' ? '應付餘款' : '商品總額'}</span>
                                    {/* 🎯 拔掉黑邊框的粉紫色金額 #f8a3f4 */}
                                    <span className="text-4xl font-[900] text-[#4c59a1] tracking-tighter leading-none">
                                      ${(activeTab === 'deposit' ? order.depositAmount : activeTab === 'balance' ? order.balanceDue : order.productTotal).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                      {/* 🎯 顯示更多按鈕 (對齊老闆的圖 12.05.33 設計) */}
                      {(activeTab === 'completed' || activeTab === 'all') && filteredOrders.length > visibleLimit && (
                        <div className="pt-6 pb-2 text-center animate-fade-in">
                          <button
                            onClick={() => setVisibleLimit(prev => prev + 10)}
                            className="text-[#3ac0bf] font-[900] text-lg sm:text-xl tracking-widest underline decoration-[3px] underline-offset-4 hover:opacity-70 active:scale-95 transition-all"
                          >
                            顯示更多訂單...
                          </button>
                        </div>
                      )}
                      {/* 🎯 專屬米色背景底部 Footer (跟著米色畫布一路延伸到底) */}
                      <footer className="w-full pt-20 pb-32 text-center text-[#4c59a1] text-[11px] font-[900] space-y-2 mt-auto opacity-80">
                        <div>本網頁由 Kaguyaさま日本動漫周邊代購 設計 <br /> 統編：60071756</div>
                        <p className="mt-2">© {new Date().getFullYear()} All Rights Reserved.</p>
                      </footer>
                    </div>

                  </div>
                </div>
              )}
            </>
          ) : mainView === 'info' ? (
            // 舊深色 InfoHub（含購物流程／AllNewsModal）已移除；info 改由下方 z-80 全螢幕 NEWS 頁顯示
            <></>
          ) : mainView === 'about' ? (
            <div className="flex flex-col">
              <AboutSection onBack={() => setMainView('query')} />
            </div>
          ) : mainView === 'faq' ? (
            <div className="flex flex-col pt-4">
              <FaqSection onBack={() => setMainView('query')} />
            </div>
          ) : mainView === 'closing' ? (
            <ClosingList teams={teams} products={groupProducts} loading={teamsLoading} onSelect={goOrderTeam} onBack={exitOrderToQuery} onAll={goOrderList} />
          ) : (
            <div className="flex flex-col w-full">
              {(() => {
                const t = selectedTeamCode ? teams.find(x => x.code === selectedTeamCode) : null;
                return t
                  ? <OrderForm team={t} products={groupProducts.filter(p => p.team === t.code)} onBack={goOrderList} onGoQuery={exitOrderToQuery} onPreview={(nick) => { setLookupInitialNick(nick); setShowLookup(true); }} />
                  : <GroupOrderList teams={teams} products={groupProducts} onSelect={goOrderTeam} onBack={exitOrderToQuery} loading={teamsLoading} onLookup={() => { setLookupInitialNick(''); setShowLookup(true); }} />;
              })()}
            </div>
          )}
        </div>
      </div>

      {/* 🎯 完美還原圖 4 的底部結帳條 (帶有滑出動效 animate-fade-in-up) */}
      {hasSearched && selectedOrdersData.length > 0 && (activeTab === 'deposit' || activeTab === 'balance') && (
        <div className="fixed bottom-0 left-0 right-0 z-40 animate-fade-in-up">
          <div className="w-full max-w-2xl mx-auto bg-[#3ac0bf] rounded-t-[40px] px-8 py-6 shadow-[0_-10px_20px_rgba(0,0,0,0.15)] flex items-center justify-between">
            <div className="flex flex-col">
              <p className="text-white text-lg font-[900] tracking-widest mb-1">
                已選 <span className="text-[#f8a3f4] text-2xl mx-1">{selectedOrdersData.length}</span> 筆訂單
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-white font-[900] text-xl">共</span>
                <span className="text-[#fff170] font-[900] text-3xl">$</span>
                <span className="text-4xl md:text-5xl font-[900] text-[#fff170] tracking-tighter">{totalSelectedAmount.toLocaleString()}</span>
                <span className="text-white font-[900] text-xl">元</span>
              </div>
            </div>

            <button
              onClick={openPaymentModal}
              // 🎯 #0090a7 深薄荷綠按鈕 + 黑邊框與黑陰影
              className="bg-[#0090a7] text-white py-3 md:py-4 px-6 md:px-8 rounded-full font-[900] text-lg md:text-xl border-2 border-black shadow-[4px_4px_0px_#000] active:translate-y-1 active:shadow-none transition-all flex items-center gap-2"
            >
              {activeTab === 'deposit' ? (
                <><MessageCircle size={20} className="stroke-[2.5px]" /> 前往付款</>
              ) : (
                <><Truck size={20} className="stroke-[2.5px]" /> 賣貨便下單</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 所有的彈窗元件 */}
      {/* 所有的彈窗元件 */}
      <PaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} orders={payingOrders} totalAmount={payingTotal} type={modalType} />
      <OrderDetailModal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} order={selectedDetailOrder} onPay={payOneOrder} />
      <AdminDashboard isOpen={isAdminOpen} onClose={() => setIsAdminOpen(false)} />

      {/* 填單明細查詢（整頁黃底，覆蓋在預購填單專區上） */}
      {showLookup && <OrderLookup teams={teams} initialNick={lookupInitialNick} onBack={() => setShowLookup(false)} />}

      {/* ========================================= */}
      {/* 🎯 圖 3：全螢幕 NEWS 列表頁 (取代舊的 info) */}
      {/* ========================================= */}
      {mainView === 'info' && (
        <div className="fixed inset-0 z-[80] bg-[#ffaefe] overflow-y-auto animate-fade-in flex flex-col items-center px-6 py-10">
          <div className="w-full max-w-md flex flex-col items-center relative mb-12">
            <button onClick={() => setMainView('query')} className="absolute left-0 top-0 w-10 h-10 bg-[#3ac0bf] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-sm">
              <ChevronLeft strokeWidth={3} size={24} />
            </button>
            <h2 className="text-[#4c59a1] font-[900] text-4xl tracking-widest border-b-[4px] border-[#4c59a1] px-4 pb-2">NEWS</h2>
          </div>

          <div className="w-full max-w-md space-y-6 pb-20">
            {news.filter(n => !n.title.includes("跑馬燈")).map((item, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedNews(item)}
                className="flex justify-between items-center cursor-pointer hover:opacity-70 active:scale-95 transition-all text-[#4c59a1] font-[900] text-xl tracking-wider"
              >
                <span className="truncate mr-4 flex-1">{item.title}</span>
                <span className="shrink-0">{item.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 🎯 圖 4：全螢幕 NEWS 內文詳情頁 (含愛心計數) */}
      {/* ========================================= */}
      {selectedNews && (
        <div className="fixed inset-0 z-[90] bg-[#ffaefe] overflow-y-auto animate-fade-in flex flex-col items-center p-6 md:p-12">
          <div className="relative flex items-center w-full max-w-md mx-auto mb-6">
            <button onClick={() => setSelectedNews(null)} className="w-10 h-10 bg-[#3ac0bf] rounded-full flex items-center justify-center text-white active:scale-95 transition-transform shadow-sm shrink-0 border-2 border-[#3be4d6]">
              <ChevronLeft strokeWidth={3} size={24} />
            </button>
          </div>

          <div className="w-full max-w-md mx-auto flex flex-col flex-1 pb-20">
            {/* 標題與日期線 */}
            <h2 className="text-[#4c59a1] font-[900] text-3xl mb-3 text-center leading-snug">{selectedNews.title}</h2>
            <div className="text-right text-[#4c59a1] font-[900] text-xl mb-8 border-b-[4px] border-[#4c59a1] pb-4 tracking-widest">
              {selectedNews.date}
            </div>

            {/* 內文 */}
            <div className="text-[#4c59a1] font-[900] text-lg leading-loose whitespace-pre-wrap">
              {selectedNews.content}
            </div>

            {/* 💖 全新 Soft Pop 風格的按讚按鈕 */}
            <div className="mt-16 flex flex-col items-center border-t-[3px] border-dashed border-[#4c59a1]/30 pt-10">
              <button
                onClick={handleLikeNews}
                disabled={hasLikedNews}
                className={`
                  group flex items-center gap-3 px-8 py-3.5 rounded-full border-[3px] border-black transition-all duration-300
                  ${hasLikedNews
                    ? 'bg-gray-200 text-gray-500 cursor-default shadow-none translate-y-1'
                    : 'bg-white text-[#4c59a1] hover:bg-gray-50 active:scale-95 shadow-[4px_4px_0px_#000]'}
                  ${isBouncing ? 'animate-bounce' : ''}
                `}
              >
                <Heart
                  size={26}
                  className={`stroke-[2.5px] transition-colors ${hasLikedNews ? 'fill-gray-400 text-gray-400' : 'fill-[#f8a3f4] text-[#f8a3f4] group-hover:scale-110 transition-transform'}`}
                />
                <span className="font-[900] text-2xl tracking-tighter">{currentLikes}</span>
              </button>
              <p className="text-[#4c59a1] text-sm font-[900] tracking-widest mt-5">
                {hasLikedNews ? '感謝您的喜愛！✨' : '覺得這則公告有幫助嗎？'}
              </p>
            </div>

          </div>
        </div>
      )}

    </div >
  );
};

export default App;

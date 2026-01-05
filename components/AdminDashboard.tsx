import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Lock, Unlock, Plus, Search, CheckCircle, Truck, Package, 
  DollarSign, Save, List, Clipboard, FileSpreadsheet, ArrowRight, Trash2, Calendar
} from 'lucide-react';
import { Order, OrderStatus } from '../types';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

// 模擬後台資料
const MOCK_ADMIN_ORDERS: Order[] = [];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  
  // --- Rapid Entry State ---
  // 定義哪些欄位是「鎖定(釘選)」的，下一筆不會被清空
  const [locks, setLocks] = useState({
    groupName: true,     // 團名預設鎖定
    customerPhone: false,
    remittanceDate: true // 匯款日期預設鎖定
  });

  const [formData, setFormData] = useState({
    groupName: '',
    customerPhone: '',
    itemName: '',
    price: '',
    quantity: '1',
    depositAmount: '', // 匯款金額
    remittanceDate: new Date().toISOString().slice(0, 10), // 預設今天
    paymentMethod: '匯款'
  });

  // 計算欄位 (顯示用)
  const productTotal = Number(formData.price) * Number(formData.quantity);
  const balanceDue = productTotal - Number(formData.depositAmount);

  // Manage State
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // UX: Message Toast
  const [message, setMessage] = useState('');
  
  // Ref for auto-focus
  const itemInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 2000);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'kaguya888') {
      setIsAuthenticated(true);
    } else {
      alert('密碼錯誤');
    }
  };

  const toggleLock = (field: keyof typeof locks) => {
    setLocks(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const generateId = () => {
    // 產生 ID: ORD-YYMMDD-RAND (例如 ORD-240330-X92)
    const dateStr = new Date().toISOString().slice(2,10).replace(/-/g,'');
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    return `ORD-${dateStr}-${randomSuffix}`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const price = Number(formData.price);
    const qty = Number(formData.quantity);
    const deposit = Number(formData.depositAmount);
    const total = price * qty;
    const balance = total - deposit;
    
    // 判斷狀態：如果有匯款金額且大於0，且匯款日期有填，視為已付款(已對帳)
    // 這邊模擬您的 Excel 邏輯
    let status = OrderStatus.PENDING;
    if (deposit > 0 && formData.remittanceDate) {
        status = OrderStatus.PAID; // 假設填了匯款金額就是已對帳
    }

    const newOrder: Order = {
        id: generateId(),
        source: '後台快速輸入',
        customerName: formData.customerPhone,
        customerPhone: formData.customerPhone,
        groupName: formData.groupName,
        items: [{ name: formData.itemName, price: price, quantity: qty }],
        totalQuantity: qty,
        productTotal: total,
        depositAmount: deposit,
        balanceDue: balance,
        status: status,
        shippingStatus: '已登記',
        isShipped: false,
        shippingDate: '', // 預設空
        paymentMethod: formData.paymentMethod,
        createdAt: formData.remittanceDate || new Date().toISOString().split('T')[0]
    };

    // 加到列表最上方
    setCreatedOrders([newOrder, ...createdOrders]);
    showMessage(`已新增：${formData.itemName}`);

    // --- 智慧清空邏輯 (Smart Clear) ---
    const nextState = { ...formData };
    
    // 沒鎖的欄位才清空
    if (!locks.groupName) nextState.groupName = '';
    if (!locks.customerPhone) nextState.customerPhone = '';
    if (!locks.remittanceDate) nextState.remittanceDate = '';
    
    // 這些通常每一筆都不一樣，強制清空
    nextState.itemName = '';
    nextState.price = '';
    nextState.quantity = '1';
    nextState.depositAmount = ''; 
    // paymentMethod 保留上一筆的選擇通常比較方便，或也可以重置

    setFormData(nextState);

    // --- 焦點控制 ---
    // 如果社群暱稱沒鎖，焦點回到暱稱。如果鎖了，焦點直接去商品名稱 (連打模式)
    setTimeout(() => {
        if (!locks.customerPhone && customerInputRef.current) {
            customerInputRef.current.focus();
        } else if (itemInputRef.current) {
            itemInputRef.current.focus();
        }
    }, 10);
  };

  const handleDelete = (id: string) => {
      setCreatedOrders(createdOrders.filter(o => o.id !== id));
  };

  const copyForExcel = () => {
      // 針對您的需求，產生適合貼回 Excel 的格式
      // 假設順序：ID, 團名, 社群名稱, 商品, 單價, 數量, 總金額, 匯款金額, 餘款, 匯款日期, 付款方式
      const header = "ID\t團名\t社群名稱\t商品\t單價\t數量\t總金額\t匯款金額\t餘款\t匯款日期\t付款方式";
      const rows = createdOrders.map(o => {
          const item = o.items[0];
          return `${o.id}\t${o.groupName}\t${o.customerPhone}\t${item.name}\t${item.price || o.productTotal}\t${o.totalQuantity}\t${o.productTotal}\t${o.depositAmount}\t${o.balanceDue}\t${o.createdAt}\t${o.paymentMethod}`;
      }).join('\n');
      
      navigator.clipboard.writeText(`${header}\n${rows}`).then(() => {
          showMessage("✅ 已複製！請至 Google Sheet 按 Ctrl+V");
      });
  };

  // --- Render Login ---
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#050505] z-[100] flex items-center justify-center p-4" style={{backgroundImage: 'radial-gradient(#222 1.5px, transparent 1.5px)', backgroundSize: '24px 24px'}}>
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white">
            <X size={24} />
        </button>
        <div className="w-full max-w-sm bg-black/80 backdrop-blur-xl p-8 rounded-3xl border border-gray-800 shadow-2xl">
            <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)] animate-pulse">
                    <Lock className="w-8 h-8 text-pink-500" />
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">後台管理</h2>
                <p className="text-gray-500 text-sm font-bold mt-1 tracking-widest uppercase">Admin Access</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
                <input 
                    type="password" 
                    placeholder="輸入密碼..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full bg-gray-900 border-2 border-gray-800 rounded-xl px-4 py-3 text-white focus:border-pink-500 focus:outline-none transition-colors font-mono text-center tracking-widest placeholder-gray-600"
                />
                <button 
                    type="submit"
                    className="w-full bg-pink-500 text-black font-black py-3 rounded-xl hover:bg-pink-400 transition-all shadow-[0_0_15px_rgba(236,72,153,0.5)] active:scale-95"
                >
                    進入系統
                </button>
            </form>
        </div>
      </div>
    );
  }

  // --- Render Dashboard ---
  return (
    <div className="fixed inset-0 bg-[#050505] z-[100] flex flex-col animate-fade-in overflow-hidden" style={{backgroundImage: 'radial-gradient(#1a1a1a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px'}}>
      
      {/* Toast */}
      {message && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-[#06C755] text-white px-6 py-3 rounded-full font-bold shadow-[0_0_20px_rgba(6,199,85,0.5)] z-[110] animate-fade-in-up flex items-center gap-2 border border-white/20">
              <CheckCircle size={20} className="text-white" />
              {message}
          </div>
      )}

      {/* Header */}
      <div className="bg-gray-900/90 backdrop-blur-md border-b border-gray-800 p-3 flex justify-between items-center shrink-0 relative z-20">
         <div className="flex items-center gap-3">
            <div className="bg-pink-500 w-2 h-6 rounded-full shadow-[0_0_10px_#ec4899]"></div>
            <div>
                <h2 className="text-lg font-black text-white tracking-tight">快速輸入系統</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Rapid Entry Mode</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button 
                onClick={copyForExcel}
                className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg active:scale-95"
            >
                <FileSpreadsheet size={16} /> 複製到 Excel
            </button>
            <button onClick={onClose} className="p-2 bg-black hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-800">
                <X size={20} />
            </button>
         </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Panel: Input Form */}
        <div className="w-full md:w-[400px] bg-black/40 border-r border-gray-800 p-4 overflow-y-auto custom-scrollbar flex flex-col">
            <h3 className="text-pink-500 font-black text-sm uppercase mb-4 flex items-center gap-2">
                <Plus size={16} /> 新增資料
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
                
                {/* 1. 團名 (Sticky) */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 relative group focus-within:border-pink-500 transition-colors">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">團名 / 系列 (可釘選)</label>
                    <div className="flex gap-2">
                        <input 
                            required
                            value={formData.groupName}
                            onChange={e => setFormData({...formData, groupName: e.target.value})}
                            placeholder="例如：咒術迴戰 懷玉玉折"
                            className="flex-1 bg-transparent text-white font-bold outline-none placeholder-gray-700"
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleLock('groupName')}
                            className={`p-1.5 rounded-lg transition-colors ${locks.groupName ? 'text-pink-500 bg-pink-500/10' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {locks.groupName ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    </div>
                </div>

                {/* 2. 匯款日期 (Sticky) */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 relative focus-within:border-pink-500 transition-colors">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">匯款日期 (可釘選)</label>
                    <div className="flex gap-2">
                        <input 
                            type="date"
                            value={formData.remittanceDate}
                            onChange={e => setFormData({...formData, remittanceDate: e.target.value})}
                            className="flex-1 bg-transparent text-white font-mono font-bold outline-none"
                        />
                         <button 
                            type="button" 
                            onClick={() => toggleLock('remittanceDate')}
                            className={`p-1.5 rounded-lg transition-colors ${locks.remittanceDate ? 'text-pink-500 bg-pink-500/10' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {locks.remittanceDate ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    </div>
                </div>

                <div className="h-px bg-gray-800 my-2"></div>

                {/* 3. 社群暱稱 */}
                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800 relative focus-within:border-pink-500 transition-colors">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">社群暱稱</label>
                    <div className="flex gap-2">
                        <input 
                            ref={customerInputRef}
                            required
                            value={formData.customerPhone}
                            onChange={e => setFormData({...formData, customerPhone: e.target.value})}
                            placeholder="輸入暱稱..."
                            className="flex-1 bg-transparent text-white font-bold outline-none placeholder-gray-700 text-lg"
                        />
                        <button 
                            type="button" 
                            onClick={() => toggleLock('customerPhone')}
                            className={`p-1.5 rounded-lg transition-colors ${locks.customerPhone ? 'text-pink-500 bg-pink-500/10' : 'text-gray-600 hover:text-gray-400'}`}
                        >
                            {locks.customerPhone ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                    </div>
                </div>

                {/* 4. 商品明細 */}
                <div className="space-y-3">
                    <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">商品名稱</label>
                        <input 
                            ref={itemInputRef}
                            required
                            value={formData.itemName}
                            onChange={e => setFormData({...formData, itemName: e.target.value})}
                            placeholder="商品名稱..."
                            className="w-full bg-transparent text-white font-bold outline-none placeholder-gray-700"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">單價</label>
                            <input 
                                type="number"
                                required
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: e.target.value})}
                                placeholder="0"
                                className="w-full bg-transparent text-white font-mono font-bold outline-none text-lg"
                            />
                        </div>
                        <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">數量</label>
                            <input 
                                type="number"
                                required
                                min="1"
                                value={formData.quantity}
                                onChange={e => setFormData({...formData, quantity: e.target.value})}
                                className="w-full bg-transparent text-white font-mono font-bold outline-none text-lg"
                            />
                        </div>
                    </div>
                </div>

                {/* 5. 金額 & 匯款 (自動計算區) */}
                <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-800 space-y-3">
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-400">商品總額</span>
                        <span className="text-white font-mono font-bold text-lg">${productTotal.toLocaleString()}</span>
                     </div>
                     
                     <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-gray-400 whitespace-nowrap">匯款金額</span>
                        <input 
                            type="number"
                            value={formData.depositAmount}
                            onChange={e => setFormData({...formData, depositAmount: e.target.value})}
                            placeholder="0"
                            className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1 text-right text-pink-400 font-mono font-bold outline-none focus:border-pink-500"
                        />
                     </div>

                     <div className="h-px bg-gray-700"></div>

                     <div className="flex justify-between items-center">
                        <span className="text-sm font-black text-white">應收餘款</span>
                        <span className={`font-mono font-black text-xl ${balanceDue > 0 ? 'text-[#06C755]' : 'text-gray-500'}`}>
                            ${balanceDue.toLocaleString()}
                        </span>
                     </div>
                </div>

                <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                    <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">付款方式</label>
                    <select 
                        value={formData.paymentMethod}
                        onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                        className="w-full bg-transparent text-white font-bold outline-none appearance-none cursor-pointer"
                    >
                        <option>匯款</option>
                        <option>無卡</option>
                        <option>中信轉帳</option>
                    </select>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-pink-500 text-black font-black py-4 rounded-xl hover:bg-pink-400 transition-all shadow-[0_0_20px_rgba(236,72,153,0.4)] active:scale-95 flex items-center justify-center gap-2 text-lg border-2 border-pink-400 mt-2"
                >
                    <Plus size={20} strokeWidth={3} /> 新增下一筆 (Enter)
                </button>

            </form>
        </div>

        {/* Right Panel: List Table */}
        <div className="flex-1 bg-black/20 p-4 md:p-6 overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-gray-400 font-bold text-sm uppercase flex items-center gap-2">
                    <List size={16} /> 本次新增清單 ({createdOrders.length})
                </h3>
                {createdOrders.length > 0 && (
                    <button 
                        onClick={() => setCreatedOrders([])}
                        className="text-red-500 text-xs font-bold hover:text-red-400 px-3 py-1 rounded-lg border border-red-900/30 hover:bg-red-900/20"
                    >
                        全部清除
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar border border-gray-800 rounded-2xl bg-black/40">
                {createdOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-4">
                        <FileSpreadsheet size={48} className="opacity-20" />
                        <p className="font-bold text-sm">尚未新增資料</p>
                        <p className="text-xs max-w-[200px] text-center opacity-50">
                            在左側輸入資料，按下新增後會出現在這裡。最後按「複製到 Excel」即可。
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-900/80 text-gray-400 text-[10px] font-bold uppercase sticky top-0 backdrop-blur-md z-10">
                            <tr>
                                <th className="p-3 border-b border-gray-800">ID</th>
                                <th className="p-3 border-b border-gray-800">社群暱稱</th>
                                <th className="p-3 border-b border-gray-800">商品</th>
                                <th className="p-3 border-b border-gray-800 text-right">總價</th>
                                <th className="p-3 border-b border-gray-800 text-right">訂金</th>
                                <th className="p-3 border-b border-gray-800 text-right">餘款</th>
                                <th className="p-3 border-b border-gray-800">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-sm font-bold">
                            {createdOrders.map(order => (
                                <tr key={order.id} className="hover:bg-gray-900/30 transition-colors group">
                                    <td className="p-3 font-mono text-gray-500 text-xs">{order.id}</td>
                                    <td className="p-3 text-white">
                                        <div>{order.customerPhone}</div>
                                        <div className="text-[10px] text-gray-500 font-normal">{order.groupName}</div>
                                    </td>
                                    <td className="p-3 text-gray-300">
                                        {order.items[0].name} <span className="text-pink-500 text-xs">x{order.totalQuantity}</span>
                                    </td>
                                    <td className="p-3 text-right text-gray-300 font-mono">${order.productTotal}</td>
                                    <td className="p-3 text-right text-pink-400 font-mono">${order.depositAmount}</td>
                                    <td className="p-3 text-right text-[#06C755] font-mono">${order.balanceDue}</td>
                                    <td className="p-3">
                                        <button 
                                            onClick={() => handleDelete(order.id)}
                                            className="p-1.5 text-gray-600 hover:text-red-500 transition-colors rounded hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="mt-4 text-[10px] text-gray-500 text-center font-mono">
                * 確認無誤後，請按右上角「複製到 Excel」並貼回您的 Google Sheet
            </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;
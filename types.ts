
export enum OrderStatus {
  PENDING = '待付款', // 對賬 = FALSE
  PAID = '已付款',    // 對賬 = TRUE
  CANCELLED = '已取消'
}

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  source: string;
  customerName: string;
  customerPhone: string;
  groupName: string;
  items: OrderItem[];
  totalQuantity: number;
  productTotal: number;
  depositAmount: number;
  balanceDue: number;
  status: OrderStatus;
  shippingStatus: string;
  isShipped: boolean;
  shippingDate: string;
  paymentMethod: string;
  createdAt: string;
  arrivalDate?: string;
  domesticShipping?: number;        // 境內運費（已含在 productTotal 內，但獨立顯示給客人看）
  internationalShipping?: number;   // 國際運費（加在尾款上）
  notes?: string;                   // 備註（補充說明）
}

export interface Announcement {
  id: string; // 用於按讚辨識
  date: string;
  title: string;
  content: string;
  likes: number; // 按讚數
  isImportant?: boolean;
}

// --- 開團訂購（與查詢系統獨立，資料來自收單 GAS 的 開團表/開團商品 分頁）---
export interface GroupTeam {
  code: string;      // 團代號（網址用，如 myha3）
  name: string;      // 團名
  status: string;    // 開團中 / 已關閉
  closeAt: string;   // 結單時間（ISO 字串）
  openAt?: string;   // 開團日期
  shipInfo?: string; // 發貨
  note?: string;     // 備註
}

export interface GroupProduct {
  team: string;        // 團代號
  category: string;    // 類別（立牌/貼紙/吊飾…）
  no: number | string; // 編號
  name: string;        // 品名
  img: string;         // 圖URL
  price: number;       // 價格
  star?: boolean;      // ★款
  spec?: string;       // 規格/類別備註（顯示在類別名右邊，自由寫）
}

export interface GroupCartItem {
  type: string;   // 類別
  label: string;  // 編號＋品名
  qty: number;
  price: number;
}


export interface ColumnMapping {
  id: string;
  source: string;
  customerPhone: string;
  itemName: string;
  quantity: string;
  productTotal: string;
  depositAmount: string;
  balanceDue: string;
  isReconciled: string;
  isShipped: string;
  shippingStatus: string;
  groupName: string;
  shippingDate: string;
  paymentMethod: string;
  arrivalDate: string;
  domesticShipping: string;
  internationalShipping: string;
  notes: string;
}

export interface VirtualAccountResponse {
  bankCode: string;
  accountNumber: string;
  expireDate: string;
}

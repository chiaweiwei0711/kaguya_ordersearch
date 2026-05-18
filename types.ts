
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

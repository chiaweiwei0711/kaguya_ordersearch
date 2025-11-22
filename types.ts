
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
  source: string; // 訂單來源
  customerName: string; // 會員姓名 (可能沒填，用社群名稱)
  customerPhone: string; // 社群名稱
  groupName: string; // 團名
  
  items: OrderItem[];
  totalQuantity: number; // 總數量
  
  // 金額結構
  productTotal: number; // 商品金額
  depositAmount: number; // 匯款金額 (已付/應付訂金)
  balanceDue: number;   // 餘款
  
  // 狀態
  status: OrderStatus; // 根據「對賬」欄位
  shippingStatus: string; // 根據「狀態」欄位 (已抵台)
  isShipped: boolean; // 根據「出貨」欄位
  
  shippingDate: string; // 出貨日期
  paymentMethod: string; // 付款方式 (無卡/匯款)
  createdAt: string; // 這裡通常用匯款日期或系統日期
}

// 用於對應 Google Sheet 的欄位名稱
export interface ColumnMapping {
  id: string;           // 訂單ID
  source: string;       // 訂單來源
  customerPhone: string;// 社群名稱
  itemName: string;     // 登記商品
  quantity: string;     // 總數量
  
  // 金額欄位
  productTotal: string; // 商品金額
  depositAmount: string;// 匯款金額
  balanceDue: string;   // 餘款
  
  // 狀態欄位
  isReconciled: string; // 對賬 (TRUE/FALSE)
  isShipped: string;    // 出貨 (TRUE/FALSE)
  shippingStatus: string; // 狀態 (e.g. 已抵台)
  
  groupName: string;    // 團名
  shippingDate: string; // 出貨日期
  paymentMethod: string; // 付款方式
}

export interface VirtualAccountResponse {
  bankCode: string;
  accountNumber: string;
  expireDate: string;
}

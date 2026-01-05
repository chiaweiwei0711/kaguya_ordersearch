
import { ColumnMapping } from "./types";

export const APP_CONFIG = {
  // 請確保這是您最新部署的 GAS 網址
  API_URL: "https://script.google.com/macros/s/AKfycbzyWKTJDGviJrR5pBmcKSvn7ar2-FsYYuaElCUKWVOjmj5W-XvNq8G9hZgi6VrowKYx/exec", 

  LINE_URL: "https://lin.ee/cfEklUi",
  LINE_COMMUNITY_URL: "https://line.me/ti/g2/RYAbF9YVD2z0vFRkvUjCtPCQFr9d_eyEtFq6qw",
  INSTAGRAM_URL: "https://www.instagram.com/kaguyasama_shop/",
  THREADS_URL: "https://www.threads.net/@kaguyasama_shop",
  MAIHUOBIAN_URL: "https://myship.7-11.com.tw/general/detail/GM2410034450510",
  MAIHUOBIAN_STOCK_URL: "https://myship.7-11.com.tw/general/detail/GM2404305452655",

  COLUMN_MAPPING: {
    id: "訂單ID",
    source: "訂單來源",
    customerPhone: "社群名稱",
    itemName: "登記商品",
    quantity: "總數量",
    groupName: "團名",
    productTotal: "商品金額",   
    depositAmount: "匯款金額", 
    balanceDue: "餘款",       
    isReconciled: "對賬",
    isShipped: "出貨",
    shippingStatus: "狀態",
    shippingDate: "出貨日期",
    paymentMethod: "付款方式"
  } as ColumnMapping
};

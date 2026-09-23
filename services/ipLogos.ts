// 作品 logo 圖：首頁「動漫類別」圓圈裡放的就是這些。
//
// 規則：有 logo 就用 logo（白底、object-contain，看起來像官方分類）；
//       沒有的作品自動退回「該作品最近一團的封面圖」，畫面不會開天窗。
// 補圖流程：logo 抓官方透明 PNG → push 到 kaguya-assets → 在這裡加一行。
//   建議路徑：https://cdn.jsdelivr.net/gh/chiaweiwei0711/kaguya-assets@main/ip/<作品>.png
// key 要跟 services/ipTags.ts 的作品名完全一致。
export const IP_LOGOS: Record<string, string> = {
  // 例：'我的英雄學院': 'https://cdn.jsdelivr.net/gh/chiaweiwei0711/kaguya-assets@main/ip/mha.png',
};

export const logoOf = (ip: string): string => IP_LOGOS[ip] || "";

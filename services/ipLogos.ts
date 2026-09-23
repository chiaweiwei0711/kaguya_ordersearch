// 作品 logo 圖：首頁「作品類別」和作品類別頁的圓圈裡放的就是這些。
//
// 圖放在自家圖床（kaguya-assets/ip/<id>.jpeg，走 jsDelivr CDN）；檔名用來源站的作品 id，
// 純 ASCII 不會有中文網址編碼問題。要換圖就換掉同名檔案、或在下面改成新檔名。
//
// 規則：有 logo 就用 logo（白底、留白不裁切）；沒有的作品自動退回「該作品最近一團的封面圖」。
// key 必須跟 services/ipTags.ts 的作品名完全一致。
const BASE = "https://cdn.jsdelivr.net/gh/chiaweiwei0711/kaguya-assets@main/ip/";

export const IP_LOGOS: Record<string, string> = {
  "我的英雄學院": BASE + "458.jpeg",     // ⚠️ 來源站只有劇場版那張（上半部是主 logo），之後可換成 TV 版主 logo
  "咒術迴戰": BASE + "1101.jpeg",
  "進擊的巨人": BASE + "413.jpeg",
  "排球少年": BASE + "445.jpeg",
  "鬼滅之刃": BASE + "448.jpeg",
  "入間同學入魔了": BASE + "2018.jpeg",
  "相反的你和我": BASE + "1805.jpeg",
  "家庭教師": BASE + "303.jpeg",
  "葬送的芙莉蓮": BASE + "1183.jpeg",
  "鏈鋸人": BASE + "1015.jpeg",
  "藍色監獄": BASE + "974.jpeg",
  "GACHIAKUTA": BASE + "1861.jpeg",
  "失憶投捕": BASE + "1360.jpeg",
  "坂本日常": BASE + "1490.jpeg",
  "躍動青春": BASE + "1985.jpeg",
  "路人超能100": BASE + "259.jpeg",
  "名偵探柯南": BASE + "56.jpeg",
  "東京喰種": BASE + "1588.jpeg",
  "寶可夢": BASE + "679.jpeg",
  "光逝去的夏天": BASE + "1713.jpeg",
  "薰香花朵凜然綻放": BASE + "1737.jpeg",
  "東京復仇者": BASE + "668.jpeg",
  "守護甜心": BASE + "719.jpeg",
  "防風少年": BASE + "1487.jpeg",
  "死神": BASE + "1035.jpeg",
  "航海王": BASE + "990.jpeg",
  // 還沒有的：文豪野犬、魔法帽的工作室（來源擋下載 403）、冰之城牆、現在的是哪個多聞、獵人、黃泉使者、齊木楠雄（來源站沒有）
  // ⚠️ 進擊的巨人那張是「進撃の巨人展 FINAL」的展覽 logo，我英是劇場版 logo——來源站只有這兩張，之後可換
};

export const logoOf = (ip: string): string => IP_LOGOS[ip] || "";

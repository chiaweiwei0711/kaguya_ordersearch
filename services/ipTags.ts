import { GroupTeam, GroupProduct } from "../types";

/**
 * 作品標籤字典：官方台譯（顯示用） → 團名／品名裡可能出現的各種寫法。
 * 只收「作品」，不收通路或廠商（JCS、AIR TWOKYO、MOVIC、SEGA…），
 * 因為客人是想找作品，不是想找店。
 *
 * 後台「開團表」有「標籤」欄的話以那欄為準（可以手動修正／補上字典抓不到的）；
 * 沒填才用這份字典即時推導，所以不需要先幫 139 個團補資料就能用。
 */
const IP_DICT: [string, string[]][] = [
  ["我的英雄學院", ["我的英雄學院", "我英", "僕のヒーロー", "MY HERO", "ヒロアカ"]],
  ["咒術迴戰", ["咒術迴戰", "咒術回戦", "呪術廻戦", "JUJUTSU"]],
  ["鬼滅之刃", ["鬼滅之刃", "鬼滅", "KIMETSU", "無限列車"]],
  ["排球少年", ["排球少年", "ハイキュー", "HAIKYU"]],
  ["航海王", ["航海王", "ONE PIECE", "海賊王", "ワンピース"]],
  ["進擊的巨人", ["進擊的巨人", "進巨", "進撃の巨人", "ATTACK ON TITAN"]],
  ["鏈鋸人", ["鏈鋸人", "チェンソーマン", "CHAINSAW"]],
  ["JOJO的奇妙冒險", ["JOJO", "ジョジョ"]],
  ["葬送的芙莉蓮", ["芙莉蓮", "フリーレン", "FRIEREN"]],
  ["死神", ["死神", "BLEACH", "ブリーチ"]],
  ["獵人", ["獵人", "HUNTER", "ハンター"]],
  ["死亡筆記本", ["死亡筆記本", "DEATH NOTE", "デスノート"]],
  ["家庭教師", ["家庭教師", "家教", "REBORN"]],
  ["新石紀", ["新石紀", "Dr.STONE", "DR STONE", "ドクターストーン"]],
  ["GACHIAKUTA", ["GACHIAKUTA", "ガチアクタ"]],
  ["防風少年", ["防風少年", "WIND BREAKER", "ウィンドブレーカー"]],
  ["閃電十一人", ["閃電十一人", "イナズマイレブン", "INAZUMA"]],
  ["相反的你和我", ["相反的你和我", "逆さまの君と僕"]],
  ["戀愛吧！假面天使！", ["假面天使", "戀愛吧"]],
  ["守護甜心", ["守護甜心", "しゅごキャラ"]],
  ["坂本日常", ["坂本日常", "SAKAMOTO DAYS", "サカモトデイズ"]],
  ["入間同學入魔了", ["入間同學", "魔入りました"]],
  ["冰之城牆", ["冰之城牆", "冰城", "アイスの城壁", "H2O"]],
  ["光逝去的夏天", ["光逝去的夏天", "光が死んだ夏"]],
  ["純情大作戰", ["純情大作戰"]],
  ["加油！中村同學！", ["中村同學", "中村くん"]],
  ["現在的是哪個多聞", ["多聞"]],
  ["失憶投捕", ["失憶投捕", "失憶投補", "バッテリー"]],
  ["躍動青春", ["躍動青春", "ハイパーウルトラ", "君のことが大大大"]],
  ["蔚藍檔案", ["蔚藍檔案", "BLUE ARCHIVE", "ブルアカ"]],
  ["間諜家家酒", ["間諜家家酒", "SPY×FAMILY", "SPY FAMILY", "スパイファミリー"]],
  ["孤獨搖滾", ["孤獨搖滾", "ぼっち・ざ・ろっく", "BOCCHI"]],
  ["地縛少年花子君", ["花子君", "地縛少年"]],
  ["文豪野犬", ["文豪野犬", "文スト", "BUNGO"]],
  ["數碼寶貝", ["數碼寶貝", "デジモン", "DIGIMON"]],
  ["寶可夢", ["寶可夢", "ポケモン", "POKEMON", "POKÉMON"]],
  ["三麗鷗", ["三麗鷗", "SANRIO", "サンリオ"]],
  ["吉伊卡哇", ["吉伊卡哇", "ちいかわ", "CHIIKAWA"]],
  ["夏目友人帳", ["夏目友人帳", "夏目"]],
  ["名偵探柯南", ["名偵探柯南", "柯南", "コナン", "CONAN"]],
  ["刀劍亂舞", ["刀劍亂舞", "刀剣乱舞", "とうらぶ"]],
  ["偶像夢幻祭", ["偶像夢幻祭", "あんスタ", "ENSTARS"]],
  ["明日方舟", ["明日方舟", "ARKNIGHTS"]],
  ["原神", ["原神", "GENSHIN"]],
  ["聲之形", ["聲之形"]],
  ["轉生成蜘蛛", ["轉生成蜘蛛"]],
  ["我推的孩子", ["我推的孩子", "推しの子", "OSHI NO KO"]],
  ["明明就是渣男", ["渡良瀬", "明明就是渣男", "渡良瀬準"]],
  ["齊木楠雄的災難", ["齊木楠雄", "斉木楠雄"]],
  ["魔法帽的工作室", ["魔法帽的工作室", "とんがり帽子"]],
  ["薰香花朵凜然綻放", ["薰香花朵", "薫る花"]],
  ["路人超能100", ["路人超能", "モブサイコ", "MOB PSYCHO"]],
  ["塔麻歌子", ["塔麻歌子", "たまごっち", "TAMAGOTCHI"]],
  ["GIVEN 被贈與的未來", ["GIVEN", "ギヴン"]],
  ["肌肉魔法使MASHLE", ["MASHLE", "肌肉魔法使", "マッシュル"]],
  ["黃泉使者", ["黃泉使者", "よみつかい"]],
  ["境界觸發者", ["境界觸發者", "ワールドトリガー", "WORLD TRIGGER"]],
  ["青之驅魔師", ["青之驅魔師", "青の祓魔師", "BLUE EXORCIST"]],
  ["東京復仇者", ["東京復仇者", "東京卍", "TOKYO REVENGERS"]],
];

const norm = (s: unknown) => String(s ?? "").toUpperCase().replace(/[\s　・·]/g, "");

// 從一段文字（團名或一堆品名）比對出作品標籤
const tagsFromText = (text: string): string[] => {
  const t = norm(text);
  const out: string[] = [];
  for (const [canon, aliases] of IP_DICT) {
    if (aliases.some((a) => a && t.includes(norm(a)))) out.push(canon);
  }
  return out;
};

/**
 * 一團的標籤：後台「標籤」欄優先；沒填才從團名推導；團名看不出來再翻該團商品名。
 * 一團多作品是正常的（例如聯名團），所以回傳陣列。
 */
export const tagsOfTeam = (team: GroupTeam, products: GroupProduct[]): string[] => {
  if (team.tags && team.tags.length) return team.tags;
  const byName = tagsFromText(team.name);
  if (byName.length) return byName;
  // 品名只取前 400 筆就夠判斷，避免大團（500+ 件）每次都掃全部
  const sample = products
    .filter((p) => p.team === team.code)
    .slice(0, 400)
    .map((p) => p.name)
    .join(" ");
  return tagsFromText(sample);
};

// 建整站的「團代號 → 標籤」對照，順便算每個標籤有幾團（給篩選面板顯示數量）
export const buildTagIndex = (teams: GroupTeam[], products: GroupProduct[]) => {
  const byTeam: Record<string, string[]> = {};
  const counts: Record<string, number> = {};
  teams.forEach((t) => {
    const tags = tagsOfTeam(t, products);
    byTeam[t.code] = tags;
    tags.forEach((x) => { counts[x] = (counts[x] || 0) + 1; });
  });
  const all = Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b, "zh-Hant"));
  return { byTeam, counts, all };
};

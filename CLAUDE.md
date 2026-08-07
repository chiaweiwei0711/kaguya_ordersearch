# CLAUDE.md

Guidance for Claude Code / AI assistants working in this repository.

## What this is

**KAGUYA 日本動漫代購自助平台** (`kgygoods.com`) — a customer-facing single-page app for a
Taiwanese Japanese-anime-merchandise *daigou* (proxy-purchasing) business. Customers use it to:

1. **查訂單 (order lookup)** — search their own orders by social nickname, filter by payment/shipping
   state, select several orders and be walked through a bank-transfer or 賣貨便 (7-11 MyShip) checkout.
2. **預購填單 (group-buy order form)** — browse open group-buy "teams" (團), pick items, submit a
   pre-order, and later look up what they submitted.
3. Read announcements (NEWS), FAQ, About.

There is **no backend in this repo**. All data lives in Google Sheets, exposed through two separate
Google Apps Script (GAS) web-app deployments. This repo is the React front end only, deployed as a
static site on Netlify.

The product language is **Traditional Chinese (zh-TW)**. Source comments, commit messages, UI copy,
and even the Google Sheet column names are all in Chinese. Keep it that way.

## Commands

```bash
npm install       # deps are NOT vendored; run this first in a fresh clone
npm run dev       # Vite dev server (host: true → reachable from phone on the LAN)
npm run build     # production build → dist/
npm run preview   # serve the built dist/
npx tsc --noEmit  # typecheck (no npm script for it; there is no lint or test setup)
```

There is **no test suite, no linter, and no CI**. `npm run build` + `npx tsc --noEmit` are the only
automated checks available — run both before committing a non-trivial change. Most verification here
is manual: `npm run dev` and click through the flow on a narrow (mobile-width) viewport, because
essentially every screen is designed mobile-first.

`GEMINI_API_KEY` / `API_KEY` in `.env.local` is mentioned in `README.md`, but the Gemini code is dead
(see *Dead code* below) — you do **not** need an API key to run or build the app.

## Architecture

### Entry & rendering

`index.tsx` → `App.tsx`. `index.html` is not a bare Vite shell: it carries the PWA manifest link,
Open Graph / share-preview meta, the Google Fonts link, **the Tailwind Play CDN script + inline
`tailwind.config`**, and a large `<style>` block of hand-written keyframes and utility classes
(`.animate-fade-in-up`, `.no-scrollbar`, `.btn-pop`, …).

**Tailwind is loaded at runtime from `cdn.tailwindcss.com`, not built.** `tailwindcss`, `postcss`,
and `autoprefixer` sit in `devDependencies` but no `tailwind.config.js` or `postcss.config.js`
exists and nothing imports a CSS file. Consequences you must respect:

- Adding a Tailwind class works immediately — no build config to touch, no purge/safelist to update.
- Theme customisation goes in the inline `tailwind.config` in `index.html`, not a config file.
- Custom keyframes/animations go in the `<style>` block in `index.html`.
- Arbitrary-value classes (`bg-[#4c59a1]`, `shadow-[4px_4px_0px_#000]`) are used everywhere and are
  the normal way colors are expressed here.

`index.html` also contains an `<script type="importmap">` pointing React 19 / lucide / genai at
`aistudiocdn.com`. It is a **leftover from the app's Google AI Studio origin and has no effect** —
Vite resolves bare imports from `node_modules` at build time (React 18 per `package.json`). Don't
"fix" the version mismatch by bumping `package.json` to match it; if anything, the importmap is the
thing that could be deleted.

### Routing — hand-rolled, no router library

`App.tsx` holds a `MainView` union (`'query' | 'info' | 'about' | 'order' | 'faq' | 'closing'`) and
drives real URLs with `history.pushState` / `popstate`:

| Path | View |
| --- | --- |
| `/` | order lookup home |
| `/order` | group-buy team list |
| `/order/<團代號>` | one team's order form |
| `/closing` | teams closing today/tomorrow (shareable link) |

**Legacy hash URLs (`#/order/xxx`) must keep working forever** — they were pasted into LINE groups
and community posts. On boot, `App.tsx` rewrites `#/...` → `/...` via `history.replaceState`. Any
change to routing has to preserve that rewrite. Netlify serves the SPA fallback via the
`/*  →  /index.html  200` redirect in `netlify.toml`.

Not every screen is in that table: `about`, `faq`, `closing`, the group-order form, and the
"填單明細查詢" lookup render as **full-screen `fixed inset-0` overlays** with their own solid
background color and their own back button, layered by z-index (`z-40` pages, `z-80`/`z-90`
news pages, `z-[100]` menu, `z-[120]` loading, `z-[130]` LIFF boot splash). When adding a screen,
follow that pattern rather than introducing a router.

### The two Google Apps Script backends

`config.ts` → `APP_CONFIG` holds both endpoints. **They are deliberately separate deployments and
must not be conflated:**

- `API_URL` — the **query/announcements/payment** backend (`services/googleSheetService.ts`)
  - `?search=<nick>` → order rows
  - `?type=announcements` → NEWS
  - `?type=getNickname&lineId=…` → LINE-ID → nickname binding (LIFF auto-login)
  - `POST type=like&id=…` → announcement like counter
- `ORDER_API_URL` — the **group-buy intake** backend (`services/groupOrderService.ts`)
  - `?type=listTeams&lite=1` → teams + lightweight product index
  - `?type=teamItems&team=<code>` → full item detail for one team
  - `?type=pre-orderform&nick=…` → the customer's own past submissions
  - `POST type=submitGroupOrder&…` → submit a pre-order

**All POSTs use `URLSearchParams` with `Content-Type: application/x-www-form-urlencoded`.** This is
not stylistic: GAS `doPost` only populates `e.parameter` for form-encoded bodies, and JSON bodies
trigger a CORS preflight that GAS does not answer. Never convert these to `JSON.stringify` bodies.

Changing a GAS deployment URL means editing `config.ts` — these are baked into the client bundle.
The URLs (and the bank account numbers in `components/PaymentModal.tsx`, the admin password in
`components/AdminDashboard.tsx`) are already public in the shipped bundle; treat them as public
config, not secrets, but don't add anything genuinely sensitive to client code.

### Sheet columns are Chinese strings

Google Sheet rows arrive as objects keyed by their **Chinese header text**. Two mapping styles
coexist and both are load-bearing:

- Order lookup goes through `APP_CONFIG.COLUMN_MAPPING` in `config.ts` (`id: "訂單ID"`,
  `depositAmount: "匯款金額"`, …). If the shop renames a sheet column, edit this map — not the
  service code.
- Group-buy code reads Chinese keys **inline** (`t["團代號"]`, `it["圖URL"]`, `s["品項"]`).

`googleSheetService.fetchOrdersFromSheet` intentionally re-filters server results client-side: the
GAS `?search=` is a loose full-row match, so a query like `537` can return orders whose *amount*
happens to match. The client re-checks that the query appears in one of the nickname-ish columns
and drops everything else. Do not remove that guard. It also **merges rows sharing an 訂單ID into
one `Order` with multiple `items`**.

### Group-buy data loading is two-tier (deliberate)

`fetchTeams()` requests `lite=1`. The backend returns one synthesized "product" per team (all item
names concatenated for search, plus one cover image) instead of every SKU — this cut the payload
from ~1.4 MB to ~250 KB across ~139 teams. The list page, search, and tag filtering all run on that
lite index. Full item detail (price, spec, multi-image) is fetched **only when a customer opens a
team**, via `fetchTeamItems(code)`. Keep that split; don't "simplify" the list page into loading
everything.

### Work/IP tagging (`services/ipTags.ts`)

Teams get anime-series tags for the list-page filter. Precedence: the backend 標籤 column → derived
from the team name → derived from up to 400 item names. `IP_DICT` maps a canonical Taiwanese title
to alias spellings (Traditional, Simplified, Japanese, English, fan abbreviations). Only actual
**works/series** belong here — never distributors or manufacturers (JCS, MOVIC, SEGA…), because
customers search by series. Add new entries to `IP_DICT` as new franchises are stocked.

### LINE / LIFF integration

`App.tsx` calls `liff.init({ liffId: '2009367290-DGz77pHN' })` on mount. If the user is logged in
**and** is on the lookup home (not `/order*` or `/closing*`), it fetches their LINE profile, resolves
it to a shop nickname via `getNickname`, and auto-runs the search behind a full-screen splash
(`liffBoot`) with a 15 s safety timeout. The `/order` and `/closing` exclusion is intentional: a
customer following a form link should land on the form, not be hijacked into order lookup.

Several LIFF/API error paths call `alert()` with raw diagnostics (including the user's LINE ID).
These are deliberate field-debugging aids ("照妖鏡") the shop owner uses when a binding fails. Ask
before removing them.

### Business rules that live in the client

- **`isOpen(team)`** (`groupOrderService.ts`) — a team is closed if its status says so **or** its
  `closeAt` has passed. It re-evaluates against `Date.now()` on every call, so a page left open past
  the deadline still blocks submission (checked again in `OrderForm.doSend`).
- **`closingSoon(team)`** compares *calendar days*, not `daysLeft()`'s `ceil` of milliseconds —
  a team closing tomorrow evening would otherwise read as "2 days" this morning.
- **`getStorageStatus(arrivalDate)`** (duplicated in `App.tsx` and `OrderDetailModal.tsx`) — the
  warehouse consolidation window is **25 days** from 抵台日期; the badge is mint / yellow / pink for
  healthy / ≤5 days / overdue. If you change the limit or colors, change **both** copies.
- Order tab classification: 待付款 = not reconciled; 可出貨 = reconciled + 已抵台 + not shipped;
  已完成 = reconciled + 已抵台 + shipped. After a search, the app auto-selects the most actionable tab.
- `OrderForm` writes `localStorage['kaguya_order_done_<團代號>']` after a successful submit and warns
  (but does not block) on a repeat submission from the same device.

## File map

```
App.tsx                    ~1000 lines: routing, LIFF boot, order search/filter/sort state,
                           home page (search, closing-soon rail, NEWS, SNS), results page,
                           checkout bar, full-screen NEWS list/detail. The hub — start here.
config.ts                  GAS endpoints, social links, Chinese column mapping. Edit for URL changes.
types.ts                   All shared types: Order, Announcement, GroupTeam, GroupProduct,
                           GroupCartItem, MySubmission, ColumnMapping.
index.html                 Tailwind CDN + config, custom CSS/keyframes, PWA + OG meta, importmap.
netlify.toml               build = npm run build, publish = dist, SPA redirect.
public/manifest.json       PWA manifest; public/icons/, public/hankos/ (wax-seal product gallery).

services/
  googleSheetService.ts    Order search, announcements, likes, LINE-ID → nickname.
  groupOrderService.ts     Teams/items fetch, submit, my-submissions + date & isOpen/closingSoon helpers.
  ipTags.ts                IP_DICT alias dictionary, tagsOfTeam, buildTagIndex.

components/
  GroupOrderList.tsx       Team list: search by team/product name, tag multi-select, open/closed
                           checkboxes, sort, 30-per-page. Doubles as the home-page preview (`preview`).
  OrderForm.tsx            One team's form: category pills, qty steppers, multi-image cards,
                           lightbox, confirm sheet, submit, success screen.
  OrderLookup.tsx          "填單明細查詢" — look up your own submissions by nickname, split into
                           open / closed-but-not-yet-purchased buckets.
  ClosingList.tsx          /closing page — teams closing today/tomorrow.
  ProductCarousel.tsx      Swipe/tap-disambiguating image carousel used by OrderForm cards.
  OrderDetailModal.tsx     Single order detail + "pay this one" entry point.
  PaymentModal.tsx         Deposit (bank transfer / cardless deposit) and 賣貨便 balance flows;
                           builds a copy-paste LINE message and redirects.
  AboutSection.tsx         About page (numbered advantage cards).
  FaqSection.tsx           FAQ accordion; content lives in the CATEGORIES const.
  AdminDashboard.tsx       Hidden owner-only panel (padlock in footer). Local-only mock; not wired
                           to any backend.
```

### Dead code — present but never rendered

- `components/Aurora.tsx` — WebGL aurora background; imported by `App.tsx` but never rendered.
- `components/NewsModal.tsx` — superseded by the inline full-screen NEWS pages in `App.tsx`; imported
  but never rendered.
- `services/geminiService.ts` — Gemini calls, imported by nothing.
- `services/bankService.ts` — simulated CTBC virtual accounts, imported by nothing.

Don't treat these as live behaviour when reasoning about a change. Leaving them is fine; if a task
touches them, prefer deleting over "fixing".

## Conventions

- **Comments and commit messages are Traditional Chinese.** Comments explain *why the shop needs
  this*, often citing a real customer problem ("舊的 #/order/xxx 連結已經貼在社群裡了，永遠要能開").
  Match that voice — explain the business reason, not the syntax. Emoji markers (🎯 🌟 ⚠️) are
  common in `App.tsx`; new code doesn't need them, but don't strip existing ones.
- **Styling: "Soft Pop" / toy aesthetic.** Thick black borders (`border-[2.5px] border-black`), hard
  offset shadows (`shadow-[4px_4px_0px_#000]`), fully-round pills, `font-[900]`, press feedback via
  `active:translate-y-1 active:shadow-none`. Palette:

  | Hex | Role |
  | --- | --- |
  | `#4c59a1` | primary indigo — page background, headings, PWA theme |
  | `#3ac0bf` | mint — primary action, back buttons, accents |
  | `#f8a3f4` / `#ffaefe` | pink — secondary action, NEWS pages |
  | `#fff170` | yellow — group-buy pages, warning badges |
  | `#fdfbf0` | cream — results canvas |
  | `#f43f5e` | red — "closing today" urgency |

  Reuse these hexes rather than introducing new ones or Tailwind's named palette.
- **Components are self-contained**: default export, a local `interface Props`, callbacks passed
  down from `App.tsx` (`onBack`, `onSelect`, `onGoQuery`). No context, no state library, no
  `useReducer` — everything is `useState`/`useMemo` in `App.tsx` or the component itself.
- **Remote images always carry `referrerPolicy="no-referrer"`** (imgur/Drive-hosted images 403
  otherwise) and product images use `loading="lazy" decoding="async"`.
- **Defensive parsing everywhere**: `String(x ?? "").trim()`, `Number(x) || 0`, money via
  `Number(String(v).replace(/[$,]/g,''))`. Sheet data is hand-entered and frequently malformed;
  every service already fails soft (returns `[]`) rather than throwing. Preserve that.
- Chinese IME: text inputs that submit on Enter check `!(e.nativeEvent as any).isComposing` so
  confirming a candidate doesn't fire a search. Copy that guard on any new Enter-to-submit input.

## Git workflow

Default branch is `main`; the remote is `chiaweiwei0711/kaguya_ordersearch`. Netlify builds from the
repo, so anything merged to `main` ships. Commit subjects follow the existing history —
Chinese prose, optionally with a `feat:` / `fix:` / `chore:` prefix, e.g.
`feat: 首頁「即將結單」橫滑卡＋#/closing 明日結單分享頁`.

Do not commit `.env.local`, `node_modules/`, or `dist/` (all gitignored).

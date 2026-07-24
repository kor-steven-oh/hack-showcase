# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

S.LSI Hello AI Hackathon 전시관 — a 2D isometric virtual exhibition hall rendered on `<canvas>`. Visitors walk an avatar (WASD/arrows/touch pad/click-to-move) through a hall of 20 booths across 5 hackathon tracks, open project detail modals (Space; canvas click only moves), and chat. Runs standalone from file:// (offline), or multiuser via the bundled Node WebSocket server. Korean UI, Pretendard font from CDN.

## Structure

No build step. External deps: Pretendard CDN link (client) + `ws` package (server only).

- `js/` — logic, split into classic scripts sharing globals; **load order matters** (theme → data → world → render → main → net, as listed in the HTML):
  - `theme.js` — canvas color palettes (`PALETTES`, `P`)
  - `data.js` — `TRACKS` + seeded sample `EXHIBITS`
  - `world.js` — geometry constants, math helpers, `BOOTHS`/`DECOR` placement, `FLOOR`/`WALLS` precompute, collision (`walkable`)
  - `render.js` — canvas setup, all `draw*` functions, billboard typewriter, minimap, `render()`
  - `main.js` — player/NPC/vacuum entities, input, `update()`, rAF loop, modals, reaction minigame, chat
  - `net.js` — `NET` WebSocket client (position/chat/notes/ranks sync); silently offline when opened via file://
- `server.js` — static file serving + WS relay (port 3210, `/` serves the **white** theme). Persists message-wall notes (`idea-notes.json`) and reaction-game leaderboard (`reaction-scores.json`) as debounced JSON-file writes (gitignored). Position snapshots run at 5Hz using 12×12 spatial AOI cells (current + 8 neighbors), cap crowded views to each client's nearest 150 users, and repair local full state every 5s. Full snapshots deactivate clients that left the AOI; dropped clients reconnect with exponential backoff. Guards: malformed URLs return 400, 30s ping/pong heartbeat, message rate limits, 4KB WS payload cap, and `bufferedAmount` backpressure.
- `exhibition.css` — all styles; theme colors live in CSS variables (`:root` = dark defaults, `[data-theme="white"]` = light overrides)
- `hello-ai-exhibition.html` — dark theme entry point (markup only)
- `hello-ai-exhibition-white.html` — light theme entry point; identical markup except `<html data-theme="white">` and title

Theming: DOM colors come from CSS variables. Canvas colors come from the `PALETTES` object in `js/theme.js`, selected via `document.documentElement.dataset.theme`. A new color used in canvas drawing must be added to **both** palettes; markup changes must be mirrored in both HTML files (they share css/js, only the `<body>` is duplicated).

## Run

```bash
node server.js                       # multiuser — http://localhost:3210 (white theme at /)
open hello-ai-exhibition-white.html  # or offline, no server
```

## Code architecture (`js/`)

Sections are marked with `/* ---------- 섹션명 ---------- */` comments:

0. **테마 팔레트** — `PALETTES.dark/.white`, canvas-only colors (see Theming above).
1. **트랙(5)** — `TRACKS` array: 5 tracks (T1 설계·EDA … T5 개발생산성·DevX), each with accent color, tagline, tags, and project titles.
2. **샘플 데이터 (seeded)** — `EXHIBITS` (20 booths = 4 per track) generated from a seeded PRNG (`rng(20260607)`), so team names/members/awards are random-looking but deterministic. Replace this block to plug in real project data. `videoUrl:''` — set to embed URL to show a video in the modal.
3. **지오메트리** — isometric math: `w2s()` grid→screen projection, `TW/TH` tile size, `HALL_W×HALL_D` (82×47) hall. Booths are grouped per track into `ZONES` (5 zone centers, 2×2 booths each, spacing `BOOTH_DX`/`BOOTH_DY`); track banner + carpet + floating zone boundary lines + zone-pill detection all derive from `ZONES`. Zones have no partition walls — translucent accent lines float at NPC height along the carpet perimeter (depth-sorted per-tile segments: above outer walls, behind booth panels). Central plaza (`PLAZA`) holds the static HELLO AI billboard; `PG` is the playground rect (arcade minigame cabinets, benches). `DECOR` lists all indoor furniture — billboards, per-zone lounges at `z.cx-2` (accent-colored facing sofas + long table + seated NPCs), message-wall boards (between T1/T4 and T3/T5, `act:'idea'`), cafe lounge, info desk (drawn, no collision — only outer walls + playground partition collide). Entries with an `act` key are interactive: nearest one within radius becomes `activeSpot`, routed in `actSpot()` (main.js) to its modal (minigame / message wall / info guide). The big west-wall billboard (`notes:1`, `face:'ul'`, `zd` forced above wall depth) live-cycles message-wall notes.
4. **캔버스 / 바닥 사전계산 / 엔티티** — main canvas + minimap, precomputed `FLOOR`/`WALLS`, `player` + wandering `npcs` + robot vacuum (`vac`, aisle-roaming, sparkle trail) + 4 docent bots (`guides` — pushed into `npcs` so they reuse the NPC walk state machine; `isBot:1` gives them a robot head in `drawChar` and routes retargeting through `guideTarget()`, which samples 6 candidates and picks the one farthest from the other docents. They carry `act:'info'`, stop and face the player within 2.4 tiles, cycle `GUIDE_TIPS` speech bubbles, and Space opens the same `openInfo()` modal as the info desk). `CHARS` is the depth-merge list; `net.js rebuild()` reconstructs it on join/leave and must include `vac`.
5. **충돌 / 입력 / 업데이트** — `walkable()` collision, keyboard + on-screen touchpad + click-to-move (canvas click inverse-projects through `camX/camY` into `player.tgt`; keyboard input cancels it, arrival or wall-block clears it — clicking never opens modals, that's Space / the mobile act button), per-frame `update()` (movement, vacuum roam, docent stop-near-player + tip bubbles, nearest-booth highlight, zone pill, camera). Docents also compete with `DECOR` spots for `activeSpot`.
6. **그리기 / 렌더** — depth-sorted entity render (`d = gx+gy`), booth/banner/char/vacuum draw functions, particles, minimap; `requestAnimationFrame` loop. Billboards: prerendered screens (no per-frame shadowBlur); `cycle`/`notes` billboards use a typewriter effect (`typedText` state machine — type 0.07s/char, hold 3s, backspace 0.04s/char) re-rendering only when the displayed string changes. Shape-matched floor shadows via `shadowIso()` (isoBox footprint parallelogram); round entities keep ellipse shadows. Canvas-only font weights (900) must be loaded explicitly via `document.fonts.load` — the `loadingdone` listener invalidates prerender caches.
7. **모달 / 미니게임 / 전체 채팅** — booth detail modal (`openModal(ex)`), message wall (`openIdea()` — notes synced to server, localStorage offline fallback), reaction minigame (`openGame()` + `gameRanks` leaderboard panel; scores validated server-side 80–3000ms, best-per-nick TOP 10), chat (server relay via `NET.chat`, 200-message DOM cap, 6s speech bubble above the character — `e.say`/`e.sayUntil`).

## Multiuser protocol (`server.js` ↔ `js/net.js`)

JSON messages over WS: `hello`/`welcome` (join; welcome carries full user list + `notes` + `ranks`), `join`/`leave`, `pos` (client 10Hz) → `snap` (server 5Hz AOI batched; client renders 320ms behind with bounded extrapolation), `chat`, `idea` (message-wall note), `gameStart` → `gameGo` → `score` (`gameCancel` aborts; server measures the elapsed time) → `ranks`. Display text says "메시지 월" but internal keys/files keep the original `idea` naming — don't rename protocol fields.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

S.LSI Hello AI Hackathon 전시관 — a 2D isometric virtual exhibition hall rendered on `<canvas>`. Visitors walk an avatar (WASD/arrows/touch pad) through a hall of 20 booths across 5 hackathon tracks, open project detail modals (E/click), and see a chat panel. Korean UI, Pretendard font from CDN.

## Structure

No build step; only external dependency is the Pretendard CDN link.

- `js/` — logic, split into classic scripts sharing globals; **load order matters** (theme → data → world → render → main, as listed in the HTML):
  - `theme.js` — canvas color palettes (`PALETTES`, `P`)
  - `data.js` — `TRACKS` + seeded sample `EXHIBITS`
  - `world.js` — geometry constants, math helpers, `BOOTHS`/`DECOR` placement, `FLOOR`/`WALLS` precompute, collision (`walkable`)
  - `render.js` — canvas setup, all `draw*` functions, minimap, `render()`
  - `main.js` — player/NPC entities, input, `update()`, rAF loop, modal, chat
- `exhibition.css` — all styles; theme colors live in CSS variables (`:root` = dark defaults, `[data-theme="white"]` = light overrides)
- `hello-ai-exhibition.html` — dark theme entry point (markup only)
- `hello-ai-exhibition-white.html` — light theme entry point; identical markup except `<html data-theme="white">` and title

Theming: DOM colors come from CSS variables. Canvas colors come from the `PALETTES` object in `js/theme.js`, selected via `document.documentElement.dataset.theme`. A new color used in canvas drawing must be added to **both** palettes; markup changes must be mirrored in both HTML files (they share css/js, only the `<body>` is duplicated).

## Run

Open the HTML file in a browser — no server needed:

```bash
open hello-ai-exhibition.html
```

## Code architecture (`js/`)

Sections are marked with `/* ---------- 섹션명 ---------- */` comments:

0. **테마 팔레트** — `PALETTES.dark/.white`, canvas-only colors (see Theming above).
1. **트랙(5)** — `TRACKS` array: 5 tracks (T1 설계·EDA … T5 개발생산성·DevX), each with accent color, tagline, tags, and project titles.
2. **샘플 데이터 (seeded)** — `EXHIBITS` (20 booths = 4 per track) generated from a seeded PRNG (`rng(20260607)`), so team names/members/awards are random-looking but deterministic. Replace this block to plug in real project data. `videoUrl:''` — set to embed URL to show a video in the modal.
3. **지오메트리** — isometric math: `w2s()` grid→screen projection, `TW/TH` tile size, `HALL_W×HALL_D` (82×47) hall. Booths are grouped per track into `ZONES` (5 zone centers, 2×2 booths each, spacing `BOOTH_DX`/`BOOTH_DY`); track banner + carpet + floating zone boundary lines + zone-pill detection all derive from `ZONES`. Zones have no partition walls — translucent accent lines float at NPC height along the carpet perimeter (depth-sorted per-tile segments: above outer walls, behind booth panels). Central plaza (`PLAZA`) holds the HELLO AI billboard; `PG` is the playground rect (arcade minigame cabinets, benches). `DECOR` lists all indoor furniture — billboards, per-zone lounges (accent-colored facing sofas + long table + seated NPCs with nicknames), idea-wall boards, cafe lounge (bar with barista, food/drink cases, vending row, long/round tables, chairs, sitters), info desk (drawn, no collision — only outer walls + playground partition collide). Entries with an `act` key are interactive: nearest one within radius becomes `activeSpot`, routed in `actSpot()` (main.js) to its modal (minigame / idea wall notes / info guide).
4. **캔버스 / 바닥 사전계산 / 엔티티** — main canvas + minimap, precomputed `FLOOR`/`WALLS`, `player` + wandering `npcs`.
5. **충돌 / 입력 / 업데이트** — `walkable()` collision, keyboard + on-screen touchpad, per-frame `update()` (movement, nearest-booth highlight, zone pill, camera).
6. **그리기 / 렌더** — depth-sorted entity render (`d = gx+gy`), booth/banner/char draw functions, particles, minimap; `requestAnimationFrame` loop.
7. **모달 / 전체 채팅** — booth detail modal (`openModal(ex)` builds HTML from an exhibit), chat UI. Chat is local-only; server send is a stub (`// TODO(backend): socket.emit('chat',...)`).

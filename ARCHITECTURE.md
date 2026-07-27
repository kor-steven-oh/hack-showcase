# ARCHITECTURE

## 전체 그림

```
브라우저 (canvas 렌더링, 빌드 없음)
 ├─ hello-ai-exhibition.html / -white.html   ← 얇은 진입점 (마크업만, 테마·title만 다름)
 ├─ exhibition.css                           ← DOM 스타일 (테마 = CSS 변수)
 └─ js/  ─ classic script, 전역 공유, 로드 순서 고정 ─
     theme.js → data.js → world.js → render.js → main.js → net.js
                                                              │ WebSocket (선택)
server.js ────────────────────────────────────────────────────┘
 정적 서빙 + WS 중계 (포트 3210) · idea-notes.json / reaction-scores.json / team-likes.json 영속화
```

file:// 로 열면 `net.js`가 조용히 오프라인 모드로 남고 나머지는 전부 동작한다.

## 모듈 (js/, 로드 순서 = 의존 순서)

| 파일 | 책임 | 핵심 전역 |
|---|---|---|
| `theme.js` | 캔버스 전용 색 팔레트 | `PALETTES`, `P` |
| `data.js` | 트랙 5개 + seeded PRNG 샘플 부스 20개 | `TRACKS`, `EXHIBITS` |
| `world.js` | 아이소메트릭 수학, 홀 지오메트리, 배치, 충돌 | `w2s()`, `BOOTHS`, `ZONES`, `DECOR`, `FLOOR`/`WALLS`, `walkable()` |
| `render.js` | 모든 `draw*`, 전광판 타자기, 미니맵, `render()` | `MAX_VISIBLE_REMOTES` |
| `main.js` | 엔티티(player/NPC 50/도슨트 4/AI 심사위원 5/청소기), 입력, `update()`, rAF 루프, 모달, 미니게임, 실제·더미 채팅 | `player`, `npcs`, `CHARS` |
| `net.js` | WS 클라이언트, 원격 사용자 보간·동기화, 실제 접속자 수 계산 | `NET` |

섹션 구분은 `/* ---------- 섹션명 ---------- */` 주석 — 상세는 CLAUDE.md 참고.

## 렌더 파이프라인

1. `FLOOR`/`WALLS` 사전계산 (기동 시 1회).
2. 매 프레임: `update()` (이동·충돌·카메라·근접 판정) → `render()`.
3. 엔티티는 `d = gx+gy` 깊이 정렬 후 그리기. 화면 밖 원격 캐릭터는 정렬·드로우 제외, 화면 안에서도 근접 120명 상한.
4. 전광판은 프리렌더 캔버스 + 타자기 상태머신 — 표시 문자열이 바뀔 때만 다시 그림.
5. 입장 화면·모달 뒤 캔버스는 10FPS로 스로틀.

## 테마

- **DOM**: CSS 변수. `:root` = 다크, `[data-theme="white"]` = 오버라이드.
- **캔버스**: `PALETTES.dark/.white`, `document.documentElement.dataset.theme`으로 선택.
- 규칙: 캔버스에 새 색을 쓰면 **두 팔레트 모두** 추가. 마크업 변경은 **두 HTML 모두** 반영.

## 멀티유저 프로토콜 (server.js ↔ net.js)

WS 위 JSON 메시지.

```
hello → welcome(전체 유저 + notes + ranks + likes)
join / leave
pos(클라 10Hz) → snap(서버 5Hz, AOI 배치)
chat
idea            ← 메시지 월 노트 (표기명은 "메시지 월"이지만 프로토콜 키는 idea — 변경 금지)
gameStart → gameGo → score(서버가 시간 측정·검증) → ranks   (gameCancel 중단)
vote(팀 id) → likes(20개 팀 누적 좋아요)
```

`net.js`의 `remotes`는 AOI 활성 여부와 별개로 전체 입퇴장 목록을 유지한다. `NET.userCount()`는 이 목록으로 본인을 포함한 실제 접속자 수를 제공하며, 연결 중에는 더미 채팅을 보류한다.

### 위치 동기화 (500명 대비 설계)

- 서버: 12×12 타일 공간 셀 AOI. 현재 셀 + 인접 8셀 대상, 혼잡 시 가까운 150명 상한(`MAX_AOI_USERS`), 5초마다 전체 상태 보정(이탈 사용자 정리), `bufferedAmount ≥ 256KiB`면 스냅샷 생략.
- 클라: 320ms 뒤 시점 보간(`INTERP_DELAY`), 외삽 상한 180ms, 700ms 미수신 시 보간 리셋. 마지막 두 샘플 유지.
- **연동 규칙**: 서버 스냅샷 주기(200ms)를 바꾸면 `net.js`의 `SNAP_INTERVAL`·`INTERP_DELAY`도 함께 조정.

튜닝 상수 전체 표와 부하 테스트 실측치는 PERFORMANCE_CONTEXT.md.

### 서버 가드

400(잘못된 URL), 30초 ping/pong, 메시지 레이트 리밋, 4KB 페이로드 상한, 백프레셔. 메시지 월·게임 랭킹·팀 좋아요는 250ms debounce로 JSON 파일 저장 (gitignore).

## 영속화

파일 DB 3개 — `idea-notes.json`(메시지 월), `reaction-scores.json`(게임 랭킹), `team-likes.json`(팀 좋아요). 대규모 사용 시 SQLite 전환 검토 항목 (TASKS.md).

## 테스트

`node test-network.js` — WS 근거리 스냅샷 수신, full snapshot 기반 AOI 이탈 정리, 활성 목록·재접속·접속자 수·팀 투표 검증과 AI 심사위원/프로젝트 모달/더미 채팅 설정 검사.

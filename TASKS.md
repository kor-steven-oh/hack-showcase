# TASKS

## 진행 예정 (우선순위순 — PERFORMANCE_CONTEXT.md 후속)

- [ ] **T1. 실기기 FPS 측정** — 모바일·저사양 노트북에서 NPC 200 + 원격 밀집 화면 FPS 확인. 미달 시 `MAX_VISIBLE_REMOTES`(120) 하향 또는 NPC 수 조정.
- [ ] **T2. 운영 서버 관측** — 배포 환경에서 WS 송신량, 이벤트 루프 지연, 메모리/GC 측정. 합성 부하 테스트(로컬)와 실환경 격차 확인.
- [ ] **T3. 밀집 상한 튜닝** — 중앙 광장 등 실제 밀도 기준으로 `MAX_AOI_USERS`(150) / `MAX_VISIBLE_REMOTES`(120) 조정.
- [ ] **T4. 영속화 전환 검토** — 메시지 월 대규모 사용 시 JSON 파일 → SQLite. 현재 debounce 파일 쓰기는 소규모 전제 (DECISIONS.md D5).
- [ ] **T5. 거리 정렬 비용 개선** — 500명 초과 목표 시 밀집 셀의 사용자별 거리 정렬 최적화.
- [ ] **T6. 실데이터 교체** — `js/data.js` `EXHIBITS` 샘플을 실제 20개 프로젝트로 교체. `videoUrl`에 발표 영상 연결.

## 완료

- [x] 아이소메트릭 홀 + 트랙 존 5개 + 부스 20개 (`24fdc46`)
- [x] 플레이그라운드·NPC 닉네임·홀 확장 (`0ccfc51`)
- [x] `exhibition.js` → `js/` 모듈 분리 (`07aeef8`)
- [x] 렌더 성능 개선·레이아웃 개편 (`d55ca60`, `f70a13c`)
- [x] 멀티유저 서버 + 메시지 월 + 미니게임 랭킹 (`36caa17`)
- [x] 도슨트 봇 4대 + 클릭 이동 + 카페 라운지 (`141ddae`)
- [x] 원격 스냅샷 보간 + 부스 전방향 활성화 (`7e7311d`)
- [x] AOI 위치 동기화·백프레셔·재접속 — 500명 부하 검증 (`675d823`, `6d47cef`)
- [x] NPC 200명 확대 (`4f7bd72`)

## 작업 규칙 (반복 실수 방지)

- 마크업 수정은 HTML 2개 모두. 캔버스 신규 색은 `PALETTES` 양쪽 모두.
- 서버 스냅샷 주기 변경 시 `net.js` `SNAP_INTERVAL`·`INTERP_DELAY` 동반 조정.
- WS 프로토콜 키 `idea` 리네임 금지.
- 변경 후 `node --check server.js` + `for f in js/*.js; do node --check "$f"; done` + `node test-network.js`.

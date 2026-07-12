# hack-showcase

S.LSI Hello AI Hackathon 온라인 전시관. 아이소메트릭 2D 캔버스 위에서 아바타로 홀을 돌아다니며 해커톤 프로젝트 부스를 관람하는 싱글 페이지 웹앱입니다. 빌드 없이 브라우저에서 바로 실행됩니다.

## 실행

```bash
open hello-ai-exhibition.html        # 다크 테마
open hello-ai-exhibition-white.html  # 화이트 테마
```

서버 불필요. 외부 의존성은 Pretendard 폰트 CDN 하나뿐.

## 조작

| 키 | 동작 |
|---|---|
| `W A S D` / 화살표 | 이동 |
| `Space` / 클릭 | 가까운 부스 관람 (상세 모달) |
| `Esc` | 모달 닫기 |

모바일은 화면 터치패드 지원.

## 구성

- **트랙 존 5개** — 설계·EDA / 수율·품질 / 설비·운영 / HR·People / 개발생산성·DevX. 존마다 2×2 부스, 트랙 색 카펫과 파티션 벽
- **중앙 광장** — HELLO AI 전광판, 벤치·나무
- **플레이그라운드** — 아케이드 미니게임 캐비닛 6대 (게임 로직은 추후)
- **전체 채팅** — UI만 구현, 서버 연결 전 (`sendChat()`의 TODO 참고)
- NPC 20명이 닉네임을 달고 부스 사이를 배회

## 파일 구조

| 파일 | 역할 |
|---|---|
| `js/theme.js` | 캔버스 테마 팔레트 |
| `js/data.js` | 트랙 정의 + 샘플 전시 데이터 |
| `js/world.js` | 지오메트리 · 부스/장식 배치 · 바닥/벽 · 충돌 |
| `js/render.js` | 캔버스 draw 함수 · 미니맵 · 렌더 |
| `js/main.js` | 플레이어/NPC · 입력 · 게임 루프 · 모달 · 채팅 |
| `exhibition.css` | 스타일. 테마 색은 CSS 변수 (`:root` 다크, `[data-theme="white"]` 오버라이드) |
| `hello-ai-exhibition*.html` | 얇은 진입점 (마크업만, `data-theme`과 title만 다름). 스크립트 로드 순서 유지 필요 |

## 데이터 교체

부스 20개는 `js/data.js`의 `EXHIBITS`에서 seeded PRNG로 생성한 샘플입니다. 실제 프로젝트 데이터로 바꾸려면 그 블록을 교체하세요. `videoUrl`에 유튜브 영상 ID를 넣으면 상세 모달에서 재생됩니다.

/* 트랙 정의 + 샘플 전시 데이터(seeded) — 실데이터 교체 지점 */

/* ---------- 트랙(5) ---------- */
const TRACKS=[
  {code:'T1',name:'설계 · EDA',accent:'#3d7bff',
   tagline:'반도체 설계 흐름을 AI로 가속',
   blurb:'EDA 툴체인에 에이전트를 결합해 반복 검증과 최적화를 자동화합니다. 설계자는 판단이 필요한 핵심 작업에만 집중할 수 있습니다.',
   tags:['EDA','Layout','Timing','DRC','RTL','Agent'],
   titles:['레이아웃 자동 검수 에이전트','타이밍 클로저 코파일럿','DRC 위반 예측 모델','셀 배치 최적화 엔진','RTL 리뷰 어시스턴트','전력 격자 이상 진단']},
  {code:'T2',name:'수율 · 품질',accent:'#e0872f',
   tagline:'수율 하락의 전조를 먼저 포착',
   blurb:'공정 데이터를 학습해 이상 로트를 조기 경보하고 근본 원인을 랭킹합니다. 품질 엔지니어의 의사결정 속도를 높입니다.',
   tags:['Yield','Anomaly','SPC','Vision','시계열','품질'],
   titles:['수율 이상탐지 대시보드','결함 이미지 자동 분류','웨이퍼 맵 패턴 인식','공정 파라미터 추천기','불량 원인 추적 그래프','검사 리포트 자동화']},
  {code:'T3',name:'설비 · 운영',accent:'#e0533f',
   tagline:'설비 운영을 더 안전하고 빠르게',
   blurb:'알람과 로그의 홍수 속에서 진짜 중요한 신호를 골라냅니다. 예지보전으로 다운타임을 줄입니다.',
   tags:['PdM','Alarm','IoT','예지보전','로그','운영'],
   titles:['설비 알람 우선순위 분류기','예지보전 잔여수명 예측','설비 로그 이상 요약','정비 매뉴얼 검색봇','챔버 상태 모니터','교대 인수인계 자동요약']},
  {code:'T4',name:'HR · People',accent:'#21a17a',
   tagline:'구성원의 경험을 AI로 돌봄',
   blurb:'온보딩부터 성장까지 사람 중심의 여정을 지원합니다. HR 담당자의 반복 업무를 덜어줍니다.',
   tags:['HR','People','온보딩','챗봇','교육','성장'],
   titles:['HR 온보딩 AI 가이드','사내 규정 질의응답봇','교육과정 추천 에이전트','리더십 피드백 코치','조직 서베이 요약','경력개발 로드맵 도우미']},
  {code:'T5',name:'개발생산성 · DevX',accent:'#1a8fe3',
   tagline:'개발자의 하루를 가볍게',
   blurb:'리뷰·테스트·문서를 자동화해 반복을 줄입니다. Claude Code 기반 에이전트가 개발 흐름에 스며듭니다.',
   tags:['DevX','Claude Code','CI','Test','리뷰','자동화'],
   titles:['코드리뷰 부스터','테스트 케이스 생성기','PR 요약 & 릴리즈노트','사내 API 문서봇','로그 디버깅 어시스턴트','커밋 컨벤션 가디언']},
];

/* ---------- 샘플 데이터 (seeded) ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const R=rng(20260607);
const pick=a=>a[(R()*a.length)|0];
const SUR=['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍','유','고','문','양','배','백','허','남'];
const GIV=['서준','도윤','하은','지우','예린','민재','수아','현우','지민','채원','동혁','소미','태호','지안','예준','하린','승민','유진','건우','다현','시우','나연','재현','하늘','도현','서연','민준','지원','은우','가은'];
const ROLE=['백엔드','프론트엔드','ML · 모델링','데이터','기획 · PM','디자인','인프라','분석','풀스택'];
const TEAMW=['놀리지허브','옐로우존','미미르','알람브레이커','리뷰파이','미팅메이트','웰컴온','레이아웃크루','데이터하베스트','오토파일럿','코드가디언','인사이트랩','넥스트웨이브','픽셀포지','스마트로직','뉴런','시그널랩','파운더스','퀀텀리프','오라클','블루프린트','하이퍼루프'];
const TIERS=[['대상','i9'],['최우수','i7'],['우수','i5'],['장려','i3']];
function members(){const n=3+((R()<0.45)?1:0);const arr=[];for(let i=0;i<n;i++){arr.push([pick(SUR)+pick(GIV), i===0?'팀장':pick(ROLE)]);}return arr;}
function pickTags(pool){const c=[...pool];const out=[];for(let i=0;i<4&&c.length;i++){out.push(c.splice((R()*c.length)|0,1)[0]);}return out;}

const EXHIBITS=[]; let _id=0;
const PER_TRACK=4;
TRACKS.forEach((tr,ti)=>{
  tr.titles.slice(0,PER_TRACK).forEach((title,idx)=>{
    _id++;
    let tier = idx===0?TIERS[1]:(idx===1?TIERS[2]:TIERS[3]);
    if((ti===0&&idx===0)||(ti===4&&idx===0)) tier=TIERS[0];
    EXHIBITS.push({
      id:_id, trackIdx:ti, code:tr.code, trackName:tr.name, accent:tr.accent,
      title, team:'Team '+pick(TEAMW), award:'AI '+tier[1]+' · '+tier[0],
      summary:title+' — '+tr.tagline, desc:tr.blurb,
      tags:pickTags(tr.tags), members:members(), videoUrl:''
    });
  });
});

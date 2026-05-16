# 0biglife.com — 인터랙티브 작업물 갤러리 설계

날짜: 2026-05-16
상태: 승인됨 (구현 계획 단계로 진행)

## 배경 / 목표

0biglife.com을 단순 글 블로그에서 **인터랙티브 작업물 전시장**으로 확장한다.
참고: byunsabum(인스타), sharex.fastcampus.co.kr.

- 메인에 들어오면 전시회처럼 작업물 카드가 라이브로 동작
- 작업물에 들어가면 실제 인터랙티브 아웃풋을 풀로 보고, 코드를 보고/가져갈 수 있음
- 백엔드 없이 기존 Next.js 15 + MDX 구조 유지 (런타임 API 의존 없음, 전부 빌드타임 SSG)

> **정정 (2026-05-16):** 초기 설계는 "정적 export"로 적었으나, 레포는 실제로 `next.config.ts`의 `output: "standalone"`(Node 서버 번들)로 빌드된다. 작업물 페이지는 전부 SSG로 prerender되고 데이터 접근도 빌드타임 `fs`뿐이라 기능상 차이는 없으나, 배포 호스트는 standalone Node 서버를 구동해야 한다 (기존 `/rss.xml` 동적 라우트도 이미 이를 전제).

## 확정된 핵심 결정

| 항목 | 결정 |
|---|---|
| 콘텐츠 형태 | vanilla HTML/CSS/JS · React · 크리에이티브 코딩 혼합 |
| 데모 빌드 | 빌드 없는 자기완결 폴더 (React=esm.sh, three.js=CDN) |
| 코드 가져가기 | 사이트 내 코드뷰 + ZIP 다운로드 **그리고** 깃헙 레포 링크 (둘 다) |
| 포크/라이브 에디터 | 안 함 (범위에서 제외) |
| 갤러리 첫인상 | 라이브 동작 그리드 |
| 공유 | Web Share API 단일화 + 데스크톱 링크복사 폴백 (카카오·X 제외) |

## 1. 사이트 구조

- `/` — 라이브 동작 그리드 갤러리 (새 메인)
- `/works/[slug]` — 작업물 상세 (뷰어 + 코드 탭 + 다운로드/깃헙/공유 + 설명글)
- `/log` — 기존 글/개발로그 이전 (전시 컨셉과 분리)
- 태그 필터 (CSS, WebGL, React, 애니메이션 등)

## 2. 포스트 = 폴더 하나 (자기완결, 단일 진실)

```
content/works/<slug>/
├── index.mdx        # frontmatter + 작품 설명글
├── demo/            # 빌드 없이 그대로 도는 실행 파일들
│   ├── index.html
│   ├── style.css
│   └── script.js
└── cover.png        # 라이브 마운트 전 폴백 썸네일
```

frontmatter:
```yaml
title: "유체 커서 트레일"
date: 2026-05-16
type: webgl            # vanilla | react | webgl
tags: [WebGL, 마우스인터랙션]
summary: "한 줄 소개"
github: "https://github.com/0biglife/..."
aspectRatio: "16/9"
autoplay: true
```

폴더 하나 = 실행 소스 + 코드뷰 원본 + ZIP 원본 + 설명글.

## 3. 갤러리 홈 — 라이브 동작 그리드

각 카드가 데모를 iframe으로 축소 재생. 성능 가드레일:

- **IntersectionObserver**: 뷰포트 근처 카드만 iframe 마운트, 멀어지면 언마운트
- **동시 실행 캡**: 라이브 iframe 최대 6개, 초과분은 `cover.png` 정지
- **단계적 로드**: 카드는 항상 `cover.png`로 즉시 표시 → 보이면 iframe 페이드인
- `prefers-reduced-motion` 사용자는 전부 정지 썸네일

## 4. 작업물 상세 `/works/[slug]`

```
┌─────────────────────────────────┐
│   라이브 데모 (큰 iframe)          │  ← 풀스크린 / 새로고침
├─────────────────────────────────┤
│  [ Preview │ Code ] 탭            │
│  Code → 파일트리 + 신택스 하이라이트 │  ← react-syntax-highlighter (설치됨)
│         + 파일별 복사 버튼          │
├─────────────────────────────────┤
│  [⬇ ZIP] [⌥ GitHub] [↗ 공유]      │
├─────────────────────────────────┤
│  index.mdx 설명글                  │
└─────────────────────────────────┘
```

- iframe `sandbox="allow-scripts allow-pointer-lock"` 격리
- 타입 무관하게 `/works/<slug>/demo/index.html` 동일 로드

## 5. 빌드 파이프라인 (SSG 유지, standalone 빌드)

`prebuild` 스크립트 추가. 빌드 시 `content/works/*` 순회:

1. `demo/` → `public/works/<slug>/demo/` 복사 (iframe src)
2. `demo/` 압축 → `public/works/<slug>/<slug>.zip` (정적 다운로드)
3. 파일 트리 + 파일 내용을 `manifest.json`으로 추출 (Code 탭용)

서버 없이 ZIP·코드뷰 해결.

## 6. 공유

- **Web Share API** (`navigator.share`) 단일 버튼 — 모바일에서 OS 네이티브 공유 시트
  (인스타·카톡 등은 사용자가 시트에서 선택). SDK·앱키 불필요.
- 데스크톱 폴백: "링크 복사" (`navigator.clipboard`)
- 깃헙 링크는 공유와 별개의 "코드 가져가기" 버튼
- OG 이미지: 각 작품 `cover.png`를 메타태그로 → 어디 붙여도 썸네일

## 7. 품질 기준 (토스 수준 UX — 필수)

구현·리뷰 시 다음을 명시적 합격선으로 둔다:

- **반응형**: 모바일/태블릿/데스크톱 전 구간 검증, 갤러리 그리드 컬럼 수 가변
- **레이아웃 시프트(CLS) 0**: 카드·iframe은 `aspectRatio`로 자리 선점, 썸네일→iframe 교체 시 점프 없음
- **로딩 상태**: 스켈레톤/페이드인, 빈 화면 노출 금지
- **터치 타깃** ≥ 44px, 키보드 포커스/접근성 보장
- **성능**: 라이브 iframe 캡·언마운트로 메인 60fps 유지, 초기 로드 가벼움
- **UI 버그 제로**: 다크모드, 풀스크린 토글, 탭 전환, 공유 폴백 경로 모두 검증

## 미해결 / 구현 시 결정

- `/log`로의 기존 글 마이그레이션 범위 (라우트 리다이렉트 포함 여부)
- 갤러리 카드 hover/autoplay 정책 세부 (모바일은 autoplay만)
- React 데모 esm.sh import map 표준 템플릿

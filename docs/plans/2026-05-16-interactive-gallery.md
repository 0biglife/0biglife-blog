# 인터랙티브 작업물 갤러리 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 0biglife.com을 라이브 동작 그리드 갤러리 + 코드 뷰/다운로드/공유 사이트로 확장한다. 백엔드 없이 정적 생성으로 동작한다.

**Architecture:** 작업물 1개 = `content/works/<slug>/` 폴더 하나 (실행 파일 `demo/` + 설명글 `index.mdx`). 빌드 전 `scripts/build-works.mjs`가 `demo/`를 `public/`으로 복사하고, ZIP과 코드뷰용 `manifest.json`을 생성한다. 페이지는 전부 SSG로 만들고, 데모는 `sandbox` iframe으로 격리 실행한다. 갤러리 카드는 IntersectionObserver + 동시 실행 캡으로 라이브 재생 성능을 관리한다.

**Tech Stack:** Next.js 15 (App Router), Chakra UI v2, next-mdx-remote/rsc, gray-matter, react-syntax-highlighter(설치됨), archiver(신규 추가), Web Share API / Clipboard API.

**설계 문서:** `docs/plans/2026-05-16-interactive-gallery-design.md`

---

## 사전 메모 (전체 작업 공통)

- **테스트 환경:** 이 레포는 jest 등 테스트 러너가 없다. 순수 Node 로직(빌드 스크립트)은 내장 `node:test`로 테스트한다. UI 컴포넌트는 `yarn dev` 실행 후 수동 검증 + `yarn build` 통과로 검증한다.
- **커밋:** 각 Task 끝에서 커밋한다. 브랜치는 `feat/interactive-gallery` (이미 생성됨).
- **품질 합격선(모든 UI Task에 적용):** 반응형 전 구간 정상, 레이아웃 시프트 없음(aspectRatio로 자리 선점), 로딩 스켈레톤 노출, 터치 타깃 ≥44px, 다크모드 정상. 설계 문서 §7 참고.

---

## Task 1: 작업물 타입 정의

**Files:**
- Modify: `src/lib/types.ts`

**Step 1: `Work` 타입 추가**

`src/lib/types.ts` 끝에 추가:

```typescript
export type WorkType = "vanilla" | "react" | "webgl";

export type WorkFile = {
  path: string;        // demo/ 기준 상대 경로 (예: "index.html")
  content: string;     // 파일 원문
  lang: string;        // syntax highlighter 언어 (html/css/javascript 등)
};

export type WorkMeta = {
  slug: string;
  title: string;
  date: string;
  type: WorkType;
  tags: string[];
  summary: string;
  github?: string;
  aspectRatio: string; // "16/9" 등
  autoplay: boolean;
  cover: string;       // /works/<slug>/cover.png 경로
};

export type Work = WorkMeta & {
  content: ReactNode;  // 컴파일된 MDX 설명글
  files: WorkFile[];   // 코드 탭용
  zipPath: string;     // /works/<slug>/<slug>.zip
  demoPath: string;    // /works/<slug>/demo/index.html
  toc?: TOCItem[];
};
```

**Step 2: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음 (Work 타입은 아직 미사용)

**Step 3: 커밋**

```bash
git add src/lib/types.ts
git commit -m "feat: add Work content types"
```

---

## Task 2: 샘플 작업물 폴더 생성

**Files:**
- Create: `content/works/sample-cursor-trail/index.mdx`
- Create: `content/works/sample-cursor-trail/demo/index.html`
- Create: `content/works/sample-cursor-trail/demo/style.css`
- Create: `content/works/sample-cursor-trail/demo/script.js`
- Create: `content/works/sample-cursor-trail/cover.png` (임시 단색 PNG 가능)

**Step 1: `index.mdx` 작성**

```mdx
---
title: "커서 트레일"
date: 2026-05-16
type: vanilla
tags: [CSS, 마우스인터랙션]
summary: "마우스를 따라다니는 잔상 효과"
github: ""
aspectRatio: "16/9"
autoplay: true
---

## 아이디어

마우스 좌표를 따라 점들이 부드럽게 따라오는 트레일 효과.

## 핵심 코드

`requestAnimationFrame` 루프에서 보간(lerp)으로 잔상을 만든다.
```

**Step 2: `demo/` 3개 파일 작성**

빌드 없이 브라우저에서 바로 도는 자기완결 vanilla 데모.
`index.html`은 `style.css`/`script.js`를 상대경로로 참조한다.
간단한 캔버스 커서 트레일 구현 (마우스 이동 시 점들이 lerp로 따라옴).

**Step 3: 검증**

Run: `open content/works/sample-cursor-trail/demo/index.html`
Expected: 브라우저에서 마우스 트레일이 동작

**Step 4: 커밋**

```bash
git add content/works/sample-cursor-trail
git commit -m "feat: add sample interactive work"
```

---

## Task 3: 빌드 스크립트 — 헬퍼 함수 (TDD)

**Files:**
- Create: `scripts/build-works.mjs`
- Create: `scripts/build-works.test.mjs`

**Step 1: 실패하는 테스트 작성**

`scripts/build-works.test.mjs`:

```javascript
import test from "node:test";
import assert from "node:assert/strict";
import { langForExt, walkFiles } from "./build-works.mjs";

test("langForExt maps extensions to highlighter languages", () => {
  assert.equal(langForExt(".html"), "html");
  assert.equal(langForExt(".css"), "css");
  assert.equal(langForExt(".js"), "javascript");
  assert.equal(langForExt(".unknown"), "text");
});

test("walkFiles returns relative paths for nested files", () => {
  // scripts/__fixtures__/demo/ 안에 index.html, js/app.js 가 있다고 가정
  const files = walkFiles(new URL("./__fixtures__/demo", import.meta.url).pathname);
  const paths = files.map((f) => f).sort();
  assert.deepEqual(paths, ["index.html", "js/app.js"]);
});
```

**Step 2: 픽스처 생성**

`scripts/__fixtures__/demo/index.html`, `scripts/__fixtures__/demo/js/app.js` 빈 파일 2개 생성.

**Step 3: 테스트 실행 — 실패 확인**

Run: `node --test scripts/build-works.test.mjs`
Expected: FAIL ("build-works.mjs 없음" 또는 export 없음)

**Step 4: 최소 구현**

`scripts/build-works.mjs`에 `langForExt`, `walkFiles` 구현:

```javascript
import fs from "fs";
import path from "path";

const LANG = {
  ".html": "html", ".css": "css", ".js": "javascript",
  ".mjs": "javascript", ".json": "json", ".ts": "typescript",
  ".glsl": "glsl", ".frag": "glsl", ".vert": "glsl", ".md": "markdown",
};

export function langForExt(ext) {
  return LANG[ext.toLowerCase()] ?? "text";
}

// dir 하위 모든 파일을 dir 기준 상대경로 배열로 반환
export function walkFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full, base));
    else out.push(path.relative(base, full).split(path.sep).join("/"));
  }
  return out;
}
```

**Step 5: 테스트 실행 — 통과 확인**

Run: `node --test scripts/build-works.test.mjs`
Expected: PASS (2 tests)

**Step 6: 커밋**

```bash
git add scripts/build-works.mjs scripts/build-works.test.mjs scripts/__fixtures__
git commit -m "feat: add build-works file helpers with tests"
```

---

## Task 4: 빌드 스크립트 — 메인 로직 (demo 복사 + manifest + zip)

**Files:**
- Modify: `scripts/build-works.mjs`
- Modify: `package.json` (devDependency `archiver`, `prebuild` 스크립트)

**Step 1: archiver 설치**

Run: `yarn add -D archiver`
Expected: `package.json` devDependencies에 `archiver` 추가

**Step 2: 메인 함수 구현**

`scripts/build-works.mjs`에 추가. 동작:
1. `content/works/*/` 폴더 순회. `demo/`가 없으면 skip + 경고.
2. `public/works/<slug>/` 초기화 후 `demo/`를 `demo/`로 복사 (`fs.cpSync(src, dst, { recursive: true })`).
3. `cover.png` 있으면 `public/works/<slug>/cover.png`로 복사.
4. `walkFiles`로 파일 목록 → 각 파일 `content`+`lang` 읽어 `manifest.json` 작성:
   `public/works/<slug>/manifest.json` = `{ files: WorkFile[] }`.
   (바이너리/이미지 확장자 `.png .jpg .gif .webp .mp4 .mov`는 manifest에서 제외)
5. `archiver`로 `demo/` 전체를 `public/works/<slug>/<slug>.zip`으로 압축.
6. 처리한 slug 수를 콘솔에 출력.
7. 파일 맨 아래 `if (import.meta.url === \`file://${process.argv[1]}\`) buildAll();` 가드로 직접 실행 시에만 동작.

**Step 3: package.json 스크립트 연결**

`package.json` scripts에 추가/수정:

```json
"build:works": "node scripts/build-works.mjs",
"prebuild": "node scripts/build-works.mjs",
"build": "yarn optimize:images && next build && yarn sitemap",
```

(기존 `build`의 `optimize:images` 앞에 `prebuild`가 자동 실행됨 — yarn은 `prebuild`를 `build` 전에 자동 호출)

**Step 4: 실행 검증**

Run: `yarn build:works`
Expected: 콘솔에 "1 work(s) processed" 류 출력

Run: `ls public/works/sample-cursor-trail`
Expected: `demo/  cover.png  manifest.json  sample-cursor-trail.zip`

Run: `cat public/works/sample-cursor-trail/manifest.json`
Expected: `files` 배열에 index.html/style.css/script.js 3개, 각각 content+lang 포함

**Step 5: .gitignore 처리**

`public/works/` 는 빌드 산출물이므로 `.gitignore`에 `public/works/` 추가.

**Step 6: 커밋**

```bash
git add scripts/build-works.mjs package.json yarn.lock .gitignore
git commit -m "feat: build-works copies demos and generates manifest+zip"
```

---

## Task 5: 데이터 레이어 — works.ts

**Files:**
- Create: `src/lib/works.ts`

**Step 1: 구현**

`src/lib/posts.ts` 패턴을 따라 작성. `"server-only"` import.

- `contentWorksDir = path.join(process.cwd(), "content/works")`
- `getAllWorks(): WorkMeta[]` — 각 폴더 `index.mdx`의 frontmatter를 읽어 `WorkMeta` 배열 반환. `demo/`가 없는 폴더는 제외. `date` 내림차순 정렬. `cover`는 `cover.png` 존재 시 `/works/<slug>/cover.png`, 없으면 `/assets/default-thumbnail.webp`.
- `getWorkBySlug(slug): Promise<Work | null>` — frontmatter + `compileMDX`(posts.ts와 동일 옵션, remarkGfm)로 설명글 컴파일. `extractTOC` 재사용(posts.ts에서 export). `public/works/<slug>/manifest.json`을 `fs`로 읽어 `files`에 채움. `zipPath`/`demoPath` 채움.
- `getAllWorkSlugs(): string[]` — generateStaticParams용.

**주의:** `manifest.json`은 `prebuild`에서 생성되므로, `getWorkBySlug`는 `public/works/<slug>/manifest.json`이 없을 때 `files: []`로 폴백하고 경고 로그를 남긴다 (dev 모드에서 prebuild 미실행 시 크래시 방지).

**Step 2: extractTOC export 확인**

`src/lib/posts.ts`의 `extractTOC`는 이미 `export`됨 — 그대로 import.

**Step 3: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/lib/works.ts
git commit -m "feat: add works data layer"
```

---

## Task 6: DemoFrame 컴포넌트 (sandbox iframe 뷰어)

**Files:**
- Create: `src/components/works/DemoFrame.tsx`
- Create: `src/components/works/index.ts`

**Step 1: 구현**

`"use client"` 컴포넌트. Props: `{ src: string; aspectRatio: string; title: string }`.

- `<iframe>` `sandbox="allow-scripts allow-pointer-lock allow-pop-ups-to-escape-sandbox"`, `src={src}`, `loading="lazy"`.
- 컨테이너는 `aspectRatio` prop으로 비율 고정 (CLS 0). `borderRadius`, `overflow="hidden"`.
- 우상단 오버레이 버튼 2개: **새로고침**(iframe `key` state 증가로 리마운트), **풀스크린**(`containerRef.current.requestFullscreen()`).
- 버튼 터치 타깃 ≥44px, 다크모드 대응.
- iframe `onLoad` 전까지 스켈레톤(Chakra `Skeleton`) 표시.

**Step 2: index.ts에서 export**

`src/components/works/index.ts`: `export { default as DemoFrame } from "./DemoFrame";`

**Step 3: 검증 (Task 9에서 페이지 연결 후 통합 검증)**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/components/works
git commit -m "feat: add DemoFrame sandbox iframe viewer"
```

---

## Task 7: CodePanel 컴포넌트 (파일트리 + 신택스 + 복사)

**Files:**
- Create: `src/components/works/CodePanel.tsx`
- Modify: `src/components/works/index.ts`

**Step 1: 구현**

`"use client"` 컴포넌트. Props: `{ files: WorkFile[] }`.

- 좌측: 파일 목록(`files[].path`), 선택 상태 관리. 모바일에서는 상단 가로 스크롤 탭.
- 우측: 선택 파일을 `react-syntax-highlighter`(Prism)로 렌더. 테마는 라이트/다크 분기.
- 각 파일 우상단 **복사 버튼** — `navigator.clipboard.writeText(file.content)`, 복사 후 2초간 "복사됨" 표시. `src/components/layout/CopyButton.tsx`가 이미 있으면 재사용 검토.
- `files`가 비면 "코드 준비 중" 안내.

**Step 2: index.ts export 추가**

**Step 3: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/components/works
git commit -m "feat: add CodePanel with file tree and copy"
```

---

## Task 8: WorkActions 컴포넌트 (다운로드 + GitHub + 공유)

**Files:**
- Create: `src/components/works/WorkActions.tsx`
- Modify: `src/components/works/index.ts`

**Step 1: 구현**

`"use client"`. Props: `{ zipPath: string; github?: string; shareUrl: string; title: string }`.

- **ZIP 다운로드:** `<a href={zipPath} download>` 버튼.
- **GitHub:** `github`가 있을 때만 `<a href={github} target="_blank" rel="noopener">` 버튼.
- **공유:** 클릭 시 `navigator.share`가 있으면 `navigator.share({ title, url: shareUrl })` 호출(모바일 네이티브 시트). 없으면 `navigator.clipboard.writeText(shareUrl)` 후 "링크 복사됨" 토스트(Chakra `useToast`).
- 버튼 3개 모두 터치 타깃 ≥44px, 모바일에서 가로 정렬 유지(좁으면 wrap).

**Step 2: index.ts export 추가**

**Step 3: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/components/works
git commit -m "feat: add WorkActions download/github/share bar"
```

---

## Task 9: 작업물 상세 페이지 `/works/[slug]`

**Files:**
- Create: `src/app/works/[slug]/page.tsx`

**Step 1: 구현**

`src/app/posts/[slug]/page.tsx` 패턴을 따른다.

- `generateStaticParams` — `getAllWorkSlugs()` 사용.
- `generateMetadata` — title/summary, `openGraph.images`에 `work.cover`, `twitter card summary_large_image`. canonical `https://0biglife.com/works/<slug>`.
- 페이지 본문 레이아웃 (설계 §4):
  1. `<DemoFrame src={work.demoPath} aspectRatio={work.aspectRatio} />`
  2. Chakra `Tabs`: **Preview**(DemoFrame 재사용 또는 동일) / **Code**(`<CodePanel files={work.files} />`)
  3. `<WorkActions zipPath={work.zipPath} github={work.github} shareUrl={...} title={work.title} />`
  4. MDX 설명글 `{work.content}` + `<TableOfContents toc={work.toc} />`
- 탭은 한 번에 하나만 — Preview 탭일 때만 iframe 마운트(불필요한 실행 방지).

**Step 2: 검증**

Run: `yarn build:works && yarn dev` → `http://localhost:3000/works/sample-cursor-trail`
Expected:
- 데모가 iframe 안에서 동작, 풀스크린/새로고침 동작
- Code 탭에서 3개 파일 신택스 하이라이트 + 복사 동작
- ZIP 버튼 클릭 시 zip 다운로드
- 공유 버튼: 데스크톱에서 "링크 복사됨" 토스트
- 모바일 뷰포트(개발자도구)에서 레이아웃 깨짐 없음

**Step 3: 빌드 검증**

Run: `yarn build`
Expected: 빌드 성공, `/works/sample-cursor-trail` 정적 페이지 생성

**Step 4: 커밋**

```bash
git add src/app/works
git commit -m "feat: add work detail page"
```

---

## Task 10: 라이브 데모 동시 실행 관리 (LiveDemoProvider)

**Files:**
- Create: `src/components/works/LiveDemoProvider.tsx`
- Modify: `src/components/works/index.ts`

**Step 1: 구현**

갤러리에서 라이브 iframe 수를 제한하는 React Context.

- `LiveDemoProvider` — `maxConcurrent = 6`. 현재 활성 slug 집합 state.
- `useLiveSlot(slug, isVisible)` 훅:
  - `isVisible`이 true이고 활성 수 < max이면 slug를 활성 집합에 추가, `granted: true` 반환.
  - `isVisible`이 false면 활성 집합에서 제거.
  - 활성 집합이 꽉 차면 `granted: false` (카드는 cover 정지 상태 유지).
- `prefers-reduced-motion` 매치 시 항상 `granted: false` 반환(전부 정지 썸네일).

**Step 2: index.ts export 추가**

**Step 3: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/components/works
git commit -m "feat: add LiveDemoProvider concurrency control"
```

---

## Task 11: WorkCard 컴포넌트 (라이브 동작 카드)

**Files:**
- Create: `src/components/works/WorkCard.tsx`
- Modify: `src/components/works/index.ts`

**Step 1: 구현**

`"use client"`. Props: `{ work: WorkMeta }`.

- 카드 컨테이너는 `aspectRatio={work.aspectRatio}`로 자리 선점 (CLS 0).
- 항상 `cover` 이미지를 즉시 표시(`next/image`, `unoptimized`).
- `IntersectionObserver`로 뷰포트 근처 진입 감지 → `useLiveSlot(slug, nearViewport)` 호출.
- `granted && work.autoplay`일 때만 `<iframe>` 마운트(축소 데모), cover 위에 페이드인.
- 멀어지면 iframe 언마운트 → cover 복귀.
- 카드 클릭 시 `/works/<slug>`로 이동(`next/link`). iframe은 `pointer-events: none`으로 두어 카드 클릭을 가로채지 않게 함.
- hover 시 살짝 확대/그림자(토스 느낌의 절제된 모션). 하단에 title + tags.

**Step 2: index.ts export 추가**

**Step 3: 타입체크**

Run: `yarn tsc --noEmit`
Expected: 에러 없음

**Step 4: 커밋**

```bash
git add src/components/works
git commit -m "feat: add WorkCard with live demo preview"
```

---

## Task 12: 갤러리 홈 페이지 (`/`) + 태그 필터

**Files:**
- Create: `src/components/works/WorkGallery.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/PageContent.tsx` (또는 신규 갤러리 전용 컴포넌트)

**Step 1: WorkGallery 구현**

`"use client"`. Props: `{ works: WorkMeta[] }`.

- 상단: 태그 필터 칩 (전체 + 태그별). 선택 시 클라이언트 필터링.
- 반응형 그리드: 모바일 1열 / 태블릿 2열 / 데스크톱 3열 (Chakra `SimpleGrid` `columns={{ base:1, md:2, lg:3 }}`).
- `<LiveDemoProvider>`로 감싸고 각 `work`를 `<WorkCard>`로 렌더.
- 작업물 0개일 때 빈 상태 안내.

**Step 2: 홈 페이지 교체**

`src/app/page.tsx`를 갤러리로 교체:

```tsx
import { getAllWorks } from "@/lib/works";
import { WorkGallery } from "@/components/works";

export default async function HomePage() {
  const works = getAllWorks();
  return <WorkGallery works={works} />;
}
```

(기존 `PageContent`/posts 홈 로직은 Task 13에서 `/log`로 이전하므로 여기서 제거)

**Step 3: 검증**

Run: `yarn build:works && yarn dev` → `http://localhost:3000`
Expected:
- 카드가 cover로 즉시 뜨고, 보이면 데모가 페이드인
- 스크롤해도 끊김 없음(라이브 캡 동작 — 동시 6개 초과 시 정지)
- 태그 필터 동작
- 모바일/태블릿/데스크톱 열 수 변화 정상, 레이아웃 시프트 없음

**Step 4: 커밋**

```bash
git add src/components/works src/app/page.tsx
git commit -m "feat: gallery home page with live grid and tag filter"
```

---

## Task 13: 기존 블로그 글 `/log`로 분리

**Files:**
- Create: `src/app/log/page.tsx`
- Modify: 헤더 네비게이션 `src/components/layout/Header.tsx`

**Step 1: `/log` 페이지 생성**

기존 `src/app/page.tsx`의 홈 로직(posts/devLogs 목록)을 `src/app/log/page.tsx`로 옮긴다. 기존 `PageContent.tsx`를 그대로 재사용.

```tsx
import { getAllDevLogs, getAllPosts } from "@/lib/posts";
import PageContent from "../PageContent";

export default async function LogPage() {
  const posts = await getAllPosts();
  const devLogs = await getAllDevLogs();
  return <PageContent posts={posts} featuredPosts={posts.slice(0,3)} devLogs={devLogs} />;
}
```

**Step 2: 헤더 네비 갱신**

`Header.tsx`에 네비 링크 추가: `갤러리(/)`, `글(/log)`, `소개(/introduction)`.

**Step 3: 기존 라우트 유지 확인**

`/posts/[slug]`, `/dev-logs/[slug]`는 변경 없이 그대로 둔다 (정적 export는 redirect 미지원 — 기존 URL 깨뜨리지 않기 위해 유지).

**Step 4: 검증**

Run: `yarn dev` → `/log`, `/posts/begin-blog` 정상 표시 확인

**Step 5: 빌드 검증**

Run: `yarn build`
Expected: 빌드 성공, `/`, `/log`, `/works/*`, `/posts/*` 모두 생성

**Step 6: 커밋**

```bash
git add src/app/log src/components/layout/Header.tsx
git commit -m "feat: move written posts under /log"
```

---

## Task 14: 사이트 메타데이터 + 최종 QA 패스

**Files:**
- Modify: `src/app/layout.tsx` (사이트 타이틀/설명)
- Modify: `next-sitemap.config.js` (필요 시 `/works` 포함 확인)

**Step 1: 메타데이터 갱신**

`layout.tsx`의 사이트 metadata를 "인터랙티브 작업물 전시장" 컨셉에 맞게 갱신. 홈 OG 이미지 설정.

**Step 2: sitemap 확인**

Run: `yarn build && yarn sitemap`
Expected: `sitemap.xml`에 `/works/*` 포함

**Step 3: 품질 QA 체크리스트 (수동)**

`yarn build:works && yarn dev`로 다음 전부 확인:
- [ ] 모바일/태블릿/데스크톱 3구간 — 갤러리·상세·로그 레이아웃 정상
- [ ] 레이아웃 시프트(CLS) 없음 — 카드/iframe 자리 선점 확인
- [ ] 다크모드 토글 — 갤러리·코드패널·데모뷰어 전부 정상
- [ ] 라이브 데모 동시 실행 캡 동작 — 빠르게 스크롤해도 60fps 유지
- [ ] 풀스크린/새로고침/탭전환/복사/ZIP/공유 폴백 전 경로 동작
- [ ] `prefers-reduced-motion` 켰을 때 카드 전부 정지 썸네일
- [ ] 키보드 포커스로 카드·버튼 접근 가능

**Step 4: 최종 빌드**

Run: `yarn build`
Expected: 경고/에러 없이 성공

**Step 5: 커밋**

```bash
git add src/app/layout.tsx next-sitemap.config.js
git commit -m "feat: site metadata for interactive gallery"
```

---

## 완료 기준

- 홈(`/`)이 라이브 동작 그리드 갤러리
- `/works/[slug]`에서 데모 실행 + 코드뷰 + ZIP/GitHub/공유 동작
- 기존 글은 `/log`에서 접근, 기존 `/posts/*` URL 유지
- `yarn build` 정적 빌드 성공, 설계 §7 품질 합격선 충족

## Update Logs

- 디렉토리 정리
- Chakra-ui 도입 및 테마 추가
- Components : Header, Footer 추가

## Commands

```bash
yarn build
yarn dev
```

## Architecture

```bash
/0biglife-blog
 ├── /public  → 정적 파일 (이미지, favicon 등)
 │    ├── /assets
 │    │    ├── /posts
 │    │    │    ├── thumnail.png
 │    ├── favicon.ico
 ├── /content  → 정적 블로그 게시글 저장 (MDX + 이미지 포함)
 │    ├── /assets
 │    │    ├── default-thumbnail.png
 │    ├── /posts
 │    │    └── /sample-post
 │    │         ├── thumnail.png
 │    │         └── index.mdx
 ├── /src
 │    ├── /app  → Next.js App Router 페이지 관리
 │    │    ├── /posts
 │    │    │    ├── /[slug]
 │    │    │    │    ├── page.tsx
 │    │    │    ├── page.tsx  → 블로그 목록 페이지
 │    │    ├── /layout.tsx  → 사이트 전체 레이아웃 (헤더, 테마 전환 버튼 포함)
 │    │    ├── /page.tsx  → 메인 페이지
 │    ├── /components  → UI 및 공용 컴포넌트
 │    │    ├── /ui
 │    │    │    ├── ThemeToggle.tsx  → 다크모드 전환 버튼
 │    │    │    ├── PostItem.tsx  → 블로그 목록의 개별 포스트 컴포넌트
 │    │    │    ├── PostContent.tsx  → 블로그 상세 페이지 컴포넌트
 │    │    ├── /...
 │    ├── /lib  → 데이터 및 유틸리티 함수
 │    │    ├── posts.ts  → MDX 파일을 읽고 HTML 변환하는 로직
 ├── /next.config.js  → Next.js 설정 파일 (MDX 지원)
 ├── /package.json
```

- image를 aws s3에서 관리하는 방식에서 리포 내부에 포함하는 방식으로 교체

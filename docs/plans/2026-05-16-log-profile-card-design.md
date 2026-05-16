# /log 프로필 카드 설계

날짜: 2026-05-16
상태: 승인됨

## 목표

`/log` 페이지에 LinkedIn 우측 사이드바 프로필 카드 컨셉을 토스 톤으로 녹인
컴팩트 프로필 카드를 추가한다.

## 확정 결정

| 항목 | 결정 |
|---|---|
| 위치 | `/log` 우측 사이드바 상단 (데브로그 위) |
| 콘텐츠 | 사진 + 이름 + 타이틀 + 소셜 링크 버튼 |
| 비주얼 | 컴팩트 센터 카드 (커버 없음, 원형 아바타) |
| 모바일 | **프로필 카드는 모바일에서도 노출** (데브로그 목록은 기존대로 데스크톱 전용 유지) |
| 데이터 | `src/lib/constant.ts`의 `PROFILE` 상수 |

## 컴포넌트 — `src/components/template/ProfileCard.tsx`

`"use client"`. 세로 중앙 정렬 카드:
- 둥근 카드(`borderRadius="2xl"`, 부드러운 보더+그림자, 넉넉한 패딩), `useColorModeValue` 다크모드
- 원형 아바타 ~88px — `next/image`, 얇은 링, `public/assets/profile.webp`
- 이름(볼드) → 타이틀(뮤트)
- 소셜 아이콘 버튼 3개 — LinkedIn / GitHub / 이메일
  - `IconButton as="a"`, 외부 링크는 `target="_blank" rel="noopener noreferrer"`, 이메일은 `mailto:`
  - 터치 타깃 ≥40px, `aria-label`, hover
- 사진 파일이 없을 때를 대비해 이니셜("MK") 폴백은 두지 않음 — 파일을 직접 커밋하므로 항상 존재. (이미지 onError 시 배경색만 남는 정도로 graceful.)

## 데이터 — `src/lib/constant.ts`

```ts
export const PROFILE = {
  name: "MINSEOK (Daniel) KIM",
  title: "AI Data Engineer",
  avatar: "/assets/profile.webp",
  links: {
    linkedin: "https://www.linkedin.com/in/0biglife/",
    github: "https://github.com/0biglife",
    email: "0biglife@gmail.com",
  },
};
```

## 통합 — `src/app/PageContent.tsx`

우측 컬럼을 모바일에서도 렌더하되, **프로필 카드만 항상 노출**하고
기존 `Title`("Logs") + `LogContainer`는 데스크톱 전용으로 유지한다.

- 우측 컬럼 컨테이너: `display={{ base: "none", sm: "flex" }}` → `display="flex"` (항상 렌더)
- 컬럼 최상단에 `<ProfileCard />` 추가 (항상 노출)
- 기존 `Title` + `LogContainer`는 `display={{ base: "none", sm: "block" }}` 래퍼로 감쌈
- 좌/우 사이 divider Box는 기존대로 `sm` 전용 유지

→ 모바일: 좌측(추천 슬라이더) 아래에 프로필 카드가 stack, 데브로그는 숨김.
→ 데스크톱: 우측 25% 컬럼에 프로필 카드 → "Logs" → 데브로그 순.

## 검증

- `yarn tsc --noEmit`, `yarn lint` 클린
- `/log` 데스크톱/모바일 뷰 — 프로필 카드 노출, 레이아웃 시프트 없음, 다크모드 정상
- 소셜 링크 동작 (LinkedIn/GitHub 새 탭, 이메일 mailto)

## 범위 메모

단일 컴포넌트 + 상수 + 통합 1곳의 소규모 변경이므로, 별도 구현 계획·
서브에이전트 파이프라인 없이 직접 구현 후 검증한다.

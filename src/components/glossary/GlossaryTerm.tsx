"use client";

import { useGlossary } from "./GlossaryProvider";

/**
 * 본문 안의 클릭 가능한 용어. remark 플러그인이 자동으로 심고,
 * MDX 안에서 <Term id="mcap">아무 표기</Term> 로 직접 쓸 수도 있다.
 *
 * 사전 데이터를 여기서 import 하지 않는 게 중요하다. 이 컴포넌트는 글마다
 * 수십 개가 서버 렌더되므로, 여기서 glossary 를 끌어오면 85개 항목 전부가
 * 첫 화면 번들에 실린다. 데이터는 모달(지연 로드) 쪽에만 둔다.
 */
export default function GlossaryTerm({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const { open } = useGlossary();

  return (
    <button
      type="button"
      className="gl-term"
      aria-haspopup="dialog"
      aria-label={`용어 설명 열기: ${typeof children === "string" ? children : id}`}
      onClick={() => open(id)}
    >
      {children}
    </button>
  );
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import dynamic from "next/dynamic";

// 사전 본문(85항목)과 Chakra 모달은 용어를 처음 누를 때 받아온다.
// 글을 읽기만 하는 대다수 방문자는 이 청크를 아예 내려받지 않는다.
const GlossaryModal = dynamic(() => import("./GlossaryModal"), { ssr: false });

interface Ctx {
  open: (id: string) => void;
}

const GlossaryCtx = createContext<Ctx>({ open: () => {} });

export const useGlossary = () => useContext(GlossaryCtx);

export default function GlossaryProvider({ children }: { children: React.ReactNode }) {
  // 스택으로 둔다 — 모달 안에서 관련 용어를 타고 들어갔다가 되돌아올 수 있게.
  const [stack, setStack] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((id: string) => {
    setStack((prev) => (prev.length ? [...prev, id] : [id]));
    setIsOpen(true);
  }, []);

  const back = useCallback(() => setStack((prev) => prev.slice(0, -1)), []);

  const close = useCallback(() => {
    setIsOpen(false);
    // 닫히는 애니메이션이 끝난 뒤 비운다(닫는 중에 내용이 사라지지 않게)
    setTimeout(() => setStack([]), 220);
  }, []);

  const value = useMemo(() => ({ open }), [open]);

  return (
    <GlossaryCtx.Provider value={value}>
      {children}
      {stack.length > 0 && (
        <GlossaryModal
          id={stack[stack.length - 1]}
          isOpen={isOpen}
          canGoBack={stack.length > 1}
          onBack={back}
          onClose={close}
          onNavigate={open}
        />
      )}
    </GlossaryCtx.Provider>
  );
}

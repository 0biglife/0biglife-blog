"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  HStack,
  Text,
  Tooltip,
  VStack,
  usePrefersReducedMotion,
} from "@chakra-ui/react";
import { keyframes } from "@emotion/react";
import { useLanguage } from "@/i18n/LanguageProvider";

// 서버 모듈(googleapis)을 끌어오지 않도록 응답 형태만 여기서 선언한다.
interface BreakdownRow {
  label: string;
  users: number;
}
interface RealtimePayload {
  activeUsers: number;
  pages: BreakdownRow[];
  countries: BreakdownRow[];
}

const POLL_MS = 20 * 1000;

const ping = keyframes`
  0%   { transform: scale(1); opacity: 0.55; }
  70%  { transform: scale(2.8); opacity: 0; }
  100% { transform: scale(2.8); opacity: 0; }
`;

function Breakdown({ title, rows }: { title: string; rows: BreakdownRow[] }) {
  if (rows.length === 0) return null;
  return (
    <Box w="full">
      <Text fontSize="10px" opacity={0.6} textTransform="uppercase" letterSpacing="0.08em">
        {title}
      </Text>
      {rows.map((row) => (
        <HStack key={row.label} justify="space-between" spacing={4} fontSize="11px">
          <Text noOfLines={1}>{row.label}</Text>
          <Text fontWeight="semibold" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {row.users}
          </Text>
        </HStack>
      ))}
    </Box>
  );
}

export default function LiveVisitors() {
  const [data, setData] = useState<RealtimePayload | null>(null);
  const { t } = useLanguage();
  const prefersReducedMotion = usePrefersReducedMotion();
  // 탭이 백그라운드일 때 쌓인 요청이 겹치지 않도록 진행 중 여부를 들고 있는다.
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      // 숨겨진 탭에서는 굳이 GA 쿼터를 쓰지 않는다.
      if (document.visibilityState === "hidden" || busy.current) return;
      busy.current = true;
      // 응답이 영영 안 오면 busy가 풀리지 않아 폴링이 멈춘다 — 주기보다 짧게 끊는다.
      const abort = new AbortController();
      const killer = setTimeout(() => abort.abort(), POLL_MS - 2000);
      try {
        const res = await fetch("/api/analytics/realtime", { signal: abort.signal });
        if (!res.ok) return;
        const json: RealtimePayload = await res.json();
        if (!cancelled) setData(json);
      } catch {
        // 네트워크 오류·중단은 무시 — 다음 주기에 다시 시도한다.
      } finally {
        clearTimeout(killer);
        busy.current = false;
      }
    };

    tick();
    const timer = setInterval(tick, POLL_MS);
    // 탭으로 돌아오면 다음 주기를 기다리지 않고 즉시 갱신.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 아직 못 받았거나 아무도 없으면 "0명"을 띄우는 대신 조용히 숨긴다.
  if (!data || data.activeUsers < 1) return null;

  const before = t("live.before");
  const after = t("live.after");

  return (
    <Tooltip
      hasArrow
      borderRadius={6}
      arrowSize={8}
      placement="top"
      openDelay={150}
      label={
        <VStack align="stretch" spacing={2} py={1} minW="180px">
          <Text fontSize="11px" fontWeight="semibold">
            {t("live.title")}
          </Text>
          <Breakdown title={t("live.pages")} rows={data.pages} />
          <Breakdown title={t("live.countries")} rows={data.countries} />
          <Text fontSize="10px" opacity={0.6}>
            {t("live.window")}
          </Text>
        </VStack>
      }
    >
      <HStack
        as="span"
        spacing={2}
        display="inline-flex"
        alignItems="center"
        cursor="default"
        // 20초마다 바뀌는 장식성 수치라 라이브 리전으로 두면 스크린리더를 계속 끊는다.
        // 문구 자체가 설명적이므로 그냥 텍스트로 읽히게 둔다.
        data-live-visitors=""
        tabIndex={0}
        borderRadius="md"
        _focusVisible={{ outline: "2px solid", outlineColor: "green.400", outlineOffset: "2px" }}
      >
        <Box as="span" position="relative" display="inline-flex" boxSize="7px" flexShrink={0}>
          {!prefersReducedMotion && (
            <Box
              as="span"
              position="absolute"
              inset={0}
              borderRadius="full"
              bg="green.400"
              animation={`${ping} 2.2s cubic-bezier(0, 0, 0.2, 1) infinite`}
            />
          )}
          <Box
            as="span"
            position="relative"
            borderRadius="full"
            boxSize="7px"
            bg="green.400"
          />
        </Box>
        <Text as="span" fontSize="12px" sx={{ fontVariantNumeric: "tabular-nums" }}>
          {/* 붙임/띄움은 언어마다 달라서(한국어 "7명" vs 영어 "7 reading") 사전 문자열이 공백까지 갖는다. */}
          {before}
          <Text as="span" fontWeight="semibold">
            {data.activeUsers}
          </Text>
          {after}
        </Text>
      </HStack>
    </Tooltip>
  );
}

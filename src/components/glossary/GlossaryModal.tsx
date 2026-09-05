"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Modal,
  ModalBody,
  ModalContent,
  ModalOverlay,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { MdArrowBack, MdClose, MdArrowForward } from "react-icons/md";
import Link from "next/link";
import { getEntry, type GlossaryCategory } from "@/lib/glossary";

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";

/** 분류마다 다른 색을 줘서, 여러 용어를 오갈 때 어느 갈래인지 눈으로 잡히게 한다 */
const HUE: Record<GlossaryCategory, { light: string; dark: string }> = {
  "센서·좌표": { light: "#0f766e", dark: "#5eead4" },
  "씬·데이터": { light: "#0369a1", dark: "#7dd3fc" },
  "카메라·영상": { light: "#a21caf", dark: "#f0abfc" },
  어노테이션: { light: "#b45309", dark: "#fcd34d" },
  "인지 태스크": { light: "#1d4ed8", dark: "#93c5fd" },
  "예측·계획·제어": { light: "#0e7490", dark: "#67e8f9" },
  "로그·포맷": { light: "#4d7c0f", dark: "#bef264" },
  "데이터 인프라": { light: "#6d28d9", dark: "#c4b5fd" },
  도구: { light: "#475569", dark: "#cbd5e1" },
  "모델·학습": { light: "#be123c", dark: "#fda4af" },
};

/** **굵게** 와 `코드` 만 해석하는 최소 인라인 렌더러 */
function rich(text: string, codeBg: string, codeFg: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let cursor = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor) out.push(text.slice(cursor, m.index));
    if (m[1] !== undefined) {
      out.push(
        <Box as="strong" key={k++} fontWeight={700}>
          {m[1]}
        </Box>
      );
    } else {
      out.push(
        <Box
          as="code"
          key={k++}
          fontFamily={MONO}
          fontSize="0.86em"
          px="0.4em"
          py="0.12em"
          mx="0.1em"
          borderRadius="4px"
          bg={codeBg}
          color={codeFg}
          whiteSpace="nowrap"
        >
          {m[2]}
        </Box>
      );
    }
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

export default function GlossaryModal({
  id,
  isOpen,
  canGoBack,
  onBack,
  onClose,
  onNavigate,
}: {
  id: string;
  isOpen: boolean;
  canGoBack: boolean;
  onBack: () => void;
  onClose: () => void;
  onNavigate: (id: string) => void;
}) {
  const entry = getEntry(id);

  // 긴 항목은 본문이 잘린다. 아래가 더 있다는 신호가 없으면 '깨진 것'처럼 보여서,
  // 스크롤이 남아 있을 때만 하단에 페이드를 깐다.
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [hasMore, setHasMore] = useState(false);
  const measure = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    setHasMore(el.scrollHeight - el.scrollTop - el.clientHeight > 8);
  }, []);
  useEffect(() => {
    const t = setTimeout(measure, 60); // 열림 애니메이션이 끝난 뒤 재기
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [id, isOpen, measure]);

  const surface = useColorModeValue("#ffffff", "#15181d");
  const border = useColorModeValue("#e6e9ee", "#2a2f38");
  const bodyText = useColorModeValue("#2d3340", "#d7dce4");
  const dim = useColorModeValue("#6b7280", "#8b93a1");
  const panel = useColorModeValue("#f6f8fa", "#1c2027");
  const codeBg = useColorModeValue("#eceff3", "#262b33");
  const codeFg = useColorModeValue("#1a202c", "#e8ecf2");
  const chipBg = useColorModeValue("#f1f3f6", "#232830");
  const heading = useColorModeValue("#111827", "#f3f5f8");
  const mode = useColorModeValue("light", "dark") as "light" | "dark";

  if (!entry) return null;
  const accent = HUE[entry.category][mode];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      isCentered
      scrollBehavior="inside"
      motionPreset="slideInBottom"
      // autoFocus 를 끄면 포커스가 다이얼로그 밖에 남는다. Chakra 는 Escape 를
      // 다이얼로그 엘리먼트의 keydown 으로 받으므로, 그 상태에서는 ESC 로 닫히지
      // 않고 키보드 사용자가 모달 안으로 들어가지도 못한다. 기본값(포커스 이동)을 쓴다.
      initialFocusRef={closeRef}
    >
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
      <ModalContent
        // ModalHeader 대신 커스텀 헤더를 쓰므로 Chakra 가 aria-labelledby 를
        // 못 만든다. 스크린리더가 무엇이 열렸는지 알 수 있게 직접 붙인다.
        aria-label={`용어 설명: ${entry.term}`}
        // 데스크톱은 가운데 카드, 모바일은 아래에서 올라오는 시트
        alignSelf={{ base: "flex-end", md: "center" }}
        w="100%"
        maxW={{ base: "100%", md: "620px" }}
        m={0}
        mx={{ base: 0, md: 4 }}
        maxH={{ base: "88svh", md: "min(80vh, 760px)" }}
        bg={surface}
        color={bodyText}
        position="relative"
        borderRadius={{ base: "20px 20px 0 0", md: "16px" }}
        border="1px solid"
        borderColor={border}
        boxShadow="0 24px 64px rgba(0,0,0,0.28)"
        overflow="hidden"
      >
        {/* 모바일 시트의 손잡이 */}
        <Box display={{ base: "block", md: "none" }} pt="10px" pb="2px">
          <Box w="38px" h="4px" borderRadius="full" bg={border} mx="auto" />
        </Box>

        {/* 헤더 */}
        <Box px={{ base: 5, md: 7 }} pt={{ base: 3, md: 6 }} pb={4}>
          <Flex align="flex-start" justify="space-between" gap={3}>
            <Box minW={0}>
              <HStack spacing={2} mb={2}>
                <Box
                  as="span"
                  fontFamily={MONO}
                  fontSize="10px"
                  fontWeight={700}
                  letterSpacing="0.1em"
                  color={accent}
                  border="1px solid"
                  borderColor={accent}
                  borderRadius="4px"
                  px="6px"
                  py="1px"
                  opacity={0.9}
                >
                  {entry.category}
                </Box>
              </HStack>
              <Text
                as="h2"
                fontSize={{ base: "1.35rem", md: "1.6rem" }}
                fontWeight={800}
                letterSpacing="-0.01em"
                lineHeight={1.25}
                color={heading}
              >
                {entry.term}
              </Text>
              {entry.full && (
                <Text fontFamily={MONO} fontSize="12px" color={dim} mt="6px" wordBreak="break-word">
                  {entry.full}
                </Text>
              )}
            </Box>

            <HStack spacing={1} flexShrink={0}>
              {canGoBack && (
                <IconButton
                  aria-label="이전 용어로"
                  icon={<MdArrowBack size={18} />}
                  size="sm"
                  variant="ghost"
                  borderRadius="8px"
                  onClick={onBack}
                />
              )}
              <IconButton
                ref={closeRef}
                aria-label="닫기"
                icon={<MdClose size={18} />}
                size="sm"
                variant="ghost"
                borderRadius="8px"
                onClick={onClose}
              />
            </HStack>
          </Flex>

          {/* 한 줄 정의 — 왼쪽 색 막대로 본문과 구분 */}
          <Box
            mt={4}
            bg={panel}
            borderLeft="3px solid"
            borderLeftColor={accent}
            borderRadius="0 8px 8px 0"
            px={4}
            py={3}
          >
            <Text fontSize={{ base: "0.94rem", md: "0.98rem" }} fontWeight={600} lineHeight={1.6}>
              {entry.summary}
            </Text>
          </Box>
        </Box>

        {/* 본문 */}
        <ModalBody ref={bodyRef} onScroll={measure} px={{ base: 5, md: 7 }} pt={0} pb={5}>
          {entry.body.map((line, i) =>
            line.startsWith("- ") ? (
              <Flex key={i} gap={2.5} mb={2} align="baseline">
                <Box
                  as="span"
                  flexShrink={0}
                  w="5px"
                  h="5px"
                  mt="1px"
                  borderRadius="full"
                  bg={accent}
                  transform="translateY(-2px)"
                />
                <Text fontSize="0.92rem" lineHeight={1.75}>
                  {rich(line.slice(2), codeBg, codeFg)}
                </Text>
              </Flex>
            ) : (
              <Text key={i} fontSize="0.94rem" lineHeight={1.8} mb={3.5}>
                {rich(line, codeBg, codeFg)}
              </Text>
            )
          )}

          {/* 관련 용어 */}
          {entry.related && entry.related.length > 0 && (
            <Box mt={6} pt={5} borderTop="1px solid" borderColor={border}>
              <Text
                fontFamily={MONO}
                fontSize="10px"
                letterSpacing="0.14em"
                color={dim}
                mb={2.5}
              >
                함께 볼 용어
              </Text>
              <Flex wrap="wrap" gap={2}>
                {entry.related.map((rid) => {
                  const r = getEntry(rid);
                  if (!r) return null;
                  return (
                    <Box
                      key={rid}
                      as="button"
                      type="button"
                      onClick={() => onNavigate(rid)}
                      bg={chipBg}
                      border="1px solid"
                      borderColor={border}
                      borderRadius="999px"
                      px={3}
                      py="5px"
                      fontSize="0.8rem"
                      fontWeight={600}
                      transition="all .14s ease"
                      _hover={{ borderColor: accent, color: accent }}
                      _focusVisible={{ outline: "2px solid", outlineColor: accent, outlineOffset: "2px" }}
                    >
                      {r.term}
                    </Box>
                  );
                })}
              </Flex>
            </Box>
          )}

          {/* 더 읽기 */}
          {entry.post && (
            <Box mt={5}>
              <Link href={entry.post.href} onClick={onClose} style={{ textDecoration: "none" }}>
                <Flex
                  align="center"
                  justify="space-between"
                  gap={3}
                  border="1px solid"
                  borderColor={border}
                  borderRadius="10px"
                  px={4}
                  py={3}
                  transition="all .14s ease"
                  _hover={{ borderColor: accent, bg: panel }}
                >
                  <Box>
                    <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.14em" color={dim}>
                      자세히
                    </Text>
                    <Text fontSize="0.92rem" fontWeight={700} mt="2px">
                      {entry.post.label}
                    </Text>
                  </Box>
                  <Box color={accent} flexShrink={0}>
                    <MdArrowForward size={18} />
                  </Box>
                </Flex>
              </Link>
            </Box>
          )}
        </ModalBody>

        <Box
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          h="56px"
          pointerEvents="none"
          opacity={hasMore ? 1 : 0}
          transition="opacity .18s ease"
          bgGradient={`linear(to-t, ${surface}, ${surface}00)`}
        />
      </ModalContent>
    </Modal>
  );
}

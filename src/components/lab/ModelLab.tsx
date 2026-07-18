"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";

// NOTE: intentionally NOT using `dynamic(..., { ssr: false })`. On Amplify's
// Next adapter an `ssr:false` route (whose content is entirely client-only)
// was mis-served — the SSR HTML was correct but the browser resolved the route
// to the not-found page after hydration. Instead we code-split the WebGL canvas
// with a normal dynamic import and only mount it on the client via `mounted`,
// which keeps the 3D strictly client-side without the ssr:false footgun.
const LabCanvas = dynamic(() => import("./LabCanvas"), {
  loading: () => null,
});

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";
const ACCENT = "#c9ff4d";
const STATUS = "#5ce0c0";

// ─────────────────────────────────────────────────────────────
// 👇 여기가 전부입니다.
// Tripo에서 이미지 → .glb 를 뽑아 `public/models/` 에 넣고,
// 아래 경로만 지정하면 플레이스홀더가 실제 모델로 바뀝니다.
//   예) const MODEL_URL = "/models/my-tripo-model.glb";
const MODEL_URL: string = "";
// ─────────────────────────────────────────────────────────────

function Toggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      px={3}
      h="30px"
      borderRadius="4px"
      border="1px solid"
      borderColor={active ? ACCENT : "whiteAlpha.200"}
      bg={active ? "rgba(201,255,77,0.12)" : "transparent"}
      color={active ? ACCENT : "whiteAlpha.700"}
      fontFamily={MONO}
      fontSize="11px"
      fontWeight={600}
      letterSpacing="0.04em"
      transition="all 0.15s ease"
      _hover={{ borderColor: active ? ACCENT : "whiteAlpha.400", color: active ? ACCENT : "white" }}
      _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "2px" }}
      display="inline-flex"
      alignItems="center"
      gap={2}
    >
      <Box as="span" w="6px" h="6px" borderRadius="full" bg={active ? ACCENT : "whiteAlpha.300"} boxShadow={active ? `0 0 8px ${ACCENT}` : "none"} />
      {children}
    </Box>
  );
}

export default function ModelLab() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sourceLabel = MODEL_URL
    ? MODEL_URL.split("/").pop()
    : "procedural placeholder";

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } } };
  const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } } };

  return (
    <Box
      position="relative"
      w="100vw"
      left="50%"
      right="50%"
      ml="-50vw"
      mr="-50vw"
      mt="-12px"
      h={{ base: "calc(100svh - 84px)", md: "calc(100vh - 84px)" }}
      minH={{ base: "600px", md: "640px" }}
      overflow="hidden"
      bg={BG}
      color="white"
      sx={{ isolation: "isolate" }}
    >
      {/* 3D scene — client-only (mounted guard replaces ssr:false) */}
      {mounted && (
        <LabCanvas modelUrl={MODEL_URL} autoRotate={autoRotate} wireframe={wireframe} />
      )}

      {/* scrims for text legibility */}
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient={`linear(to-t, ${BG} 1%, rgba(1,3,10,0.28) 22%, transparent 50%)`} />
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient="linear(to-r, rgba(1,3,10,0.6), rgba(1,3,10,0.08) 42%, transparent 66%)" />

      {/* ── top bar ── */}
      <Flex position="absolute" top={0} left={0} right={0} pt={4} px={{ base: 5, md: 6, lg: 8 }} align="center" justify="space-between" zIndex={4} pointerEvents="none">
        <Flex align="center" gap={2}>
          <MotionBox w="6px" h="6px" borderRadius="full" bg={STATUS} boxShadow={`0 0 10px ${STATUS}`} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <Text fontFamily={MONO} fontSize={{ base: "10px", md: "11px" }} fontWeight={600} letterSpacing="0.16em" color="whiteAlpha.800">
            MODEL LAB · GLB VIEWER
          </Text>
        </Flex>

        {/* controls */}
        <Flex align="center" gap={2} pointerEvents="auto">
          <Toggle active={autoRotate} onClick={() => setAutoRotate((v) => !v)}>AUTO-ROTATE</Toggle>
          <Toggle active={wireframe} onClick={() => setWireframe((v) => !v)}>WIREFRAME</Toggle>
        </Flex>
      </Flex>

      {/* ── editorial copy ── */}
      <MotionBox variants={container} initial="hidden" animate="show" position="absolute" zIndex={3} bottom={{ base: "auto", md: "84px" }} top={{ base: 16, md: "auto" }} left={{ base: 5, md: 8, lg: 12 }} maxW={{ base: "calc(100vw - 2.5rem)", md: "560px" }} pointerEvents="none">
        <MotionBox variants={item}>
          <Text fontFamily={MONO} fontSize="11px" letterSpacing="0.18em" color={ACCENT} mb={3}>
            IMAGE → TRIPO → .GLB → WEB
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Text as="h1" fontFamily="'Pretendard Variable', Pretendard, sans-serif" fontWeight={800} lineHeight={{ base: 1.12, md: 1.05 }} letterSpacing="-0.02em" fontSize={{ base: "1.7rem", sm: "2.3rem", md: "2.9rem", lg: "3.2rem" }} color="white">
            From a flat image to a model you can orbit.
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Text mt={{ base: 3, md: 4 }} maxW={{ base: "100%", md: "500px" }} fontSize={{ base: "13px", md: "14.5px" }} lineHeight={1.65} color="whiteAlpha.700">
            Tripo turns a single reference image into a production-ready <Box as="code" fontFamily={MONO} fontSize="0.9em" color={ACCENT}>.glb</Box>. Drop it into this scene and it&apos;s instantly interactive — no 3D modeling, no game engine. Drag to orbit · scroll to zoom.
          </Text>
        </MotionBox>
      </MotionBox>

      {/* ── bottom status strip ── */}
      <Flex position="absolute" bottom={0} left={0} right={0} h="40px" px={{ base: 5, md: 6, lg: 8 }} align="center" gap={4} zIndex={4} bg="rgba(2,4,9,0.6)" borderTop="1px solid" borderColor="whiteAlpha.100" sx={{ backdropFilter: "blur(6px)" }}>
        <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.08em" color="whiteAlpha.500">
          SOURCE
        </Text>
        <Text fontFamily={MONO} fontSize="10px" color={MODEL_URL ? STATUS : "whiteAlpha.700"} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {sourceLabel}
        </Text>
        <Box flex="1" />
        <Text fontFamily={MONO} fontSize="10px" color="whiteAlpha.400" display={{ base: "none", sm: "block" }}>
          three.js · react-three-fiber
        </Text>
      </Flex>
    </Box>
  );
}

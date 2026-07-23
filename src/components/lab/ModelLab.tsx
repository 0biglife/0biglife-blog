"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import type { WebGLRenderer } from "three";
import {
  MODELS,
  MATERIALS,
  ENVS,
  DEFAULT_STATE,
  encodeState,
  decodeState,
  modelUrl,
  type StudioState,
} from "./studioConfig";

// Client-only WebGL canvas (mounted guard, not ssr:false — see the note that
// used to live here; Amplify mishandled ssr:false routes).
const LabCanvas = dynamic(() => import("./LabCanvas"), { loading: () => null });

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";
const ACCENT = "#c9ff4d";
const STATUS = "#5ce0c0";
const CONTACT = "mailto:0biglife@gmail.com?subject=Interactive%203D%20문의";

// ── little HUD primitives ──────────────────────────────────────────
function Seg<T extends string>({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onPick: (id: T) => void;
}) {
  return (
    <Flex direction="column" gap={1.5}>
      <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.18em" color="whiteAlpha.500">
        {label}
      </Text>
      <Flex gap={1} flexWrap="wrap">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Box
              as="button"
              type="button"
              key={o.id}
              onClick={() => onPick(o.id)}
              px={2}
              h="26px"
              borderRadius="4px"
              border="1px solid"
              borderColor={on ? ACCENT : "whiteAlpha.150"}
              bg={on ? "rgba(201,255,77,0.14)" : "transparent"}
              color={on ? ACCENT : "whiteAlpha.700"}
              fontFamily={MONO}
              fontSize="10px"
              fontWeight={600}
              letterSpacing="0.03em"
              transition="all 0.14s ease"
              _hover={{ borderColor: on ? ACCENT : "whiteAlpha.400", color: on ? ACCENT : "white" }}
              _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "2px" }}
            >
              {o.label}
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

function Chk({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onToggle}
      px={2.5}
      h="26px"
      borderRadius="4px"
      border="1px solid"
      borderColor={on ? ACCENT : "whiteAlpha.150"}
      bg={on ? "rgba(201,255,77,0.12)" : "transparent"}
      color={on ? ACCENT : "whiteAlpha.700"}
      fontFamily={MONO}
      fontSize="10px"
      fontWeight={600}
      letterSpacing="0.04em"
      display="inline-flex"
      alignItems="center"
      gap={2}
      transition="all 0.14s ease"
      _hover={{ borderColor: on ? ACCENT : "whiteAlpha.400", color: on ? ACCENT : "white" }}
      _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "2px" }}
    >
      <Box as="span" w="6px" h="6px" borderRadius="full" bg={on ? ACCENT : "whiteAlpha.300"} boxShadow={on ? `0 0 8px ${ACCENT}` : "none"} />
      {label}
    </Box>
  );
}

function ActionBtn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      px={3.5}
      h="30px"
      borderRadius="4px"
      border="1px solid"
      borderColor={primary ? ACCENT : "whiteAlpha.250"}
      bg={primary ? ACCENT : "rgba(4,7,12,0.5)"}
      color={primary ? "#06140a" : "whiteAlpha.900"}
      fontFamily={MONO}
      fontSize="11px"
      fontWeight={700}
      letterSpacing="0.03em"
      display="inline-flex"
      alignItems="center"
      gap={2}
      transition="transform 0.14s ease, box-shadow 0.2s ease, border-color 0.2s ease"
      _hover={{ transform: "translateY(-1px)", boxShadow: primary ? `0 8px 24px rgba(201,255,77,0.25)` : "none", borderColor: ACCENT }}
      _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "2px" }}
    >
      {children}
    </Box>
  );
}

export default function ModelLab() {
  const [s, setS] = useState<StudioState>(DEFAULT_STATE);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const glRef = useRef<WebGLRenderer | null>(null);

  // client-only WebGL (mounted guard; Amplify mishandled ssr:false routes).
  // hydrate from ?s= at the same time (SSR renders defaults → no mismatch).
  useEffect(() => {
    setMounted(true);
    const raw = new URLSearchParams(window.location.search).get("s");
    if (raw) setS(decodeState(raw));
  }, []);

  const update = useCallback((patch: Partial<StudioState>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try {
        const url = `${window.location.pathname}?s=${encodeState(next)}`;
        window.history.replaceState(null, "", url);
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const onShare = useCallback(async () => {
    try {
      const link = `${window.location.origin}/lab?s=${encodeState(s)}`;
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }, [s]);

  const onSavePng = useCallback(() => {
    const gl = glRef.current;
    if (!gl) return;
    try {
      const data = gl.domElement.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = data;
      a.download = `0biglife-lab-${s.model}-${s.material}.png`;
      a.click();
    } catch {
      /* capture blocked */
    }
  }, [s.model, s.material]);

  // full-screen scene: lock page scroll + near-black bg (matches / and /autonomy)
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { ho: html.style.overflow, bo: body.style.overflow, hb: html.style.background, bb: body.style.background };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.background = BG;
    body.style.background = BG;
    return () => {
      html.style.overflow = prev.ho;
      body.style.overflow = prev.bo;
      html.style.background = prev.hb;
      body.style.background = prev.bb;
    };
  }, []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } } };

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
      {/* 3D scene — client-only via mounted guard */}
      {mounted && (
        <LabCanvas
          modelUrl={modelUrl(s.model)}
          material={s.material}
          env={s.env}
          autoRotate={s.autoRotate}
          onReady={(gl) => (glRef.current = gl)}
        />
      )}

      {/* atmosphere overlays (over canvas, under HUD) */}
      {s.scanline && (
        <Box
          position="absolute"
          inset={0}
          zIndex={2}
          pointerEvents="none"
          sx={{
            backgroundImage: "repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 2px, transparent 4px)",
            mixBlendMode: "overlay",
            opacity: 0.7,
          }}
        />
      )}
      {s.grain && (
        <Box
          position="absolute"
          inset={0}
          zIndex={2}
          pointerEvents="none"
          sx={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            opacity: 0.05,
            mixBlendMode: "overlay",
          }}
        />
      )}

      {/* legibility scrims */}
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient={`linear(to-t, ${BG} 2%, rgba(1,3,10,0.35) 26%, transparent 52%)`} />

      {/* ── top bar ── */}
      <Flex position="absolute" top={0} left={0} right={0} pt={4} px={{ base: 5, md: 6, lg: 8 }} align="center" justify="space-between" zIndex={4} pointerEvents="none">
        <Flex align="center" gap={2}>
          <MotionBox w="6px" h="6px" borderRadius="full" bg={STATUS} boxShadow={`0 0 10px ${STATUS}`} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
          <Text fontFamily={MONO} fontSize={{ base: "10px", md: "11px" }} fontWeight={600} letterSpacing="0.16em" color="whiteAlpha.800">
            MODEL LAB · 3D STUDIO
          </Text>
        </Flex>
        <Flex align="center" gap={2} pointerEvents="auto">
          <ActionBtn onClick={onShare}>{copied ? "복사됨 ✓" : "SHARE ↗"}</ActionBtn>
          <ActionBtn onClick={onSavePng}>SAVE PNG</ActionBtn>
        </Flex>
      </Flex>

      {/* ── editorial eyebrow (top-left, below bar) ── */}
      <MotionBox variants={container} initial="hidden" animate="show" position="absolute" zIndex={3} top={{ base: 16, md: 20 }} left={{ base: 5, md: 8, lg: 12 }} maxW={{ base: "calc(100vw - 2.5rem)", md: "460px" }} pointerEvents="none">
        <MotionBox variants={item}>
          <Text fontFamily={MONO} fontSize="11px" letterSpacing="0.18em" color={ACCENT} mb={2.5}>
            YOU DIRECT THE SCENE
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Text as="h1" fontFamily="'Pretendard Variable', Pretendard, sans-serif" fontWeight={800} lineHeight={{ base: 1.12, md: 1.06 }} letterSpacing="-0.02em" fontSize={{ base: "1.5rem", sm: "2rem", md: "2.5rem" }} color="white">
            A 3D studio in your browser.
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Text mt={{ base: 2.5, md: 3 }} fontSize={{ base: "12.5px", md: "13.5px" }} lineHeight={1.6} color="whiteAlpha.650">
            Swap the model, its finish, the light, the mood — then <Box as="span" color={ACCENT}>SHARE</Box> the exact scene or <Box as="span" color={ACCENT}>SAVE</Box> a frame.
          </Text>
        </MotionBox>
      </MotionBox>

      {/* ── control console (bottom) ── */}
      <MotionBox
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        zIndex={5}
        px={{ base: 3, md: 6, lg: 8 }}
        pb={{ base: 3, md: 4 }}
        pointerEvents="none"
      >
        <Flex
          pointerEvents="auto"
          align={{ base: "stretch", lg: "flex-end" }}
          justify="space-between"
          gap={{ base: 3, lg: 6 }}
          direction={{ base: "column", lg: "row" }}
          bg="rgba(3,6,12,0.66)"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="12px"
          p={{ base: 3, md: 4 }}
          sx={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        >
          <Flex gap={{ base: 4, md: 6 }} flexWrap="wrap" align="flex-start">
            <Seg label="MODEL" value={s.model} options={MODELS} onPick={(id) => update({ model: id })} />
            <Seg label="FINISH" value={s.material} options={MATERIALS} onPick={(id) => update({ material: id })} />
            <Seg label="ENV" value={s.env} options={ENVS} onPick={(id) => update({ env: id })} />
            <Flex direction="column" gap={1.5}>
              <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.18em" color="whiteAlpha.500">
                FX · MOTION
              </Text>
              <Flex gap={1} flexWrap="wrap">
                <Chk label="SCAN" on={s.scanline} onToggle={() => update({ scanline: !s.scanline })} />
                <Chk label="GRAIN" on={s.grain} onToggle={() => update({ grain: !s.grain })} />
                <Chk label="SPIN" on={s.autoRotate} onToggle={() => update({ autoRotate: !s.autoRotate })} />
              </Flex>
            </Flex>
          </Flex>

          {/* soft revenue CTA — same instrument tone, not a shout */}
          <Flex direction="column" gap={1.5} align={{ base: "flex-start", lg: "flex-end" }} minW={{ lg: "200px" }}>
            <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.18em" color="whiteAlpha.400">
              BUILT BY 0BIGLIFE
            </Text>
            <Box
              as="a"
              href={CONTACT}
              display="block"
              fontSize="12px"
              lineHeight={1.5}
              color="whiteAlpha.700"
              textAlign={{ base: "left", lg: "right" }}
              transition="color 0.2s ease"
              _hover={{ color: ACCENT }}
            >
              이런 인터랙티브 3D, 제품·브랜드에도{" "}
              <Box as="span" whiteSpace="nowrap">
                →{" "}
                <Box as="span" color={ACCENT} fontFamily={MONO} fontWeight={700}>
                  문의
                </Box>
              </Box>
            </Box>
          </Flex>
        </Flex>
      </MotionBox>
    </Box>
  );
}

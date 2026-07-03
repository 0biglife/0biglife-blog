"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { PROFILE } from "@/lib/constant";
import { ACCENT, STATUS, type SceneQuality } from "./scene/sceneTypes";
import type { SceneStats } from "./scene/PerceptionCanvas";

const PerceptionCanvas = dynamic(() => import("./scene/PerceptionCanvas"), { ssr: false });
const TelemetryGraphs = dynamic(() => import("./TelemetryGraphs"), { ssr: false });

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";
// jet colormap as a CSS gradient (for the range colorbar)
const JET = "linear-gradient(to top,#0808c8,#0090ff,#00e6c0,#38ff5a,#d6ff00,#ff9800,#ff2a00)";

function pickQuality(): SceneQuality {
  if (typeof window === "undefined") return { maxAgents: 16, lidarPoints: 48000, lidarStride: 1, bloom: false };
  const w = window.innerWidth;
  const weak = (navigator.hardwareConcurrency || 4) <= 4;
  if (w < 820) return { maxAgents: 12, lidarPoints: 15000, lidarStride: 1, bloom: false };
  return { maxAgents: 16, lidarPoints: weak ? 32000 : 56000, lidarStride: 1, bloom: false };
}

const VAL_STYLE = {
  fontFamily: MONO,
  fontSize: "11px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.85)",
  fontVariantNumeric: "tabular-nums" as const,
};
function Stat({ label, spanRef, seed }: { label: string; spanRef: RefObject<HTMLSpanElement | null>; seed: string }) {
  return (
    <Flex align="baseline" gap={1.5}>
      <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.1em" color="whiteAlpha.400">{label}</Text>
      <span ref={spanRef} style={VAL_STYLE}>{seed}</span>
    </Flex>
  );
}

export default function HeroScene() {
  const [quality] = useState<SceneQuality>(() => pickQuality());
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);
  const ptsRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);
  const trkRef = useRef<HTMLSpanElement>(null);
  const tcRef = useRef<HTMLSpanElement>(null);

  const onStats = useCallback((s: SceneStats) => {
    if (fpsRef.current) fpsRef.current.textContent = String(s.fps);
    if (ptsRef.current) ptsRef.current.textContent = (s.points / 1000).toFixed(1) + "k";
    if (frameRef.current) frameRef.current.textContent = "#" + String(s.frame).padStart(6, "0");
    if (trkRef.current) trkRef.current.textContent = String(s.tracks);
    if (tcRef.current) {
      const sec = s.frame / 60;
      const mm = Math.floor(sec / 60);
      const ss = Math.floor(sec % 60);
      const ms = Math.floor((sec * 1000) % 1000);
      tcRef.current.textContent = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
    }
  }, []);

  const scrollToExperiments = useCallback(() => {
    document.getElementById("experiments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const item = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } } };

  return (
    <Box position="relative" w="100vw" left="50%" right="50%" ml="-50vw" mr="-50vw" mt="-12px" h={{ base: "calc(100svh - 84px)", md: "calc(100vh - 84px)" }} minH={{ base: "600px", md: "660px" }} overflow="hidden" bg={BG} color="white" sx={{ isolation: "isolate" }}>
      <PerceptionCanvas quality={quality} labelLayerRef={labelLayerRef} onStats={onStats} />

      {/* renderer-owned object labels (desktop only — they clutter on mobile) */}
      <Box ref={labelLayerRef} position="absolute" inset={0} pointerEvents="none" zIndex={2} overflow="hidden" display={{ base: "none", md: "block" }} />

      {/* scrims */}
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient={`linear(to-t, ${BG} 2%, rgba(1,3,10,0.32) 24%, transparent 52%)`} />
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient="linear(to-r, rgba(1,3,10,0.66), rgba(1,3,10,0.12) 40%, transparent 64%)" />

      {/* ── top tool bar (desktop) ── */}
      <Flex position="absolute" top={0} left={0} right={0} h="38px" px={{ md: 5, lg: 8 }} align="center" justify="space-between" zIndex={4} display={{ base: "none", md: "flex" }} bg="rgba(2,4,9,0.55)" borderBottom="1px solid" borderColor="whiteAlpha.100" sx={{ backdropFilter: "blur(6px)" }}>
        <Flex align="center" gap={4}>
          <Flex align="center" gap={2}>
            <MotionBox w="6px" h="6px" borderRadius="full" bg={STATUS} boxShadow={`0 0 10px ${STATUS}`} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
            <Text fontFamily={MONO} fontSize="11px" fontWeight={600} letterSpacing="0.16em" color="whiteAlpha.800">PERCEPTION · LIDAR</Text>
          </Flex>
          <Flex align="center" gap={1}>
            {["3D", "BEV", "CAM"].map((v, i) => (
              <Box key={v} px={2} py="2px" borderRadius="3px" fontFamily={MONO} fontSize="10px" letterSpacing="0.08em" border="1px solid" borderColor={i === 0 ? "whiteAlpha.400" : "whiteAlpha.100"} color={i === 0 ? "white" : "whiteAlpha.400"} bg={i === 0 ? "whiteAlpha.100" : "transparent"}>{v}</Box>
            ))}
          </Flex>
        </Flex>
        <Flex align="center" gap={{ md: 3, lg: 5 }}>
          <Stat label="FPS" spanRef={fpsRef} seed="60" />
          <Stat label="POINTS" spanRef={ptsRef} seed="56.0k" />
          <Stat label="TRACKS" spanRef={trkRef} seed="19" />
          <Stat label="FRAME" spanRef={frameRef} seed="#000000" />
          <span ref={tcRef} style={{ fontFamily: MONO, fontSize: "11px", fontWeight: 600, color: STATUS, fontVariantNumeric: "tabular-nums" }}>00:00.000</span>
        </Flex>
      </Flex>

      {/* mobile status chip */}
      <Flex position="absolute" top={3} left={5} align="center" gap={2} zIndex={4} display={{ base: "flex", md: "none" }} pointerEvents="none">
        <MotionBox w="6px" h="6px" borderRadius="full" bg={STATUS} boxShadow={`0 0 10px ${STATUS}`} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.18em" color="whiteAlpha.700">PERCEPTION · LIDAR</Text>
      </Flex>

      {/* ── range colorbar (desktop) ── */}
      <Flex position="absolute" left={{ md: 5, lg: 8 }} top="46%" transform="translateY(-50%)" direction="row" align="stretch" gap={2} zIndex={3} display={{ base: "none", md: "flex" }} pointerEvents="none">
        <Box w="8px" h="150px" borderRadius="2px" border="1px solid" borderColor="whiteAlpha.200" sx={{ background: JET }} />
        <Flex direction="column" justify="space-between" py="1px">
          <Text fontFamily={MONO} fontSize="9px" color="whiteAlpha.500">58 m</Text>
          <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.1em" color="whiteAlpha.400" sx={{ writingMode: "vertical-rl" }}>RANGE</Text>
          <Text fontFamily={MONO} fontSize="9px" color="whiteAlpha.500">0 m</Text>
        </Flex>
      </Flex>

      {/* ── telemetry graphs ── */}
      <Box position="absolute" zIndex={3} top={{ base: "auto", md: "50px" }} bottom={{ base: 3, md: "56px" }} right={{ base: 3, md: 5 }} left={{ base: 3, md: "auto" }} w={{ base: "auto", md: "300px", lg: "336px" }} h={{ base: "min(42vh, 330px)", md: "auto" }}>
        <TelemetryGraphs />
      </Box>

      {/* ── editorial copy (English) ── */}
      <MotionBox variants={container} initial="hidden" animate="show" position="absolute" zIndex={3} top={{ base: 14, md: "auto" }} bottom={{ base: "auto", md: "72px" }} left={{ base: 5, md: 8, lg: 12 }} right={{ base: 5, md: "auto" }} maxW={{ base: "100%", md: "520px" }} pointerEvents="none">
        <MotionBox variants={item}>
          <Text as="h1" fontFamily="'Pretendard Variable', Pretendard, sans-serif" fontWeight={800} lineHeight={1.05} letterSpacing="-0.02em" fontSize={{ base: "2rem", sm: "2.5rem", md: "3rem", lg: "3.4rem" }} color="white">
            I make autonomous-driving data usable.
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Text mt={{ base: 3, md: 4 }} maxW="460px" fontSize={{ base: "13px", md: "14.5px" }} lineHeight={1.65} color="whiteAlpha.700">
            A data engineer who turns raw sensor and driving logs into clean, queryable data — and builds the tools people explore it with. Above is a live lidar view of that data. Drag to orbit.
          </Text>
        </MotionBox>
        <MotionBox variants={item}>
          <Flex align="center" gap={{ base: 2.5, md: 3 }} mt={{ base: 5, md: 7 }} pointerEvents="auto" flexWrap="wrap">
            <Box as="button" type="button" onClick={scrollToExperiments} display="inline-flex" alignItems="center" gap={2} px={{ base: 4, md: 5 }} h="42px" borderRadius="4px" bg={ACCENT} color="#06140a" fontFamily={MONO} fontSize="13px" fontWeight={700} letterSpacing="0.02em" transition="transform 0.15s ease, box-shadow 0.2s ease" _hover={{ transform: "translateY(-2px)", boxShadow: "0 10px 30px rgba(201,255,77,0.25)" }} _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "3px" }}>
              Experiments <Box as="span" aria-hidden>↓</Box>
            </Box>
            {[{ label: "LinkedIn", href: PROFILE.links.linkedin }, { label: "GitHub", href: PROFILE.links.github }].map((c) => (
              <Box key={c.label} as="a" href={c.href} target="_blank" rel="noopener noreferrer" display="inline-flex" alignItems="center" gap={2} px={{ base: 4, md: 5 }} h="42px" borderRadius="4px" border="1px solid" borderColor="whiteAlpha.250" color="whiteAlpha.900" fontFamily={MONO} fontSize="13px" fontWeight={500} transition="border-color 0.2s ease, background 0.2s ease" _hover={{ borderColor: ACCENT, bg: "whiteAlpha.50" }} _focusVisible={{ outline: "2px solid", outlineColor: ACCENT, outlineOffset: "3px" }}>
                {c.label} <Box as="span" aria-hidden fontSize="11px" opacity={0.7}>↗</Box>
              </Box>
            ))}
          </Flex>
        </MotionBox>
      </MotionBox>

      {/* ── playback timeline (desktop) ── */}
      <Flex position="absolute" bottom={0} left={0} right={0} h="42px" px={{ md: 5, lg: 8 }} align="center" gap={4} zIndex={4} display={{ base: "none", md: "flex" }} bg="rgba(2,4,9,0.6)" borderTop="1px solid" borderColor="whiteAlpha.100" sx={{ backdropFilter: "blur(6px)" }}>
        <Flex align="center" justify="center" boxSize="22px" borderRadius="3px" border="1px solid" borderColor="whiteAlpha.300" color="whiteAlpha.800" fontSize="9px">❚❚</Flex>
        <Text fontFamily={MONO} fontSize="10px" color="whiteAlpha.500">nuscenes-mini · scene-0061</Text>
        <Box position="relative" flex="1" h="4px" borderRadius="full" bg="whiteAlpha.150">
          {[0, 25, 50, 75, 100].map((t) => (
            <Box key={t} position="absolute" left={`${t}%`} top="-3px" w="1px" h="10px" bg="whiteAlpha.250" />
          ))}
          <MotionBox position="absolute" top="-4px" w="2px" h="12px" bg={STATUS} boxShadow={`0 0 8px ${STATUS}`} animate={{ left: ["0%", "100%"] }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} />
        </Box>
        <Text as="span" fontFamily={MONO} fontSize="10px" color="whiteAlpha.600" sx={{ fontVariantNumeric: "tabular-nums" }}>20 Hz · 32 beam</Text>
      </Flex>

      <VisuallyHidden>
        An autonomous-driving lidar point-cloud viewer. Concentric scan rings and surrounding objects render live around the ego vehicle as orange bounding boxes with class and range labels, with real-time vehicle telemetry — velocity, steering, acceleration and perception latency — graphed on the right. Drag to orbit the view.
      </VisuallyHidden>
    </Box>
  );
}

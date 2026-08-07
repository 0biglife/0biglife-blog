"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { MODELS, DEFAULT_MODEL, modelUrl, type ModelId } from "./studioConfig";

// Client-only WebGL canvas (mounted guard, not ssr:false — Amplify mishandled
// ssr:false routes and served the not-found page at some POPs).
const LabCanvas = dynamic(() => import("./LabCanvas"), { loading: () => null });

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";
const ACCENT = "#c9ff4d";
const STATUS = "#5ce0c0";

function Pill({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      px={2.5}
      h="28px"
      borderRadius="4px"
      border="1px solid"
      borderColor={on ? ACCENT : "whiteAlpha.150"}
      bg={on ? "rgba(201,255,77,0.14)" : "transparent"}
      color={on ? ACCENT : "whiteAlpha.700"}
      fontFamily={MONO}
      fontSize="10px"
      fontWeight={600}
      letterSpacing="0.04em"
      transition="all 0.14s ease"
      _hover={{ borderColor: on ? ACCENT : "whiteAlpha.400", color: on ? ACCENT : "white" }}
      _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "2px" }}
    >
      {label}
    </Box>
  );
}

export default function ModelLab() {
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [spin, setSpin] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

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
      {mounted && <LabCanvas modelUrl={modelUrl(model)} autoRotate={spin} />}

      {/* legibility scrim */}
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient={`linear(to-t, ${BG} 2%, rgba(1,3,10,0.35) 26%, transparent 52%)`} />

      {/* ── top bar ── */}
      <Flex position="absolute" top={0} left={0} right={0} pt={4} px={{ base: 5, md: 6, lg: 8 }} align="center" zIndex={4} pointerEvents="none">
        <Flex align="center" gap={2} minW={0}>
          <MotionBox
            flexShrink={0}
            w="6px"
            h="6px"
            borderRadius="full"
            bg={STATUS}
            boxShadow={`0 0 10px ${STATUS}`}
            animate={{ opacity: [1, 0.35, 1] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
          <Text fontFamily={MONO} fontSize={{ base: "10px", md: "11px" }} fontWeight={600} letterSpacing="0.16em" color="whiteAlpha.800" whiteSpace="nowrap">
            MODEL LAB
          </Text>
        </Flex>
      </Flex>

      {/* ── heading ── */}
      <MotionBox
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        position="absolute"
        zIndex={3}
        top={{ base: 16, md: 20 }}
        left={{ base: 5, md: 8, lg: 12 }}
        maxW={{ base: "82vw", sm: "70vw", md: "430px" }}
        pointerEvents="none"
      >
        <Text as="h1" fontFamily="'Pretendard Variable', Pretendard, sans-serif" fontWeight={800} lineHeight={{ base: 1.12, md: 1.06 }} letterSpacing="-0.02em" fontSize={{ base: "1.3rem", sm: "2rem", md: "2.5rem" }} color="white" sx={{ overflowWrap: "break-word" }}>
          GLB in the browser.
        </Text>
        <Text mt={{ base: 2.5, md: 3 }} fontSize={{ base: "12.5px", md: "13.5px" }} lineHeight={1.6} color="whiteAlpha.650">
          드래그해서 돌려보세요. 외부 CDN 없이 브라우저에서 바로 그립니다.
        </Text>
      </MotionBox>

      {/* ── controls (bottom) ── */}
      <MotionBox
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
          align="center"
          gap={{ base: 3, md: 5 }}
          flexWrap="wrap"
          bg="rgba(3,6,12,0.66)"
          border="1px solid"
          borderColor="whiteAlpha.100"
          borderRadius="12px"
          px={{ base: 3, md: 4 }}
          py={{ base: 2.5, md: 3 }}
          sx={{ backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}
        >
          <Flex align="center" gap={2} flexWrap="wrap">
            <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.18em" color="whiteAlpha.500" flexShrink={0}>
              MODEL
            </Text>
            {MODELS.map((m) => (
              <Pill key={m.id} label={m.label} on={m.id === model} onClick={() => setModel(m.id)} />
            ))}
          </Flex>
          <Pill label={spin ? "SPIN ON" : "SPIN OFF"} on={spin} onClick={() => setSpin((v) => !v)} />
          <Text fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400" ml="auto" display={{ base: "none", md: "block" }}>
            DamagedHelmet · Khronos glTF sample (CC-BY)
          </Text>
        </Flex>
      </MotionBox>
    </Box>
  );
}

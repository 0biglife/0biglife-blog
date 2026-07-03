"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { PROFILE } from "@/lib/constant";
import { ACCENT, STATUS, type SceneQuality } from "./scene/sceneTypes";

// three.js stays client-only, out of SSR + the server bundle.
const PerceptionCanvas = dynamic(() => import("./scene/PerceptionCanvas"), { ssr: false });
const TelemetryGraphs = dynamic(() => import("./TelemetryGraphs"), { ssr: false });

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";

/** Point budget + settings, picked once from the device. */
function pickQuality(): SceneQuality {
  if (typeof window === "undefined") {
    return { maxAgents: 16, lidarPoints: 48000, lidarStride: 1, bloom: false };
  }
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const weak = cores <= 4;
  if (w < 820) return { maxAgents: 12, lidarPoints: 15000, lidarStride: 1, bloom: false };
  return { maxAgents: 16, lidarPoints: weak ? 32000 : 56000, lidarStride: 1, bloom: false };
}

export default function HeroScene() {
  const { t } = useLanguage();
  const [quality] = useState<SceneQuality>(() => pickQuality());

  const scrollToExperiments = useCallback(() => {
    document.getElementById("experiments")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
  const item = {
    hidden: { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

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
      <PerceptionCanvas quality={quality} />

      {/* legibility scrims — keep pointer through so the viewer stays draggable */}
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient={`linear(to-t, ${BG} 2%, rgba(1,3,10,0.35) 26%, transparent 55%)`} />
      <Box position="absolute" inset={0} pointerEvents="none" zIndex={2} bgGradient="linear(to-r, rgba(1,3,10,0.7), rgba(1,3,10,0.15) 42%, transparent 66%)" />

      {/* viewer chrome — top-left */}
      <Flex position="absolute" top={{ base: 4, md: 6 }} left={{ base: 5, md: 8, lg: 12 }} align="center" gap={2.5} zIndex={3} pointerEvents="none">
        <MotionBox w="7px" h="7px" borderRadius="full" bg={STATUS} boxShadow={`0 0 12px ${STATUS}`} animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        <Text fontFamily={MONO} fontSize={{ base: "10px", md: "11.5px" }} letterSpacing="0.2em" textTransform="uppercase" color="whiteAlpha.700">
          LiDAR · 3D · LIVE
        </Text>
        <Box display={{ base: "none", md: "block" }} w="1px" h="12px" bg="whiteAlpha.300" mx={1} />
        <Text display={{ base: "none", md: "block" }} fontFamily={MONO} fontSize="11px" letterSpacing="0.06em" color="whiteAlpha.400">
          {t("scene.hintOrbit")}
        </Text>
      </Flex>

      {/* telemetry graphs — floating right (desktop) / bottom sheet (mobile) */}
      <Box
        position="absolute"
        zIndex={3}
        top={{ base: "auto", md: 5 }}
        bottom={{ base: 3, md: 5 }}
        right={{ base: 3, md: 5 }}
        left={{ base: 3, md: "auto" }}
        w={{ base: "auto", md: "300px", lg: "336px" }}
        h={{ base: "min(44vh, 340px)", md: "auto" }}
      >
        <TelemetryGraphs />
      </Box>

      {/* editorial copy — bottom-left (desktop) / top-left (mobile) */}
      <MotionBox
        variants={container}
        initial="hidden"
        animate="show"
        position="absolute"
        zIndex={3}
        top={{ base: 16, md: "auto" }}
        bottom={{ base: "auto", md: 12 }}
        left={{ base: 5, md: 8, lg: 12 }}
        right={{ base: 5, md: "auto" }}
        maxW={{ base: "100%", md: "500px" }}
        pointerEvents="none"
      >
        <MotionBox variants={item}>
          <Text
            as="h1"
            fontFamily="'Pretendard Variable', Pretendard, sans-serif"
            fontWeight={800}
            lineHeight={1.05}
            letterSpacing="-0.02em"
            fontSize={{ base: "1.9rem", sm: "2.4rem", md: "3rem", lg: "3.4rem" }}
            color="white"
            sx={{ wordBreak: "keep-all" }}
          >
            {t("scene.title")}
          </Text>
        </MotionBox>

        <MotionBox variants={item}>
          <Text mt={{ base: 3, md: 4 }} maxW="440px" fontSize={{ base: "13px", md: "14.5px" }} lineHeight={1.65} color="whiteAlpha.700" sx={{ wordBreak: "keep-all" }}>
            {t("scene.sub")}
          </Text>
        </MotionBox>

        <MotionBox variants={item}>
          <Flex align="center" gap={{ base: 2.5, md: 3 }} mt={{ base: 5, md: 7 }} pointerEvents="auto" flexWrap="wrap">
            <Box
              as="button"
              type="button"
              onClick={scrollToExperiments}
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={{ base: 4, md: 5 }}
              h="42px"
              borderRadius="4px"
              bg={ACCENT}
              color="#06140a"
              fontFamily={MONO}
              fontSize="13px"
              fontWeight={700}
              letterSpacing="0.02em"
              transition="transform 0.15s ease, box-shadow 0.2s ease"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 10px 30px rgba(201,255,77,0.25)" }}
              _focusVisible={{ outline: "2px solid", outlineColor: STATUS, outlineOffset: "3px" }}
            >
              {t("scene.scrollCue")}
              <Box as="span" aria-hidden>↓</Box>
            </Box>
            {[
              { label: "LinkedIn", href: PROFILE.links.linkedin },
              { label: "GitHub", href: PROFILE.links.github },
            ].map((c) => (
              <Box
                key={c.label}
                as="a"
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                display="inline-flex"
                alignItems="center"
                gap={2}
                px={{ base: 4, md: 5 }}
                h="42px"
                borderRadius="4px"
                border="1px solid"
                borderColor="whiteAlpha.250"
                color="whiteAlpha.900"
                fontFamily={MONO}
                fontSize="13px"
                fontWeight={500}
                transition="border-color 0.2s ease, background 0.2s ease"
                _hover={{ borderColor: ACCENT, bg: "whiteAlpha.50" }}
                _focusVisible={{ outline: "2px solid", outlineColor: ACCENT, outlineOffset: "3px" }}
              >
                {c.label}
                <Box as="span" aria-hidden fontSize="11px" opacity={0.7}>↗</Box>
              </Box>
            ))}
          </Flex>
        </MotionBox>
      </MotionBox>

      <VisuallyHidden>{t("scene.a11y")}</VisuallyHidden>
    </Box>
  );
}

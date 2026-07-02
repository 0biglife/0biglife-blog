"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { contributions } from "@/lib/contributions";
import type { HoverInfo } from "./CommitSkyline";

// three.js only on the client — keep it out of SSR + the server bundle.
const CommitSkyline = dynamic(() => import("./CommitSkyline"), { ssr: false });

const MotionBox = motion(Box);

const BG = "#05070a";
const ACCENT = "#c8ff5e";
const GREEN = "#7CFF9E";

/** Animated count-up. `start` gates the animation; rAF `now` keeps it monotonic. */
function useCountUp(target: number, durationMs: number, start: boolean): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    let t0 = -1;
    const step = (now: number) => {
      if (t0 < 0) t0 = now;
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 4);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs, start]);
  return value;
}

const fmt = (n: number) => n.toLocaleString("en-US");
const formatDate = (iso: string) => iso.replace(/-/g, ".");

export default function HeroSkyline() {
  const { t } = useLanguage();
  const [hover, setHover] = useState<HoverInfo>(null);
  const [started, setStarted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setStarted(true), 550);
    return () => window.clearTimeout(id);
  }, []);

  const total = useCountUp(contributions.total, 1700, started);
  const priv = useCountUp(contributions.private, 1700, started);
  const pct = useMemo(
    () =>
      contributions.total > 0
        ? Math.round((contributions.private / contributions.total) * 1000) / 10
        : 0,
    []
  );

  const onHover = useCallback((info: HoverInfo) => setHover(info), []);

  const scrollToWorks = useCallback(() => {
    document
      .getElementById("works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.11, delayChildren: 0.25 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <Box
      ref={wrapRef}
      position="relative"
      // full-bleed: escape the padded <main> to both viewport edges
      w="100vw"
      left="50%"
      right="50%"
      ml="-50vw"
      mr="-50vw"
      mt="-12px"
      h={{ base: "calc(100svh - 84px)", md: "calc(100vh - 84px)" }}
      minH={{ base: "560px", md: "620px" }}
      overflow="hidden"
      bg={BG}
      color="white"
      sx={{ isolation: "isolate" }}
    >
      <CommitSkyline data={contributions} onHover={onHover} />

      {/* legibility scrims (do not block pointer → skyline stays hoverable) */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        bgGradient={`linear(to-t, ${BG} 2%, rgba(5,7,10,0.35) 26%, transparent 55%)`}
      />
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        bgGradient="linear(to-r, rgba(5,7,10,0.82), rgba(5,7,10,0.25) 46%, transparent 70%)"
      />
      {/* film grain */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        opacity={0.05}
        sx={{ mixBlendMode: "overlay" }}
        backgroundImage={`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}
      />

      {/* hover tooltip */}
      {hover && (
        <Box
          position="absolute"
          left={`${hover.x}px`}
          top={`${hover.y}px`}
          transform="translate(-50%, calc(-100% - 14px))"
          pointerEvents="none"
          px={3}
          py={2}
          borderRadius="8px"
          bg="rgba(7,12,10,0.92)"
          border="1px solid"
          borderColor="rgba(124,255,158,0.32)"
          boxShadow="0 8px 30px rgba(0,0,0,0.5)"
          fontFamily="'JetBrains Mono', monospace"
          whiteSpace="nowrap"
          zIndex={3}
        >
          <Text fontSize="13px" fontWeight={600} color={hover.count > 0 ? ACCENT : "whiteAlpha.700"}>
            {hover.count > 0 ? `${hover.count} ${t("hero.commits")}` : "—"}
          </Text>
          <Text fontSize="11px" color="whiteAlpha.600" mt="2px">
            {formatDate(hover.date)}
          </Text>
        </Box>
      )}

      {/* hover affordance — top-right */}
      <Flex
        position="absolute"
        top={{ base: 4, md: 6 }}
        right={{ base: 4, md: 8 }}
        align="center"
        gap={2}
        pointerEvents="none"
        display={{ base: "none", md: "flex" }}
      >
        <Box w="6px" h="6px" borderRadius="full" bg={GREEN} boxShadow={`0 0 10px ${GREEN}`} />
        <Text fontFamily="'JetBrains Mono', monospace" fontSize="12px" letterSpacing="0.04em" color="whiteAlpha.600">
          {t("hero.hover")}
        </Text>
      </Flex>

      {/* main HUD — bottom-left editorial block */}
      <MotionBox
        variants={container}
        initial="hidden"
        animate="show"
        position="absolute"
        left={{ base: 5, md: 12, lg: 16 }}
        bottom={{ base: 7, md: 12 }}
        right={{ base: 5, md: "auto" }}
        maxW={{ base: "100%", md: "640px" }}
        pointerEvents="none"
      >
        <MotionBox variants={item}>
          <Flex align="center" gap={3} mb={{ base: 3, md: 4 }}>
            <Box w={{ base: "28px", md: "44px" }} h="1px" bg={GREEN} opacity={0.8} />
            <Text
              fontFamily="'JetBrains Mono', monospace"
              fontSize={{ base: "11px", md: "12.5px" }}
              letterSpacing="0.28em"
              textTransform="uppercase"
              color={GREEN}
            >
              {t("hero.eyebrow")}
            </Text>
          </Flex>
        </MotionBox>

        <MotionBox variants={item}>
          <Text
            as="h1"
            fontFamily="'Pretendard Variable', Pretendard, sans-serif"
            fontWeight={800}
            lineHeight={0.98}
            letterSpacing="-0.025em"
            fontSize={{ base: "2.4rem", sm: "3.2rem", md: "4.2rem", lg: "4.8rem" }}
            color="white"
            sx={{ wordBreak: "keep-all" }}
          >
            {t("hero.title")}
          </Text>
        </MotionBox>

        {/* the stat that carries the whole concept */}
        <MotionBox variants={item}>
          <Flex align="flex-end" gap={{ base: 4, md: 7 }} mt={{ base: 5, md: 7 }} flexWrap="wrap">
            <Box>
              <Text
                fontFamily="'JetBrains Mono', monospace"
                fontWeight={700}
                lineHeight={1}
                fontSize={{ base: "3rem", md: "4.4rem" }}
                color={ACCENT}
                sx={{ fontVariantNumeric: "tabular-nums", textShadow: `0 0 26px rgba(200,255,94,0.45)` }}
              >
                {fmt(total)}
              </Text>
              <Text mt={1} fontFamily="'JetBrains Mono', monospace" fontSize={{ base: "11px", md: "12px" }} letterSpacing="0.08em" color="whiteAlpha.600" textTransform="uppercase">
                {t("hero.statContrib")}
              </Text>
            </Box>

            <Box w="1px" alignSelf="stretch" my={1} bg="whiteAlpha.300" display={{ base: "none", sm: "block" }} />

            <Box>
              <Flex align="baseline" gap={2}>
                <Text
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={700}
                  lineHeight={1}
                  fontSize={{ base: "1.9rem", md: "2.6rem" }}
                  color="white"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(priv)}
                </Text>
                <Text fontFamily="'JetBrains Mono', monospace" fontSize={{ base: "13px", md: "15px" }} color={GREEN}>
                  {pct}%
                </Text>
              </Flex>
              <Text mt={1} fontFamily="'JetBrains Mono', monospace" fontSize={{ base: "11px", md: "12px" }} letterSpacing="0.08em" color="whiteAlpha.600" textTransform="uppercase">
                {t("hero.statPrivate")}
              </Text>
            </Box>
          </Flex>
        </MotionBox>

        <MotionBox variants={item}>
          <Text mt={{ base: 5, md: 6 }} maxW="540px" fontSize={{ base: "14px", md: "15.5px" }} lineHeight={1.7} color="whiteAlpha.700" sx={{ wordBreak: "keep-all" }}>
            {t("hero.lead")}
          </Text>
        </MotionBox>

        <MotionBox variants={item}>
          <Flex align="center" gap={5} mt={{ base: 6, md: 7 }} pointerEvents="auto" flexWrap="wrap">
            <Box
              as="button"
              type="button"
              onClick={scrollToWorks}
              display="inline-flex"
              alignItems="center"
              gap={2}
              px={5}
              h="44px"
              borderRadius="full"
              bg={ACCENT}
              color="#06140a"
              fontWeight={700}
              fontSize="14px"
              transition="transform 0.15s ease, box-shadow 0.2s ease"
              boxShadow="0 0 0 rgba(200,255,94,0)"
              _hover={{ transform: "translateY(-2px)", boxShadow: "0 10px 30px rgba(200,255,94,0.28)" }}
              _focusVisible={{ outline: "2px solid", outlineColor: GREEN, outlineOffset: "3px" }}
            >
              {t("hero.ctaWorks")}
              <Box as="span" aria-hidden>↓</Box>
            </Box>
            <Text fontFamily="'JetBrains Mono', monospace" fontSize="12px" color="whiteAlpha.500">
              {contributions.range.from.replace(/-/g, ".")} — {contributions.range.to.replace(/-/g, ".")}
            </Text>
          </Flex>
        </MotionBox>
      </MotionBox>

      {/* scroll cue — bottom center */}
      <MotionBox
        position="absolute"
        bottom={4}
        left="50%"
        transform="translateX(-50%)"
        pointerEvents="none"
        display={{ base: "none", lg: "flex" }}
        flexDirection="column"
        alignItems="center"
        gap={2}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <Text fontFamily="'JetBrains Mono', monospace" fontSize="10.5px" letterSpacing="0.2em" textTransform="uppercase" color="whiteAlpha.500">
          {t("hero.scroll")}
        </Text>
        <MotionBox
          w="1px"
          h="34px"
          bgGradient={`linear(to-b, ${GREEN}, transparent)`}
          animate={{ scaleY: [0.4, 1, 0.4], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          sx={{ transformOrigin: "top" }}
        />
      </MotionBox>

      <VisuallyHidden>
        {`GitHub contribution skyline: ${contributions.total} contributions in the last year, ${contributions.private} of them in private repositories (${pct}%). Busiest day: ${contributions.maxCount} contributions. ${contributions.activeDays} active days.`}
      </VisuallyHidden>
    </Box>
  );
}

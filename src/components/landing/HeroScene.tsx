"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import dynamic from "next/dynamic";
import { Box, Flex, Text, VisuallyHidden } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import { PROFILE } from "@/lib/constant";
import {
  ACCENT,
  BG,
  CLASS_COLOR,
  DriveInput,
  SceneQuality,
  STATUS,
  Telemetry,
} from "./scene/sceneTypes";

// three.js stays client-only, out of SSR + the server bundle.
const PerceptionCanvas = dynamic(() => import("./scene/PerceptionCanvas"), {
  ssr: false,
});

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";

/** Pick a render budget once, from the device. */
function pickQuality(): SceneQuality {
  if (typeof window === "undefined") {
    return { maxAgents: 20, lidarPoints: 4800, lidarStride: 1, bloom: true };
  }
  const w = window.innerWidth;
  const cores = navigator.hardwareConcurrency || 4;
  const small = w < 820;
  const weak = cores <= 4;
  if (small) {
    return { maxAgents: 12, lidarPoints: 2200, lidarStride: 2, bloom: false };
  }
  return {
    maxAgents: weak ? 16 : 22,
    lidarPoints: weak ? 3600 : 5400,
    lidarStride: weak ? 2 : 1,
    bloom: !weak,
  };
}

const fmt = (n: number) => n.toLocaleString("en-US");

type Mode = "replay" | "drive";

export default function HeroScene() {
  const { t } = useLanguage();
  const [quality] = useState<SceneQuality>(() => pickQuality());
  const [mode, setMode] = useState<Mode>("replay");

  const modeRef = useRef<Mode>("replay");
  const inputRef = useRef<DriveInput>({ throttle: 0, steer: 0 });
  const labelLayerRef = useRef<HTMLDivElement>(null);
  const pressed = useRef({ up: false, down: false, left: false, right: false });

  // Telemetry arrives ~8×/sec. Instead of holding it in HeroScene state (which
  // would re-render the whole hero + framer tree 8×/sec), fan it out to a
  // subscriber so ONLY the readout panel re-renders.
  const telemetryListeners = useRef(new Set<(t: Telemetry) => void>()).current;
  const onTelemetry = useCallback(
    (next: Telemetry) => {
      telemetryListeners.forEach((fn) => fn(next));
    },
    [telemetryListeners]
  );

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const recompute = useCallback(() => {
    const p = pressed.current;
    inputRef.current.throttle = (p.up ? 1 : 0) + (p.down ? -1 : 0);
    inputRef.current.steer = (p.right ? 1 : 0) + (p.left ? -1 : 0);
  }, []);

  const setMomentary = useCallback(
    (k: keyof typeof pressed.current, v: boolean) => {
      pressed.current[k] = v;
      recompute();
    },
    [recompute]
  );

  // keyboard drive controls (only while driving)
  useEffect(() => {
    if (mode !== "drive") return;
    const keys = pressed.current; // stable object — safe to use in cleanup
    const input = inputRef.current;
    const map: Record<string, keyof typeof pressed.current> = {
      ArrowUp: "up",
      KeyW: "up",
      ArrowDown: "down",
      KeyS: "down",
      ArrowLeft: "left",
      KeyA: "left",
      ArrowRight: "right",
      KeyD: "right",
    };
    const down = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (!k) return;
      e.preventDefault();
      setMomentary(k, true);
    };
    const up = (e: KeyboardEvent) => {
      const k = map[e.code];
      if (!k) return;
      setMomentary(k, false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keys.up = keys.down = keys.left = keys.right = false;
      input.throttle = 0;
      input.steer = 0;
    };
  }, [mode, setMomentary]);

  const toggleMode = useCallback(() => {
    setMode((m) => (m === "drive" ? "replay" : "drive"));
  }, []);

  const scrollToExperiments = useCallback(() => {
    document
      .getElementById("experiments")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
  };
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
    },
  };

  const legend = useMemo(
    () =>
      [
        { c: CLASS_COLOR.car, k: "scene.legendCar" as const },
        { c: CLASS_COLOR.truck, k: "scene.legendTruck" as const },
        { c: CLASS_COLOR.pedestrian, k: "scene.legendPed" as const },
        { c: CLASS_COLOR.cyclist, k: "scene.legendCyc" as const },
      ] as const,
    []
  );

  const driving = mode === "drive";

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
      minH={{ base: "560px", md: "640px" }}
      overflow="hidden"
      bg={BG}
      color="white"
      sx={{ isolation: "isolate" }}
    >
      <PerceptionCanvas
        quality={quality}
        modeRef={modeRef}
        inputRef={inputRef}
        labelLayerRef={labelLayerRef}
        onTelemetry={onTelemetry}
      />

      {/* renderer-owned floating labels live here */}
      <Box
        ref={labelLayerRef}
        position="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={2}
        overflow="hidden"
      />

      {/* legibility scrims — do not block pointer so the scene stays draggable */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={2}
        bgGradient={`linear(to-t, ${BG} 4%, rgba(5,7,10,0.4) 30%, transparent 62%)`}
      />
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={2}
        bgGradient="linear(to-r, rgba(5,7,10,0.78), rgba(5,7,10,0.2) 48%, transparent 72%)"
      />
      {/* film grain */}
      <Box
        position="absolute"
        inset={0}
        pointerEvents="none"
        zIndex={2}
        opacity={0.028}
        sx={{ mixBlendMode: "overlay" }}
        backgroundImage={`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`}
      />

      {/* telemetry panel — top-right (self-updating, isolated re-render) */}
      <TelemetryPanel listeners={telemetryListeners} mode={mode} />

      {/* main HUD — bottom-left editorial block */}
      <MotionBox
        variants={container}
        initial="hidden"
        animate="show"
        position="absolute"
        left={{ base: 5, md: 12, lg: 16 }}
        bottom={{ base: 24, md: 14 }}
        right={{ base: 5, md: "auto" }}
        maxW={{ base: "100%", md: "660px" }}
        zIndex={3}
        pointerEvents="none"
      >
        <MotionBox variants={item}>
          <Text
            as="h1"
            fontFamily="'Pretendard Variable', Pretendard, sans-serif"
            fontWeight={800}
            lineHeight={1.02}
            letterSpacing="-0.02em"
            fontSize={{ base: "2rem", sm: "2.7rem", md: "3.5rem", lg: "4.1rem" }}
            color="white"
            sx={{ wordBreak: "keep-all" }}
          >
            {t("scene.title")}
          </Text>
        </MotionBox>

        <MotionBox variants={item}>
          <Text
            mt={{ base: 4, md: 5 }}
            maxW="560px"
            fontSize={{ base: "13.5px", md: "15.5px" }}
            lineHeight={1.7}
            color="whiteAlpha.750"
            sx={{ wordBreak: "keep-all" }}
          >
            {t("scene.sub")}
          </Text>
        </MotionBox>

        <MotionBox variants={item}>
          <Flex
            align="center"
            gap={{ base: 3, md: 4 }}
            mt={{ base: 6, md: 8 }}
            pointerEvents="auto"
            flexWrap="wrap"
          >
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
              <Box as="span" aria-hidden>
                ↓
              </Box>
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
                letterSpacing="0.02em"
                transition="border-color 0.2s ease, color 0.2s ease, background 0.2s ease"
                _hover={{ borderColor: ACCENT, color: "white", bg: "whiteAlpha.50" }}
                _focusVisible={{
                  outline: "2px solid",
                  outlineColor: ACCENT,
                  outlineOffset: "3px",
                }}
              >
                {c.label}
                <Box as="span" aria-hidden fontSize="11px" opacity={0.7}>
                  ↗
                </Box>
              </Box>
            ))}
          </Flex>
        </MotionBox>
      </MotionBox>

      {/* controls — bottom center */}
      <Flex
        position="absolute"
        bottom={{ base: 4, md: 6 }}
        left="50%"
        transform="translateX(-50%)"
        direction="column"
        align="center"
        gap={3}
        zIndex={4}
        pointerEvents="none"
      >
        {driving && <DrivePad onPress={setMomentary} />}
        <Flex align="center" gap={3} pointerEvents="auto">
          <Text
            fontFamily={MONO}
            fontSize={{ base: "10px", md: "11px" }}
            letterSpacing="0.14em"
            textTransform="uppercase"
            color="whiteAlpha.500"
            display={{ base: "none", sm: "block" }}
          >
            {driving ? t("scene.driveHint") : t("scene.hintOrbit")}
          </Text>
          <Box
            as="button"
            type="button"
            onClick={toggleMode}
            display="inline-flex"
            alignItems="center"
            gap={2}
            px={4}
            h="38px"
            borderRadius="full"
            border="1px solid"
            borderColor={driving ? STATUS : "whiteAlpha.350"}
            bg={driving ? "rgba(124,255,158,0.12)" : "rgba(5,9,12,0.55)"}
            color={driving ? STATUS : "white"}
            fontFamily={MONO}
            fontSize="12px"
            fontWeight={600}
            letterSpacing="0.06em"
            transition="all 0.18s ease"
            _hover={{ borderColor: STATUS, bg: "rgba(124,255,158,0.14)" }}
            _focusVisible={{
              outline: "2px solid",
              outlineColor: STATUS,
              outlineOffset: "2px",
            }}
          >
            <Box
              as="span"
              w="6px"
              h="6px"
              borderRadius="full"
              bg={driving ? STATUS : ACCENT}
              boxShadow={`0 0 8px ${driving ? STATUS : ACCENT}`}
            />
            {driving ? t("scene.exit") : t("scene.take")}
          </Box>
        </Flex>
      </Flex>

      {/* legend — bottom right */}
      <Flex
        position="absolute"
        bottom={{ base: 4, md: 6 }}
        right={{ base: 4, md: 8 }}
        gap={{ base: 2.5, md: 4 }}
        zIndex={3}
        pointerEvents="none"
        display={{ base: "none", md: "flex" }}
      >
        {legend.map((l) => (
          <Flex key={l.k} align="center" gap={1.5}>
            <Box w="8px" h="8px" borderRadius="2px" bg={l.c} boxShadow={`0 0 8px ${l.c}`} />
            <Text
              fontFamily={MONO}
              fontSize="10.5px"
              letterSpacing="0.05em"
              color="whiteAlpha.600"
            >
              {t(l.k)}
            </Text>
          </Flex>
        ))}
      </Flex>

      <VisuallyHidden>{t("scene.a11y")}</VisuallyHidden>
    </Box>
  );
}

/* ---- telemetry readout ---------------------------------------------------- */
function TelemetryPanel({
  listeners,
  mode,
}: {
  listeners: Set<(t: Telemetry) => void>;
  mode: Mode;
}) {
  const { t } = useLanguage();
  // seeded so the HUD is alive on first paint; fixed constants keep SSR/CSR
  // identical (no hydration mismatch). The render loop pushes live values in.
  const [tel, setTel] = useState<Telemetry>(() => ({
    frameId: 0,
    speedKmh: 54,
    trackCount: 18,
    sensorHz: 10,
    lidarPoints: 5000,
    nearestDist: 22,
    mode: "replay",
  }));
  useEffect(() => {
    listeners.add(setTel);
    return () => {
      listeners.delete(setTel);
    };
  }, [listeners]);
  const rows: { label: string; value: string; accent?: boolean; hideBase?: boolean }[] = [
    { label: "SPEED", value: `${tel.speedKmh} km/h`, accent: true },
    { label: "TRACKS", value: `${tel.trackCount}` },
    {
      label: "NEAREST",
      value: tel.nearestDist != null ? `${Math.round(tel.nearestDist)} m` : "—",
    },
    { label: "LIDAR", value: `${fmt(tel.lidarPoints)} pts`, hideBase: true },
    { label: "SENSORS", value: `${tel.sensorHz} Hz`, hideBase: true },
    {
      label: "FRAME",
      value: `#${String(tel.frameId).padStart(5, "0")}`,
      hideBase: true,
    },
  ];

  return (
    <Box
      position="absolute"
      top={{ base: 12, md: 6 }}
      right={{ base: 4, md: 8 }}
      zIndex={3}
      pointerEvents="none"
      px={{ base: 3, md: 3.5 }}
      py={{ base: 2.5, md: 3 }}
      borderRadius="10px"
      bg="rgba(6,10,13,0.6)"
      border="1px solid"
      borderColor="whiteAlpha.150"
      backdropFilter="blur(6px)"
      minW={{ base: "132px", md: "188px" }}
      sx={{ WebkitBackdropFilter: "blur(6px)" }}
    >
      <Flex align="center" justify="space-between" gap={4} mb={2}>
        <Text
          fontFamily={MONO}
          fontSize={{ base: "9.5px", md: "10px" }}
          letterSpacing="0.16em"
          textTransform="uppercase"
          color="whiteAlpha.550"
        >
          {t("scene.hudTitle")}
        </Text>
        <Text
          fontFamily={MONO}
          fontSize={{ base: "9px", md: "9.5px" }}
          letterSpacing="0.1em"
          textTransform="uppercase"
          color={mode === "drive" ? ACCENT : STATUS}
        >
          {mode === "drive" ? t("scene.modeDrive") : t("scene.modeReplay")}
        </Text>
      </Flex>
      <Box as="dl" m={0}>
        {rows.map((r) => (
          <Flex
            key={r.label}
            justify="space-between"
            align="baseline"
            gap={4}
            py="2.5px"
            display={r.hideBase ? { base: "none", md: "flex" } : "flex"}
          >
            <Text
              as="dt"
              fontFamily={MONO}
              fontSize={{ base: "10px", md: "10.5px" }}
              letterSpacing="0.08em"
              color="whiteAlpha.500"
            >
              {r.label}
            </Text>
            <Text
              as="dd"
              m={0}
              fontFamily={MONO}
              fontSize={{ base: "11px", md: "12.5px" }}
              fontWeight={600}
              color={r.accent ? ACCENT : "whiteAlpha.900"}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {r.value}
            </Text>
          </Flex>
        ))}
      </Box>
    </Box>
  );
}

/* ---- on-screen drive pad -------------------------------------------------- */
function DrivePad({
  onPress,
}: {
  onPress: (k: "up" | "down" | "left" | "right", v: boolean) => void;
}) {
  const btn = (
    k: "up" | "down" | "left" | "right",
    glyph: string,
    label: string
  ) => (
    <Box
      as="button"
      type="button"
      aria-label={label}
      onPointerDown={(e: ReactPointerEvent<HTMLElement>) => {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        onPress(k, true);
      }}
      onPointerUp={() => onPress(k, false)}
      onPointerCancel={() => onPress(k, false)}
      onPointerLeave={() => onPress(k, false)}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      boxSize={{ base: "44px", md: "46px" }}
      borderRadius="12px"
      border="1px solid"
      borderColor="whiteAlpha.300"
      bg="rgba(5,9,12,0.6)"
      color="white"
      fontSize="18px"
      lineHeight={1}
      userSelect="none"
      sx={{ touchAction: "none" }}
      _active={{ bg: "rgba(124,255,158,0.16)", borderColor: STATUS }}
    >
      {glyph}
    </Box>
  );
  return (
    <Flex align="center" gap={{ base: 6, md: 8 }} pointerEvents="auto">
      <Flex align="center" gap={2}>
        {btn("left", "◀", "steer left")}
        {btn("right", "▶", "steer right")}
      </Flex>
      <Flex align="center" gap={2}>
        {btn("down", "▼", "brake")}
        {btn("up", "▲", "accelerate")}
      </Flex>
    </Flex>
  );
}

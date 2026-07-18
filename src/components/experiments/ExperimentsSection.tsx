"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { motion, useReducedMotion } from "framer-motion";
import ExperimentCanvas from "./ExperimentCanvas";
import { EXPERIMENTS, type Experiment } from "./data";
import { DOMAIN_ICON, IconArrowUpRight } from "@/components/icons/DomainIcons";

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#04060a";

// Procedural "material" grain — Shapefest's PBR-texture feel translated to code,
// so we get tooth/depth without shipping any raster asset. Self-contained SVG.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function GlyphBadge({ exp, size = 30 }: { exp: Experiment; size?: number }) {
  const Icon = DOMAIN_ICON[exp.variant];
  return (
    <Flex
      align="center"
      justify="center"
      boxSize={`${size}px`}
      borderRadius="7px"
      bg="rgba(2,4,9,0.55)"
      border="1px solid"
      borderColor="whiteAlpha.150"
      color={exp.accent}
      sx={{ backdropFilter: "blur(6px)" }}
    >
      <Icon size={Math.round(size * 0.56)} />
    </Flex>
  );
}

function TagChip({ label, accent }: { label: string; accent: string }) {
  return (
    <Box
      as="span"
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      px={2}
      py="2px"
      borderRadius="3px"
      border="1px solid"
      borderColor="whiteAlpha.200"
      fontFamily={MONO}
      fontSize="10px"
      letterSpacing="0.06em"
      color="whiteAlpha.700"
    >
      <Box as="span" w="5px" h="5px" borderRadius="full" bg={accent} />
      {label}
    </Box>
  );
}

function Card({
  exp,
  index,
  reduce,
  onOpen,
}: {
  exp: Experiment;
  index: number;
  reduce: boolean;
  onOpen: (e: Experiment) => void;
}) {
  const tiltRef = useRef<HTMLDivElement>(null);

  // Pointer-reactive tilt + cursor-following sheen. Values are pushed straight to
  // CSS custom properties (no React state) so 60fps pointer moves never re-render.
  const handleMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const el = tiltRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--gx", `${px * 100}%`);
      el.style.setProperty("--gy", `${py * 100}%`);
      el.style.setProperty("--glow", "1");
      if (!reduce) {
        el.style.setProperty("--rx", `${(0.5 - py) * 5}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * 6}deg`);
      }
    },
    [reduce]
  );

  const handleLeave = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--glow", "0");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  }, []);

  return (
    <MotionBox
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box
        ref={tiltRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        sx={{
          transformStyle: "preserve-3d",
          transform:
            "perspective(1000px) rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <Box
          as="button"
          type="button"
          onClick={() => onOpen(exp)}
          textAlign="left"
          position="relative"
          display="block"
          w="100%"
          borderRadius="8px"
          overflow="hidden"
          border="1px solid"
          borderColor="whiteAlpha.150"
          bg="rgba(255,255,255,0.015)"
          transition="border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease"
          _hover={{
            borderColor: exp.accent,
            bg: "rgba(255,255,255,0.03)",
            boxShadow: "0 24px 48px -24px rgba(0,0,0,0.85)",
          }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: exp.accent,
            outlineOffset: "2px",
          }}
          sx={{
            "&:hover .exp-arrow": { transform: "translate(2px,-2px)", color: exp.accent },
          }}
        >
          {/* live viz */}
          <Box
            position="relative"
            zIndex={0}
            bg="rgba(4,7,12,0.6)"
            borderBottom="1px solid"
            borderColor="whiteAlpha.100"
          >
            <ExperimentCanvas variant={exp.variant} height={168} />
            <Box
              position="absolute"
              inset={0}
              pointerEvents="none"
              bgGradient="linear(to-b, transparent 60%, rgba(4,6,10,0.5))"
            />
            {/* domain glyph — instrument-panel HUD readout */}
            <Flex position="absolute" top={2.5} left={2.5} align="center" gap={2}>
              <GlyphBadge exp={exp} />
            </Flex>
            <Text
              position="absolute"
              top={3}
              right={3}
              fontFamily={MONO}
              fontSize="10px"
              letterSpacing="0.12em"
              color="whiteAlpha.500"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              EXP·{String(index + 1).padStart(2, "0")}
            </Text>
          </Box>

          {/* cursor-following sheen (over viz, under text) */}
          <Box
            position="absolute"
            inset={0}
            zIndex={1}
            pointerEvents="none"
            sx={{
              background: `radial-gradient(340px circle at var(--gx,50%) var(--gy,50%), ${exp.accent}26, transparent 62%)`,
              opacity: "var(--glow,0)",
              transition: "opacity 0.35s ease",
              mixBlendMode: "screen",
            }}
          />

          <Box position="relative" zIndex={2} p={5}>
            <TagChip label={exp.tag} accent={exp.accent} />
            <Text
              mt={3}
              fontFamily="'Pretendard Variable', Pretendard, sans-serif"
              fontWeight={700}
              fontSize="18px"
              color="white"
              letterSpacing="-0.01em"
            >
              {exp.title}
            </Text>
            <Text mt={2} fontSize="13px" lineHeight={1.6} color="whiteAlpha.600" noOfLines={2}>
              {exp.blurb}
            </Text>
            <Flex mt={4} align="center" justify="space-between">
              <Text
                fontFamily={MONO}
                fontSize="10px"
                letterSpacing="0.14em"
                color="whiteAlpha.400"
              >
                OPEN
              </Text>
              <Box
                className="exp-arrow"
                color="whiteAlpha.500"
                transition="transform 0.25s ease, color 0.25s ease"
                display="inline-flex"
              >
                <IconArrowUpRight size={16} />
              </Box>
            </Flex>
          </Box>
        </Box>
      </Box>
    </MotionBox>
  );
}

function Modal({ exp, onClose }: { exp: Experiment; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <Flex
      position="fixed"
      inset={0}
      zIndex={2000}
      align="center"
      justify="center"
      p={{ base: 4, md: 8 }}
      bg="rgba(3,5,9,0.82)"
      sx={{ backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <MotionBox
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e: ReactMouseEvent) => e.stopPropagation()}
        w="100%"
        maxW="720px"
        borderRadius="12px"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.200"
        bg={BG}
        boxShadow="0 30px 80px rgba(0,0,0,0.6)"
      >
        <Box position="relative" borderBottom="1px solid" borderColor="whiteAlpha.100">
          <ExperimentCanvas variant={exp.variant} height={300} />
          <Flex position="absolute" top={3} left={3} align="center" gap={2}>
            <GlyphBadge exp={exp} size={34} />
          </Flex>
          <Box
            as="button"
            type="button"
            onClick={onClose}
            aria-label="Close"
            position="absolute"
            top={3}
            right={3}
            boxSize="34px"
            borderRadius="full"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            bg="rgba(4,7,12,0.7)"
            border="1px solid"
            borderColor="whiteAlpha.250"
            color="whiteAlpha.900"
            fontSize="16px"
            _hover={{ borderColor: exp.accent }}
          >
            ✕
          </Box>
        </Box>
        <Box p={{ base: 5, md: 7 }}>
          <TagChip label={exp.tag} accent={exp.accent} />
          <Text
            mt={3}
            fontFamily="'Pretendard Variable', Pretendard, sans-serif"
            fontWeight={800}
            fontSize={{ base: "22px", md: "26px" }}
            color="white"
            letterSpacing="-0.02em"
          >
            {exp.title}
          </Text>
          <Text mt={3} fontSize={{ base: "14px", md: "15px" }} lineHeight={1.7} color="whiteAlpha.750">
            {exp.blurb}
          </Text>
        </Box>
      </MotionBox>
    </Flex>
  );
}

export default function ExperimentsSection() {
  const [open, setOpen] = useState<Experiment | null>(null);
  const reduce = useReducedMotion() ?? false;
  const onOpen = useCallback((e: Experiment) => setOpen(e), []);
  const onClose = useCallback(() => setOpen(null), []);

  const handleSpot = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty("--spot-y", `${((e.clientY - r.top) / r.height) * 100}%`);
  }, []);

  return (
    <Box
      id="experiments"
      onMouseMove={handleSpot}
      position="relative"
      w="100vw"
      left="50%"
      right="50%"
      ml="-50vw"
      mr="-50vw"
      bg={BG}
      color="white"
      borderTop="1px solid"
      borderColor="whiteAlpha.100"
      px={{ base: 6, md: 12, lg: 16 }}
      py={{ base: 16, md: 24 }}
      overflow="hidden"
    >
      {/* blueprint dot-grid, faded toward the edges */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        sx={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 85% 65% at 50% 35%, #000 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 65% at 50% 35%, #000 40%, transparent 100%)",
        }}
      />
      {/* procedural material grain */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        sx={{ backgroundImage: GRAIN, opacity: 0.05, mixBlendMode: "overlay" }}
      />
      {/* cursor-following ambient spotlight */}
      <Box
        position="absolute"
        inset={0}
        zIndex={0}
        pointerEvents="none"
        sx={{
          background:
            "radial-gradient(600px circle at var(--spot-x,50%) var(--spot-y,12%), rgba(201,255,77,0.055), transparent 70%)",
        }}
      />

      <Box position="relative" zIndex={1} maxW="1200px" mx="auto">
        <MotionBox
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          maxW="640px"
          mb={{ base: 10, md: 14 }}
        >
          <Flex align="center" gap={3}>
            <Box w="26px" h="1px" bg="whiteAlpha.400" />
            <Text
              fontFamily={MONO}
              fontSize="12px"
              letterSpacing="0.24em"
              textTransform="uppercase"
              color="whiteAlpha.500"
            >
              Experiments
            </Text>
          </Flex>
          <Text
            as="h2"
            mt={4}
            fontFamily="'Pretendard Variable', Pretendard, sans-serif"
            fontWeight={800}
            lineHeight={1.08}
            letterSpacing="-0.02em"
            fontSize={{ base: "1.9rem", md: "2.6rem" }}
            sx={{ wordBreak: "keep-all" }}
          >
            Autonomous-driving experiments, in miniature
          </Text>
          <Text
            mt={4}
            fontSize={{ base: "14px", md: "15.5px" }}
            lineHeight={1.7}
            color="whiteAlpha.650"
            sx={{ wordBreak: "keep-all" }}
          >
            Perception, sensors and planning, taken apart into small interactive
            experiments. Hover to feel them, click a card to open it larger.
          </Text>
        </MotionBox>

        <Grid
          templateColumns={{ base: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" }}
          gap={{ base: 4, md: 5 }}
        >
          {EXPERIMENTS.map((exp, i) => (
            <Card key={exp.id} exp={exp} index={i} reduce={reduce} onOpen={onOpen} />
          ))}
        </Grid>
      </Box>

      {open && <Modal exp={open} onClose={onClose} />}
    </Box>
  );
}

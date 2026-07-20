"use client";

import { useEffect, useState } from "react";
import { Box, Flex } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageProvider";
import HeroScene from "./HeroScene";
import { ExperimentsSection } from "@/components/experiments";

const MONO = "'JetBrains Mono', monospace";
const HEADER = 84; // matches the <main> pt in Chakra.tsx (clears the fixed header)

type View = "topology" | "autonomy" | "3d";
type Seg = { key: View | "log"; label: string; nav?: boolean };

const SEGMENTS: Seg[] = [
  { key: "topology", label: "TOPOLOGY" },
  { key: "autonomy", label: "AUTONOMY" },
  { key: "3d", label: "3D" },
  { key: "log", label: "LOG", nav: true },
];

/**
 * The landing is a single, full-viewport surface with a floating switcher.
 * Each toggle is an exclusive full-screen view — topology (the 3D project brain,
 * default), autonomy (the lidar perception hero), 3D (the experiments lab) — and
 * LOG jumps to the blog. Topology + autonomy lock page scroll so they sit inside
 * one screen; 3D allows internal scroll for its card grid.
 */
export default function LandingSwitcher() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [view, setView] = useState<View>("topology");

  // Topology + autonomy are strictly one-screen: kill page scroll so nothing
  // (footer, padding) can push a scrollbar. 3D keeps scroll for its grid.
  useEffect(() => {
    const lock = view !== "3d";
    const html = document.documentElement;
    html.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [view]);

  const onSeg = (s: Seg) => {
    if (s.key === "log") {
      router.push("/log");
      return;
    }
    setView(s.key as View);
  };

  const viewH = { base: `calc(100svh - ${HEADER}px)`, md: `calc(100vh - ${HEADER}px)` };

  return (
    <>
      {/* ── floating view switcher (fixed, centered under the header) ── */}
      <Flex
        position="fixed"
        top={{ base: "94px", md: "98px" }}
        left="50%"
        transform="translateX(-50%)"
        zIndex={900}
        align="center"
        gap="3px"
        p="4px"
        borderRadius="13px"
        bg="rgba(6,10,18,0.66)"
        border="1px solid rgba(140,180,200,0.14)"
        boxShadow="0 12px 40px rgba(0,0,0,0.5)"
        sx={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {SEGMENTS.map((s) => {
          const on = !s.nav && view === s.key;
          return (
            <Box
              key={s.key}
              as="button"
              type="button"
              onClick={() => onSeg(s)}
              aria-current={on ? "true" : undefined}
              fontFamily={MONO}
              fontSize={{ base: "10px", md: "11px" }}
              letterSpacing="0.12em"
              fontWeight={on ? 700 : 500}
              px={{ base: "10px", md: "14px" }}
              py={{ base: "7px", md: "8px" }}
              borderRadius="9px"
              cursor="pointer"
              whiteSpace="nowrap"
              color={on ? "#04060a" : s.nav ? "rgba(226,236,243,0.55)" : "rgba(226,236,243,0.72)"}
              bg={on ? "#e8f6f1" : "transparent"}
              boxShadow={on ? "0 0 18px rgba(61,240,200,0.35)" : "none"}
              borderLeft={s.nav ? "1px solid rgba(140,180,200,0.16)" : undefined}
              ml={s.nav ? "2px" : undefined}
              transition="color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease"
              _hover={{ color: on ? "#04060a" : s.nav ? "#3df0c8" : "#e2ecf3" }}
              _focusVisible={{ outline: "2px solid", outlineColor: "#3df0c8", outlineOffset: "2px" }}
            >
              {s.label}
              {s.nav && (
                <Box as="span" aria-hidden ml="4px" opacity={0.7} fontSize="0.85em">
                  ↗
                </Box>
              )}
            </Box>
          );
        })}
      </Flex>

      {/* ── TOPOLOGY (default) — kept mounted, display-toggled so it stays instant + stateful ── */}
      <Box
        position="relative"
        w="100vw"
        left="50%"
        right="50%"
        ml="-50vw"
        mr="-50vw"
        h={viewH}
        bg="#05060d"
        display={view === "topology" ? "block" : "none"}
      >
        <iframe
          src={`/pulse/index.html?showcase&embed&lang=${lang}`}
          title="claude-pulse · project topology"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </Box>

      {/* ── AUTONOMY — the lidar perception hero (mounted on demand) ── */}
      {view === "autonomy" && <HeroScene />}

      {/* ── 3D — the experiments lab (breaks out full-bleed on its own; page scrolls here) ── */}
      {view === "3d" && <ExperimentsSection />}
    </>
  );
}

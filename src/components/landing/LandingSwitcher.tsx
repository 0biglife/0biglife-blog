"use client";

import { useEffect, useState } from "react";
import { Box, Flex, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageProvider";
import { ExperimentsSection } from "@/components/experiments";

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const HEADER = 84; // matches the <main> pt in Chakra.tsx (clears the fixed header)
const DARK = "#01030a"; // one near-black shared by header + body + topology canvas

type View = "topology" | "lab";
type Seg = { key: string; label: string; view?: View; href?: string };

// topology + lab are inline views (the bubble slides between them); autonomy + log
// are their own routes (LiDAR / blog) — they navigate away.
const SEGMENTS: Seg[] = [
  { key: "topology", label: "TOPOLOGY", view: "topology" },
  { key: "autonomy", label: "AUTONOMY", href: "/autonomy" },
  { key: "lab", label: "LAB", view: "lab" },
  { key: "log", label: "LOG", href: "/log" },
];

export default function LandingSwitcher() {
  const { lang } = useLanguage();
  const router = useRouter();
  const [view, setView] = useState<View>("topology");

  // Topology is strictly one-screen: kill page scroll. Lab keeps scroll for its grid.
  useEffect(() => {
    const lock = view !== "lab";
    const html = document.documentElement;
    html.style.overflow = lock ? "hidden" : "";
    document.body.style.overflow = lock ? "hidden" : "";
    return () => {
      html.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [view]);

  // Full-dark composition — force the page background near-black so no light body
  // strip shows between the dark header and the topology canvas.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevH = html.style.background;
    const prevB = body.style.background;
    html.style.background = DARK;
    body.style.background = DARK;
    return () => {
      html.style.background = prevH;
      body.style.background = prevB;
    };
  }, []);

  const onSeg = (s: Seg) => {
    if (s.href) {
      router.push(s.href);
      return;
    }
    if (s.view) setView(s.view);
  };

  const viewH = { base: `calc(100svh - ${HEADER}px)`, md: `calc(100vh - ${HEADER}px)` };
  const current = SEGMENTS.find((s) => s.view === view) ?? SEGMENTS[0];

  return (
    <>
      {/* ── desktop: segmented pill with an animated bubble that slides to the pressed tab ── */}
      <Flex
        display={{ base: "none", md: "flex" }}
        position="fixed"
        top="98px"
        left="50%"
        transform="translateX(-50%)"
        zIndex={900}
        align="center"
        gap="2px"
        p="4px"
        borderRadius="13px"
        bg="rgba(6,10,18,0.66)"
        border="1px solid rgba(140,180,200,0.14)"
        boxShadow="0 12px 40px rgba(0,0,0,0.5)"
        sx={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        {SEGMENTS.map((s) => {
          const on = !!s.view && view === s.view;
          const isNav = !!s.href;
          return (
            <Box
              key={s.key}
              as="button"
              type="button"
              onClick={() => onSeg(s)}
              aria-current={on ? "true" : undefined}
              position="relative"
              fontFamily={MONO}
              fontSize="11px"
              letterSpacing="0.12em"
              fontWeight={on ? 700 : 500}
              px="15px"
              py="8px"
              borderRadius="9px"
              cursor="pointer"
              whiteSpace="nowrap"
              color={on ? "#04060a" : isNav ? "rgba(226,236,243,0.55)" : "rgba(226,236,243,0.72)"}
              transition="color 0.2s ease"
              _hover={{ color: on ? "#04060a" : isNav ? "#3df0c8" : "#e2ecf3" }}
              _focusVisible={{ outline: "2px solid", outlineColor: "#3df0c8", outlineOffset: "2px" }}
            >
              {on && (
                <MotionBox
                  layoutId="switcher-bubble"
                  position="absolute"
                  inset={0}
                  borderRadius="9px"
                  bg="#e8f6f1"
                  boxShadow="0 0 18px rgba(61,240,200,0.4)"
                  zIndex={0}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Box as="span" position="relative" zIndex={1} display="inline-flex" alignItems="center">
                {s.label}
                {isNav && (
                  <Box as="span" aria-hidden ml="4px" opacity={0.7} fontSize="0.85em">
                    ↗
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Flex>

      {/* ── mobile: a compact dropdown (segments are too tight to sit in a row) ── */}
      <Box
        display={{ base: "block", md: "none" }}
        position="fixed"
        top="92px"
        left="50%"
        transform="translateX(-50%)"
        zIndex={900}
      >
        <Menu autoSelect={false} placement="bottom">
          <MenuButton
            as="button"
            type="button"
            style={{
              fontFamily: MONO,
              fontSize: "12px",
              letterSpacing: "0.12em",
              fontWeight: 700,
              color: "#e2ecf3",
              padding: "9px 16px",
              borderRadius: "11px",
              background: "rgba(6,10,18,0.82)",
              border: "1px solid rgba(140,180,200,0.16)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {current.label} <Box as="span" aria-hidden ml="6px" opacity={0.7}>▾</Box>
          </MenuButton>
          <MenuList
            minW="180px"
            py="6px"
            bg="rgba(9,13,24,0.96)"
            border="1px solid rgba(140,180,200,0.16)"
            borderRadius="12px"
            boxShadow="0 20px 60px rgba(0,0,0,0.6)"
            sx={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          >
            {SEGMENTS.map((s) => {
              const on = !!s.view && view === s.view;
              return (
                <MenuItem
                  key={s.key}
                  onClick={() => onSeg(s)}
                  bg="transparent"
                  fontFamily={MONO}
                  fontSize="12px"
                  letterSpacing="0.1em"
                  fontWeight={on ? 700 : 500}
                  color={on ? "#3df0c8" : "rgba(226,236,243,0.78)"}
                  _hover={{ bg: "rgba(61,240,200,0.1)", color: "#e2ecf3" }}
                  _focus={{ bg: "rgba(61,240,200,0.1)" }}
                >
                  {s.label}
                  {s.href && " ↗"}
                  {on && (
                    <Box as="span" ml="auto" color="#3df0c8">
                      ●
                    </Box>
                  )}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
      </Box>

      {/* ── TOPOLOGY (default) — kept mounted, display-toggled so it stays instant + stateful ── */}
      <Box
        position="relative"
        w="100vw"
        left="50%"
        right="50%"
        ml="-50vw"
        mr="-50vw"
        h={viewH}
        bg={DARK}
        display={view === "topology" ? "block" : "none"}
      >
        <iframe
          key={lang}
          src={`/pulse/index.html?showcase&embed&lang=${lang}`}
          title="claude-pulse · project topology"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
        />
      </Box>

      {/* ── LAB — the experiments grid (breaks out full-bleed on its own; page scrolls here) ── */}
      {view === "lab" && <ExperimentsSection />}
    </>
  );
}

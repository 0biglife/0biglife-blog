"use client";

import { useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { useLanguage } from "@/i18n/LanguageProvider";

const HEADER = 84; // matches the <main> pt in Chakra.tsx (clears the fixed header)
const DARK = "#01030a"; // one near-black shared by header + body + topology canvas

/**
 * The landing IS the topology: a single, full-viewport, no-scroll embed of the
 * project brain. Navigation (topology / autonomy / lab / log) lives in the global
 * header switcher now, not here.
 */
export default function LandingSwitcher() {
  const { lang } = useLanguage();

  // One-screen, no page scroll, and a near-black page background so no light body
  // strip shows between the dark header and the topology canvas.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOv: html.style.overflow,
      bodyOv: body.style.overflow,
      htmlBg: html.style.background,
      bodyBg: body.style.background,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.background = DARK;
    body.style.background = DARK;
    return () => {
      html.style.overflow = prev.htmlOv;
      body.style.overflow = prev.bodyOv;
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
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
      h={{ base: `calc(100svh - ${HEADER}px)`, md: `calc(100vh - ${HEADER}px)` }}
      bg={DARK}
    >
      <iframe
        key={lang}
        src={`/pulse/index.html?showcase&embed&lang=${lang}`}
        title="claude-pulse · project topology"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
      />
    </Box>
  );
}

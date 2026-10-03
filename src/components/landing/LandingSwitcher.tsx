"use client";

import { useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { useLanguage } from "@/i18n/LanguageProvider";

const HEADER = 84; // matches the <main> pt in Chakra.tsx (clears the fixed header)
const DARK = "#01030a"; // one near-black shared by header + body + topology canvas

/**
 * The topology is the landing hero: a full-viewport embed of the project brain,
 * with the actual page copy (LandingIntro) below it. Navigation (topology /
 * autonomy / lab / log) lives in the global header switcher now, not here.
 *
 * The page used to lock scroll here to stay one screen. That left the visitor
 * with nothing but a graph and a column of blurred private cards, and left the
 * document with no crawlable body at all — so the lock is gone and the hero
 * simply occupies the first screen.
 */
export default function LandingSwitcher() {
  const { lang } = useLanguage();

  // Near-black page background so no light body strip shows between the dark
  // header and the topology canvas.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = { htmlBg: html.style.background, bodyBg: body.style.background };
    html.style.background = DARK;
    body.style.background = DARK;
    return () => {
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

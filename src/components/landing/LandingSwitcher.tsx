"use client";

import { useEffect } from "react";
import { Box } from "@chakra-ui/react";
import { useLanguage } from "@/i18n/LanguageProvider";

const HEADER = 84; // matches the <main> pt in Chakra.tsx (clears the fixed header)
const DARK = "#01030a"; // one near-black shared by header + body + topology canvas

/** The topology is a full-screen project map. Blog content belongs to LOG. */
export default function LandingSwitcher() {
  const { lang } = useLanguage();

  // Near-black page background so no light body strip shows between the dark
  // header and the topology canvas.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.background, bodyBg: body.style.background,
      htmlOverflow: html.style.overflow, bodyOverflow: body.style.overflow,
    };
    html.style.background = DARK;
    body.style.background = DARK;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
    };
  }, []);

  return (
    <Box
      position="fixed"
      top={`${HEADER}px`}
      w="100vw"
      left={0}
      right={0}
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

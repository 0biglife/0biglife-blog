"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import NextLink from "next/link";
import {
  Box,
  Heading,
  HStack,
  LinkBox,
  LinkOverlay,
  Tag,
  useColorModeValue,
} from "@chakra-ui/react";
import { useLiveSlot } from "./LiveDemoProvider";
import type { WorkMeta } from "@/lib/types";

type WorkCardProps = {
  work: WorkMeta;
};

/** How many tags to render before collapsing the rest into a "+N" pill. */
const MAX_VISIBLE_TAGS = 3;

/**
 * WorkCard — a single gallery card.
 *
 * The card always shows a cover image inside an aspect-ratio box (zero layout
 * shift). When the card nears the viewport AND `work.autoplay` is true, it
 * asks the LiveDemoProvider for a slot; if granted it mounts a scaled-down,
 * non-interactive live `<iframe>` preview on top of the cover and fades it in.
 *
 * The whole card is a link to `/works/<slug>`. The preview iframe sets
 * `pointerEvents: "none"` so clicks fall through to the card's LinkOverlay.
 */
export default function WorkCard({ work }: WorkCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // True once the card is at (or near) the viewport. Pre-arms slightly early
  // via the IntersectionObserver rootMargin so the demo is ready in time.
  const [nearViewport, setNearViewport] = useState<boolean>(false);
  // True once the live iframe has finished loading — used to fade it in.
  const [iframeLoaded, setIframeLoaded] = useState<boolean>(false);

  // Only ever request a slot when autoplay is enabled for this work.
  const granted = useLiveSlot(work.slug, nearViewport && work.autoplay);

  // IntersectionObserver: detect when the card is near the viewport.
  useEffect(() => {
    const el = containerRef.current;
    if (el === null) {
      return;
    }
    // Guard for environments without IntersectionObserver.
    if (typeof IntersectionObserver !== "function") {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          setNearViewport(entry.isIntersecting);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  // When the slot is lost, reset the loaded flag so a future remount fades in
  // again instead of flashing instantly.
  useEffect(() => {
    if (!granted) {
      setIframeLoaded(false);
    }
  }, [granted]);

  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  const cardBg = useColorModeValue("white", "gray.800");
  const previewBg = useColorModeValue("gray.50", "gray.900");
  const restShadow = useColorModeValue("sm", "dark-lg");
  const hoverShadow = useColorModeValue("lg", "dark-lg");
  const tagBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const titleColor = useColorModeValue("gray.800", "gray.100");
  const focusRing = useColorModeValue("blue.500", "blue.300");

  const visibleTags = work.tags.slice(0, MAX_VISIBLE_TAGS);
  const overflowCount = work.tags.length - visibleTags.length;

  return (
    <LinkBox
      as="article"
      ref={containerRef}
      bg={cardBg}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="xl"
      overflow="hidden"
      boxShadow={restShadow}
      transition="transform 0.2s ease-out, box-shadow 0.2s ease-out"
      _hover={{ transform: "translateY(-4px)", boxShadow: hoverShadow }}
      _focusWithin={{
        outline: "2px solid",
        outlineColor: focusRing,
        outlineOffset: "2px",
      }}
    >
      {/* Preview area — aspectRatio reserves space immediately (no CLS). */}
      <Box
        position="relative"
        width="100%"
        aspectRatio={work.aspectRatio}
        bg={previewBg}
        overflow="hidden"
      >
        {/* Cover image — shown instantly, beneath any live preview. */}
        <Image
          src={work.cover}
          alt={work.title}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          style={{ objectFit: "cover" }}
        />

        {/* Live preview iframe — only mounted when a slot is granted. */}
        {granted && (
          <iframe
            src={`/works/${work.slug}/demo/index.html`}
            title={`${work.title} 미리보기`}
            loading="lazy"
            sandbox="allow-scripts allow-pointer-lock"
            tabIndex={-1}
            aria-hidden="true"
            onLoad={() => setIframeLoaded(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
              display: "block",
              pointerEvents: "none",
              opacity: iframeLoaded ? 1 : 0,
              transition: "opacity 0.3s ease-in-out",
            }}
          />
        )}
      </Box>

      {/* Meta — title (the link) + tags. */}
      <Box p={4}>
        <LinkOverlay as={NextLink} href={`/works/${work.slug}`}>
          <Heading as="h3" size="sm" color={titleColor} noOfLines={2}>
            {work.title}
          </Heading>
        </LinkOverlay>

        {work.tags.length > 0 && (
          <HStack spacing={2} mt={3} flexWrap="wrap">
            {visibleTags.map((tag) => (
              <Tag key={tag} size="sm" bg={tagBg} borderRadius="full">
                {tag}
              </Tag>
            ))}
            {overflowCount > 0 && (
              <Tag size="sm" bg={tagBg} borderRadius="full">
                {`+${overflowCount}`}
              </Tag>
            )}
          </HStack>
        )}
      </Box>
    </LinkBox>
  );
}

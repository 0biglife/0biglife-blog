"use client";

import { useMemo, useState } from "react";
import {
  Box,
  Container,
  Heading,
  SimpleGrid,
  Text,
  VisuallyHidden,
  Wrap,
  WrapItem,
  useColorModeValue,
} from "@chakra-ui/react";
import { LiveDemoProvider } from "./LiveDemoProvider";
import WorkCard from "./WorkCard";
import type { WorkMeta } from "@/lib/types";
import { useLanguage } from "@/i18n/LanguageProvider";

type WorkGalleryProps = {
  works: WorkMeta[];
};

/** Sentinel value for the "전체" (All) filter chip. */
const ALL_TAG = "전체";

/**
 * WorkGallery — the gallery home page (`/`).
 *
 * Renders a page header, a single-select tag filter (chips that `Wrap` so they
 * never cause horizontal scroll), and a responsive grid of `WorkCard`s. The
 * whole grid lives inside ONE `<LiveDemoProvider>` so the live-demo concurrency
 * cap applies across every card.
 */
export default function WorkGallery({ works }: WorkGalleryProps) {
  const { t } = useLanguage();
  const [selectedTag, setSelectedTag] = useState<string>(ALL_TAG);

  // All unique tags across every work, in first-seen order.
  const tags = useMemo<string[]>(() => {
    const seen = new Set<string>();
    for (const work of works) {
      for (const tag of work.tags) {
        seen.add(tag);
      }
    }
    return [...seen];
  }, [works]);

  // Effective selected tag — falls back to the ALL sentinel if the stored
  // value is no longer a valid tag (defensive against stale state).
  const effectiveTag = useMemo<string>(() => {
    if (selectedTag === ALL_TAG || tags.includes(selectedTag)) {
      return selectedTag;
    }
    return ALL_TAG;
  }, [selectedTag, tags]);

  // Works matching the active filter.
  const filteredWorks = useMemo<WorkMeta[]>(() => {
    if (effectiveTag === ALL_TAG) {
      return works;
    }
    return works.filter((work) => work.tags.includes(effectiveTag));
  }, [works, effectiveTag]);

  const titleColor = useColorModeValue("gray.800", "gray.100");
  const subtitleColor = useColorModeValue("gray.500", "gray.400");
  const emptyColor = useColorModeValue("gray.500", "gray.400");

  // Chip colours.
  const chipBg = useColorModeValue("gray.100", "whiteAlpha.200");
  const chipColor = useColorModeValue("gray.700", "gray.200");
  const chipHoverBg = useColorModeValue("gray.200", "whiteAlpha.300");
  const activeChipBg = useColorModeValue("gray.800", "gray.100");
  const activeChipColor = useColorModeValue("white", "gray.900");
  const focusRing = useColorModeValue("blue.500", "blue.300");

  const chips = [ALL_TAG, ...tags];
  const hasWorks = works.length > 0;
  const hasResults = filteredWorks.length > 0;

  return (
    <Container maxWidth="1200px" px={{ base: 4, md: 6 }} py={{ base: 6, md: 10 }}>
      {/* Page header — title + one-line subtitle. */}
      <Box mb={{ base: 6, md: 8 }}>
        <Heading as="h1" size="xl" color={titleColor}>
          Works
        </Heading>
        <Text mt={2} fontSize={{ base: "sm", md: "md" }} color={subtitleColor}>
          {t("works.subtitle")}
        </Text>
      </Box>

      {/* Tag filter — single-select chips, wraps on narrow screens. */}
      {hasWorks && (
        <Wrap
          spacing={2}
          mb={{ base: 6, md: 8 }}
          role="group"
          aria-label="태그 필터"
        >
          {chips.map((tag) => {
            const isActive = tag === effectiveTag;
            return (
              <WrapItem key={tag}>
                <Box
                  as="button"
                  type="button"
                  onClick={() => setSelectedTag(tag)}
                  aria-pressed={isActive}
                  cursor="pointer"
                  px={4}
                  minH="36px"
                  display="inline-flex"
                  alignItems="center"
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="medium"
                  bg={isActive ? activeChipBg : chipBg}
                  color={isActive ? activeChipColor : chipColor}
                  transition="background-color 0.15s ease-out"
                  _hover={{ bg: isActive ? activeChipBg : chipHoverBg }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: focusRing,
                    outlineOffset: "2px",
                  }}
                >
                  {tag === ALL_TAG ? t("works.tagAll") : tag}
                </Box>
              </WrapItem>
            );
          })}
        </Wrap>
      )}

      {/* Announce filter results to assistive tech. */}
      <VisuallyHidden aria-live="polite">
        {hasResults
          ? `${filteredWorks.length}${t("works.countSuffix")}`
          : t("works.noResults")}
      </VisuallyHidden>

      {/* Grid / empty states. */}
      {!hasWorks ? (
        <Box py={20} textAlign="center">
          <Text fontSize="md" color={emptyColor}>
            {t("works.empty")}
          </Text>
        </Box>
      ) : !hasResults ? (
        <Box py={20} textAlign="center">
          <Text fontSize="md" color={emptyColor}>
            {t("works.emptyTag")}
          </Text>
        </Box>
      ) : (
        <LiveDemoProvider maxConcurrent={6}>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={{ base: 4, md: 6 }}>
            {filteredWorks.map((work) => (
              <WorkCard key={work.slug} work={work} />
            ))}
          </SimpleGrid>
        </LiveDemoProvider>
      )}
    </Container>
  );
}

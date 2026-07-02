"use client";

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useLanguage } from "@/i18n/LanguageProvider";
import ExperimentCanvas from "./ExperimentCanvas";
import { EXPERIMENTS, type Experiment } from "./data";

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";
const BG = "#04060a";

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

function Card({ exp, onOpen }: { exp: Experiment; onOpen: (e: Experiment) => void }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
    >
      <Box
        as="button"
        type="button"
        onClick={() => onOpen(exp)}
        textAlign="left"
        display="block"
        w="100%"
        borderRadius="8px"
        overflow="hidden"
        border="1px solid"
        borderColor="whiteAlpha.150"
        bg="rgba(255,255,255,0.015)"
        transition="border-color 0.2s ease, transform 0.2s ease, background 0.2s ease"
        _hover={{
          borderColor: exp.accent,
          transform: "translateY(-3px)",
          bg: "rgba(255,255,255,0.03)",
        }}
        _focusVisible={{ outline: "2px solid", outlineColor: exp.accent, outlineOffset: "2px" }}
      >
        <Box position="relative" bg="rgba(4,7,12,0.6)" borderBottom="1px solid" borderColor="whiteAlpha.100">
          <ExperimentCanvas variant={exp.variant} height={168} />
          <Box
            position="absolute"
            inset={0}
            pointerEvents="none"
            bgGradient="linear(to-b, transparent 60%, rgba(4,6,10,0.5))"
          />
        </Box>
        <Box p={5}>
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
        </Box>
      </Box>
    </MotionBox>
  );
}

function Modal({ exp, onClose }: { exp: Experiment; onClose: () => void }) {
  const { t } = useLanguage();
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
          <Box
            as="button"
            type="button"
            onClick={onClose}
            aria-label={t("experiments.close")}
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
  const { t } = useLanguage();
  const [open, setOpen] = useState<Experiment | null>(null);
  const onOpen = useCallback((e: Experiment) => setOpen(e), []);
  const onClose = useCallback(() => setOpen(null), []);

  return (
    <Box
      id="experiments"
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
    >
      <Box maxW="1200px" mx="auto">
        <MotionBox
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          maxW="640px"
          mb={{ base: 10, md: 14 }}
        >
          <Text
            fontFamily={MONO}
            fontSize="12px"
            letterSpacing="0.24em"
            textTransform="uppercase"
            color="whiteAlpha.500"
          >
            {t("experiments.eyebrow")}
          </Text>
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
            {t("experiments.title")}
          </Text>
          <Text mt={4} fontSize={{ base: "14px", md: "15.5px" }} lineHeight={1.7} color="whiteAlpha.650" sx={{ wordBreak: "keep-all" }}>
            {t("experiments.subtitle")}
          </Text>
        </MotionBox>

        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" }} gap={{ base: 4, md: 5 }}>
          {EXPERIMENTS.map((exp) => (
            <Card key={exp.id} exp={exp} onOpen={onOpen} />
          ))}
        </Grid>
      </Box>

      {open && <Modal exp={open} onClose={onClose} />}
    </Box>
  );
}

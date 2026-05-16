"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Box, HStack, IconButton, Skeleton, Text, useColorModeValue } from "@chakra-ui/react";
import { FiMaximize, FiMinimize, FiRefreshCw } from "react-icons/fi";
import { useLanguage } from "@/i18n/LanguageProvider";

type DemoFrameProps = {
  src: string; // e.g. /works/<slug>/demo/index.html
  aspectRatio: string; // e.g. "16/9"
  title: string; // for iframe title (a11y)
};

export default function DemoFrame({ src, aspectRatio, title }: DemoFrameProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [loadFailed, setLoadFailed] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fullscreenSupported, setFullscreenSupported] = useState<boolean>(false);

  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  const bgColor = useColorModeValue("gray.50", "gray.800");
  const shadow = useColorModeValue("md", "dark-lg");
  const fallbackTextColor = useColorModeValue("gray.500", "gray.400");

  // Fix 1: clear the loading skeleton even if the iframe never fires onLoad
  // (e.g. the src 404s). When the timeout fires without a successful load,
  // surface a fallback message instead of a blank frame. Reset on refresh.
  useEffect(() => {
    if (isLoaded) return;
    const t = setTimeout(() => {
      setIsLoaded(true);
      setLoadFailed(true);
    }, 10000);
    return () => clearTimeout(t);
  }, [isLoaded, reloadKey]);

  // Fix 3: feature-detect fullscreen support once on mount.
  useEffect(() => {
    setFullscreenSupported(
      typeof containerRef.current?.requestFullscreen === "function" && document.fullscreenEnabled,
    );
  }, []);

  // Fix 2: keep isFullscreen in sync, including exits via Esc.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoaded(false);
    setLoadFailed(false);
    setReloadKey((prev) => prev + 1);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }

    if (typeof container.requestFullscreen === "function") {
      void container.requestFullscreen();
    }
  }, []);

  return (
    <Box
      ref={containerRef}
      role="group"
      aria-label={`${title} controls`}
      position="relative"
      width="100%"
      aspectRatio={aspectRatio}
      bg={bgColor}
      borderWidth="1px"
      borderColor={borderColor}
      borderRadius="lg"
      overflow="hidden"
      boxShadow={shadow}
    >
      <iframe
        key={reloadKey}
        src={src}
        title={title}
        loading="lazy"
        onLoad={() => {
          setIsLoaded(true);
          setLoadFailed(false);
        }}
        sandbox="allow-scripts allow-pointer-lock allow-pop-ups-to-escape-sandbox"
        style={{ width: "100%", height: "100%", border: 0, display: "block" }}
      />

      {!isLoaded && (
        <Skeleton
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          startColor={bgColor}
          endColor={borderColor}
        />
      )}

      {loadFailed && (
        <Box
          position="absolute"
          top={0}
          left={0}
          width="100%"
          height="100%"
          display="flex"
          alignItems="center"
          justifyContent="center"
          px={6}
          bg={bgColor}
        >
          <Text fontSize="sm" color={fallbackTextColor} textAlign="center">
            {t("demo.loadFailed")}
          </Text>
        </Box>
      )}

      <HStack
        position="absolute"
        top={2}
        right={2}
        spacing={2}
        opacity={0.6}
        transition="opacity 0.2s ease-in-out"
        _groupHover={{ opacity: 1 }}
        _focusWithin={{ opacity: 1 }}
        sx={{ "@media (hover: none)": { opacity: 1 } }}
      >
        <IconButton
          aria-label="Restart demo"
          icon={<FiRefreshCw size={18} />}
          onClick={handleRefresh}
          boxSize="44px"
          minW="44px"
          color="white"
          bg="blackAlpha.700"
          _hover={{ bg: "blackAlpha.800" }}
          _active={{ bg: "blackAlpha.900" }}
          borderRadius="md"
        />
        {fullscreenSupported && (
          <IconButton
            aria-label={isFullscreen ? "Exit fullscreen" : "View demo in fullscreen"}
            icon={isFullscreen ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
            onClick={handleFullscreen}
            boxSize="44px"
            minW="44px"
            color="white"
            bg="blackAlpha.700"
            _hover={{ bg: "blackAlpha.800" }}
            _active={{ bg: "blackAlpha.900" }}
            borderRadius="md"
          />
        )}
      </HStack>
    </Box>
  );
}

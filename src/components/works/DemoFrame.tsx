"use client";

import { useCallback, useRef, useState } from "react";
import { Box, HStack, IconButton, Skeleton, useColorModeValue } from "@chakra-ui/react";
import { FiMaximize, FiRefreshCw } from "react-icons/fi";

type DemoFrameProps = {
  src: string; // e.g. /works/<slug>/demo/index.html
  aspectRatio: string; // e.g. "16/9"
  title: string; // for iframe title (a11y)
};

export default function DemoFrame({ src, aspectRatio, title }: DemoFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const borderColor = useColorModeValue("gray.200", "whiteAlpha.300");
  const bgColor = useColorModeValue("gray.50", "gray.800");
  const shadow = useColorModeValue("md", "dark-lg");

  const handleRefresh = useCallback(() => {
    setIsLoaded(false);
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
        onLoad={() => setIsLoaded(true)}
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

      <HStack
        position="absolute"
        top={2}
        right={2}
        spacing={2}
        opacity={0.6}
        transition="opacity 0.2s ease-in-out"
        _groupHover={{ opacity: 1 }}
        _focusWithin={{ opacity: 1 }}
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
        <IconButton
          aria-label="View demo in fullscreen"
          icon={<FiMaximize size={18} />}
          onClick={handleFullscreen}
          boxSize="44px"
          minW="44px"
          color="white"
          bg="blackAlpha.700"
          _hover={{ bg: "blackAlpha.800" }}
          _active={{ bg: "blackAlpha.900" }}
          borderRadius="md"
        />
      </HStack>
    </Box>
  );
}

"use client";

import { Box, Flex } from "@chakra-ui/react";

/**
 * A dark, branded full-screen loader shown while a heavy 3D scene (lidar hero,
 * GLB lab, topology iframe) initializes — so a toggle/route change never leaves a
 * blank or frozen body while WebGL warms up. Sits behind the fixed header (z<1000).
 */
export default function SceneLoading({ label = "loading" }: { label?: string }) {
  return (
    <Flex
      position="fixed"
      inset={0}
      zIndex={5}
      align="center"
      justify="center"
      bg="#01030a"
      sx={{ "@keyframes scene-spin": { to: { transform: "rotate(360deg)" } } }}
    >
      <Flex direction="column" align="center" gap={4}>
        <Box
          w="34px"
          h="34px"
          borderRadius="full"
          border="2px solid"
          borderColor="rgba(61,240,200,0.16)"
          borderTopColor="#3df0c8"
          sx={{ animation: "scene-spin 0.9s linear infinite" }}
        />
        <Box
          fontFamily="'JetBrains Mono', monospace"
          fontSize="11px"
          letterSpacing="0.22em"
          textTransform="uppercase"
          color="rgba(226,236,243,0.5)"
        >
          {label}
        </Box>
      </Flex>
    </Flex>
  );
}

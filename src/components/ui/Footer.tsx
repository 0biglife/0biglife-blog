"use client";
import { Box, Text } from "@chakra-ui/react";

export default function Footer() {
  return (
    <Box
      as="footer"
      w="full"
      py={4}
      px={6}
      pb="40px"
      mt="auto"
      textAlign="center"
      _dark={{ bg: "gray.800", color: "gray.400" }}
    >
      <Text fontSize="sm">© 2025. 0biglife all rights reserved.</Text>
    </Box>
  );
}

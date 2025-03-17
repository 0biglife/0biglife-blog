"use client";

import { Box, Text, HStack, Link, Icon, Tooltip } from "@chakra-ui/react";
import { FaLinkedin, FaGoogle } from "react-icons/fa";
import { SiTistory } from "react-icons/si";

export default function Footer() {
  return (
    <Box
      as="footer"
      w="full"
      py={4}
      px={6}
      pb="40px"
      mt={10}
      textAlign="center"
      _dark={{ bg: "gray.800", color: "gray.400" }}
    >
      <HStack spacing={5} justify="center" mb={10}>
        <Tooltip
          label="LinkedIn"
          hasArrow
          borderRadius={4}
          arrowSize={8}
          fontSize={12}
        >
          <Link
            href="https://www.linkedin.com/in/0biglife/"
            isExternal
            _hover={{ color: "blue.500" }}
          >
            <Icon as={FaLinkedin} boxSize={5} />
          </Link>
        </Tooltip>

        <Tooltip
          label="Gmail"
          hasArrow
          borderRadius={4}
          arrowSize={8}
          fontSize={12}
        >
          <Link
            href="mailto:your-email@example.com?subject=Hello&body=..."
            _hover={{ color: "red.500" }}
          >
            <Icon as={FaGoogle} boxSize={5} />
          </Link>
        </Tooltip>

        <Tooltip
          label="Tistory"
          hasArrow
          borderRadius={4}
          arrowSize={8}
          fontSize={12}
        >
          <Link
            href="https://0biglife.tistory.com/"
            isExternal
            _hover={{ color: "green.500" }}
          >
            <Icon as={SiTistory} boxSize={5} />
          </Link>
        </Tooltip>
      </HStack>

      <Text fontSize="12px">© 2025. 0biglife all rights reserved.</Text>
    </Box>
  );
}

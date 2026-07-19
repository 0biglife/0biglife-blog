"use client";

import { Box, Text, HStack, Link, Icon, Tooltip } from "@chakra-ui/react";
import { FiLinkedin, FiMail, FiGithub } from "react-icons/fi";
import { SiTistory } from "react-icons/si";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/i18n/LanguageProvider";
import { BLOG_EMAIL } from "@/lib/constant";

export default function Footer() {
  const { t } = useLanguage();
  const pathname = usePathname();
  // The home page is a full-bleed dark composition (dark hero + dark
  // experiments). Match the footer to it so the page doesn't end on a jarring
  // black→white seam; every other route keeps the themed footer.
  const isHome = pathname === "/";

  return (
    <Box
      as="footer"
      w="full"
      py={4}
      px={6}
      pb="40px"
      mt={isHome ? 0 : 10}
      textAlign="center"
      bg={isHome ? "#01030a" : undefined}
      color={isHome ? "whiteAlpha.600" : undefined}
      borderTop={isHome ? "1px solid" : undefined}
      borderColor={isHome ? "whiteAlpha.100" : undefined}
      sx={isHome ? { "& a": { color: "whiteAlpha.700" } } : undefined}
      _dark={{ bg: isHome ? "#01030a" : "gray.800", color: isHome ? "whiteAlpha.600" : "gray.400" }}
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
            aria-label="linkedin"
            href="https://www.linkedin.com/in/0biglife/"
            isExternal
            _hover={{ color: "blue.500" }}
          >
            <Icon as={FiLinkedin} boxSize={5} />
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
            aria-label="gmail"
            href={`mailto:${BLOG_EMAIL}`}
            _hover={{ color: "red.500" }}
          >
            <Icon as={FiMail} boxSize={5} />
          </Link>
        </Tooltip>

        <Tooltip
          label="Github"
          hasArrow
          borderRadius={4}
          arrowSize={8}
          fontSize={12}
        >
          <Link
            aria-label="github"
            href="https://github.com/0biglife"
            _hover={{ color: "purple.500" }}
          >
            <Icon as={FiGithub} boxSize={5} />
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
            aria-label="tistory"
            href="https://0biglife.tistory.com/"
            isExternal
            _hover={{ color: "green.500" }}
          >
            <Icon as={SiTistory} boxSize={5} />
          </Link>
        </Tooltip>
      </HStack>

      <Text fontSize="12px">
        © {new Date().getFullYear()} {t("footer.rights")}
      </Text>
    </Box>
  );
}

"use client";
import { useEffect, useState } from "react";
import {
  Box,
  Flex,
  IconButton,
  Link,
  Tooltip,
  useColorModeValue,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { ThemeToggle } from "@/components";
import { SiLighthouse } from "react-icons/si";

const BLOG_URL = "https://0biglife.com";
const LIGHER_HOUSE_URL = "https://lighterhouse.0biglife.com";
const LIGHER_HOUSE_NAME = "Lighthouse Service";

const NAV_LINKS = [
  { label: "Works", href: "/" },
  { label: "Log", href: "/log" },
  { label: "소개", href: "/introduction" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const iconColor = useColorModeValue("gray.800", "white");

  return (
    <Box
      as="header"
      position="fixed"
      top={0}
      left={0}
      right={0}
      w="full"
      py={3}
      px={6}
      zIndex={1000}
      bg="white"
      _dark={{ bg: "gray.800" }}
      _after={{
        content: '""',
        position: "absolute",
        left: 0,
        bottom: 0,
        width: "100%",
        height: scrolled ? "2px" : "0px",
        background: scrolled
          ? "linear-gradient(to bottom, rgba(0, 0, 0, 0.05), transparent)"
          : "transparent",
        transition: "height 0.3s ease-in-out, background 0.3s ease-in-out",
      }}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Link
          as={NextLink}
          href={BLOG_URL}
          fontWeight="bold"
          fontStyle="italic"
          fontSize="22px"
          _hover={{ textDecoration: "none", opacity: 0.5 }}
        >
          0biglife.
        </Link>

        <Flex justify="flex-end" alignItems="center" gap={{ base: "2px", sm: "8px" }}>
          <Flex
            as="nav"
            alignItems="center"
            gap={{ base: "10px", sm: "18px" }}
            mr={{ base: "2px", sm: "8px" }}
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                as={NextLink}
                href={link.href}
                fontSize={{ base: "13px", sm: "15px" }}
                fontWeight="medium"
                color={iconColor}
                _hover={{ textDecoration: "none", opacity: 0.5 }}
              >
                {link.label}
              </Link>
            ))}
          </Flex>
          <Tooltip
            label={LIGHER_HOUSE_NAME}
            hasArrow
            mt={1}
            borderRadius={4}
            arrowSize={8}
            fontSize={12}
          >
            <IconButton
              as="a"
              href={LIGHER_HOUSE_URL}
              target="_blank"
              borderRadius={20}
              rel="noopener noreferrer"
              aria-label="Beacon Service"
              icon={<SiLighthouse size={20} />}
              variant="ghost"
              color={iconColor}
              // _hover={{ transform: "scale(1.1)", color: "teal.400" }}
              _active={{ transform: "scale(0.95)" }}
              cursor="pointer"
            />
          </Tooltip>
          <ThemeToggle />
        </Flex>
      </Flex>
    </Box>
  );
}

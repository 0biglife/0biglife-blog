"use client";
import { useEffect, useState } from "react";
import { Box, Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { ThemeToggle } from "@/components";

const BLOG_URL = "https://0biglife.com";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

        <ThemeToggle />
      </Flex>
    </Box>
  );
}

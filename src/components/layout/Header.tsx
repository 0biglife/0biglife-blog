"use client";
import { useEffect, useState } from "react";
import { Box, Flex, Link, useColorMode } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle, LanguageSwitcher } from "@/components";
import ProfilePopover from "./ProfilePopover";
import HeaderSwitcher from "./HeaderSwitcher";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { colorMode } = useColorMode();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Topology (/) · autonomy · lab are dark, full-screen 3D scenes: force a dark
  // header and NO theme toggle (they only exist in dark). The blog/LOG section
  // (/log, /posts, /dev-logs) is the only place theming applies, so the theme
  // toggle slides in only there.
  const isScene =
    pathname === "/" ||
    pathname.startsWith("/topology") ||
    pathname.startsWith("/autonomy") ||
    pathname.startsWith("/lab");
  const isLog =
    pathname.startsWith("/log") ||
    pathname.startsWith("/posts") ||
    pathname.startsWith("/dev-logs");
  // Header is dark on any scene route, or when the (blog) site is in dark mode.
  const darkHeader = isScene || colorMode === "dark";

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
      bg={isScene ? "#01030a" : "white"}
      _dark={{ bg: isScene ? "#01030a" : "gray.800" }}
      transition="background-color 0.3s ease"
      sx={
        isScene
          ? { "& a, & button": { color: "white" }, "& button svg": { color: "white" } }
          : undefined
      }
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
      <Flex justifyContent={{ base: "flex-end", sm: "space-between" }} alignItems="center">
        <Link
          as={NextLink}
          href="/"
          display={{ base: "none", sm: "block" }}
          fontWeight="bold"
          fontStyle="italic"
          fontSize="22px"
          _hover={{ textDecoration: "none", opacity: 0.5 }}
        >
          0biglife.
        </Link>

        <Flex justify="flex-end" alignItems="center" gap={{ base: "2px", sm: "8px" }}>
          <HeaderSwitcher dark={darkHeader} />
          <ProfilePopover />
          <LanguageSwitcher />
          {/* theme toggle only in the blog/LOG section — scene routes are dark-only.
              It slides in/out as you cross into or out of LOG. */}
          <AnimatePresence initial={false}>
            {isLog && (
              <motion.div
                key="theme-toggle"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "auto", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                style={{ overflow: "hidden", display: "flex", alignItems: "center" }}
              >
                <ThemeToggle />
              </motion.div>
            )}
          </AnimatePresence>
        </Flex>
      </Flex>
    </Box>
  );
}

"use client";
import { useEffect, useState } from "react";
import { Box, Flex, Link } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle, LanguageSwitcher } from "@/components";
import ProfilePopover from "./ProfilePopover";
import HeaderSwitcher from "./HeaderSwitcher";

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // The home (topology) and /autonomy routes are dark, full-bleed scenes. Match the
  // header to them (same near-black, white controls) so the top reads as one
  // composition instead of a light slab butting against black. Other routes keep
  // the light/theme header.
  const isHome = pathname === "/" || pathname.startsWith("/autonomy");

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
      bg={isHome ? "#01030a" : "white"}
      _dark={{ bg: isHome ? "#01030a" : "gray.800" }}
      transition="background-color 0.3s ease"
      sx={
        isHome
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
      <Flex justifyContent="space-between" alignItems="center">
        <Link
          as={NextLink}
          href="/"
          fontWeight="bold"
          fontStyle="italic"
          fontSize="22px"
          _hover={{ textDecoration: "none", opacity: 0.5 }}
        >
          0biglife.
        </Link>

        <Flex justify="flex-end" alignItems="center" gap={{ base: "2px", sm: "8px" }}>
          <HeaderSwitcher dark={isHome} />
          <ProfilePopover />
          <LanguageSwitcher />
          <ThemeToggle />
        </Flex>
      </Flex>
    </Box>
  );
}

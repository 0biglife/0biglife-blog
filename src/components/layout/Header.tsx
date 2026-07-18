"use client";
import { useEffect, useState } from "react";
import { Box, Flex, Link, useColorModeValue } from "@chakra-ui/react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle, LanguageSwitcher } from "@/components";
import ProfilePopover from "./ProfilePopover";
import { useLanguage } from "@/i18n/LanguageProvider";
import type { TranslationKey } from "@/i18n/dictionary";

const NAV_LINKS: { key: TranslationKey; href: string }[] = [
  { key: "nav.log", href: "/log" },
  { key: "nav.lab", href: "/lab" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/log") return pathname.startsWith("/log");
    if (href === "/lab") return pathname.startsWith("/lab");
    return pathname === href;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const iconColor = useColorModeValue("gray.800", "white");

  // The home page is a dark, full-bleed hero. Match the header to it (same near-
  // black, white controls) so the top reads as one composition instead of a white
  // slab butting against black. Every other route keeps the light/theme header.
  const isHome = pathname === "/";
  const fg = isHome ? "white" : iconColor;

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
          <Flex
            as="nav"
            alignItems="center"
            gap={{ base: "10px", sm: "18px" }}
            mr={{ base: "2px", sm: "8px" }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(link.href);
              return (
                <Link
                  key={link.href}
                  as={NextLink}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  fontSize={{ base: "13px", sm: "15px" }}
                  fontWeight={isActive ? "bold" : "medium"}
                  color={fg}
                  opacity={isActive ? 1 : 0.6}
                  _hover={{ textDecoration: "none", opacity: isActive ? 1 : 0.5 }}
                  _focusVisible={{
                    outline: "2px solid",
                    outlineColor: "teal.400",
                    outlineOffset: "2px",
                    borderRadius: "2px",
                  }}
                >
                  {t(link.key)}
                </Link>
              );
            })}
          </Flex>
          <ProfilePopover />
          <LanguageSwitcher />
          <ThemeToggle />
        </Flex>
      </Flex>
    </Box>
  );
}

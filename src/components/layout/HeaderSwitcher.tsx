"use client";

import { Box, Flex, Menu, MenuButton, MenuList, MenuItem } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useRouter, usePathname } from "next/navigation";

const MotionBox = motion(Box);
const MONO = "'JetBrains Mono', monospace";

type Item = { key: string; label: string; href: string };

const ITEMS: Item[] = [
  { key: "topology", label: "TOPOLOGY", href: "/" },
  { key: "autonomy", label: "AUTONOMY", href: "/autonomy" },
  { key: "lab", label: "LAB", href: "/lab" },
  { key: "log", label: "LOG", href: "/log" },
];

function activeKey(pathname: string): string | null {
  if (pathname === "/" || pathname.startsWith("/topology")) return "topology";
  if (pathname.startsWith("/autonomy")) return "autonomy";
  if (pathname.startsWith("/lab")) return "lab";
  if (pathname.startsWith("/log")) return "log";
  return null;
}

/**
 * The site's primary nav, rendered as a segmented pill with an animated bubble
 * that slides to the active route. Lives in the global header (left of the profile
 * avatar) and adapts to the dark (/, /autonomy) vs light (/lab, /log) header.
 */
export default function HeaderSwitcher({ dark }: { dark: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const active = activeKey(pathname);
  const current = ITEMS.find((i) => i.key === active) ?? ITEMS[0];

  // theme-adaptive palette
  const c = dark
    ? {
        wrap: "rgba(6,10,18,0.6)",
        border: "rgba(140,180,200,0.16)",
        bubble: "#e8f6f1",
        onText: "#04060a",
        offText: "rgba(226,236,243,0.72)",
        hover: "#eef6f4",
        menuBg: "rgba(9,13,24,0.96)",
        menuBorder: "rgba(140,180,200,0.16)",
        accent: "#3df0c8",
      }
    : {
        wrap: "rgba(15,23,32,0.05)",
        border: "rgba(15,23,32,0.1)",
        bubble: "#16202e",
        onText: "#ffffff",
        offText: "rgba(30,41,59,0.72)",
        hover: "#0b1220",
        menuBg: "#ffffff",
        menuBorder: "rgba(15,23,32,0.12)",
        accent: "#0d9488",
      };

  const go = (href: string) => router.push(href);

  return (
    <>
      {/* desktop: segmented pill with sliding bubble */}
      <Flex
        display={{ base: "none", md: "flex" }}
        align="center"
        gap="2px"
        p="3px"
        borderRadius="10px"
        bg={c.wrap}
        border="1px solid"
        borderColor={c.border}
      >
        {ITEMS.map((item) => {
          const on = active === item.key;
          return (
            <Box
              key={item.key}
              as="button"
              type="button"
              onClick={() => go(item.href)}
              aria-current={on ? "page" : undefined}
              position="relative"
              fontFamily={MONO}
              fontSize="10.5px"
              letterSpacing="0.1em"
              fontWeight={on ? 700 : 500}
              px="11px"
              py="6px"
              borderRadius="7px"
              cursor="pointer"
              whiteSpace="nowrap"
              // inline color beats the header's dark-route `& button { color: white }` cascade
              style={{ color: on ? c.onText : c.offText, transition: "color 0.2s ease" }}
              _focusVisible={{ outline: "2px solid", outlineColor: c.accent, outlineOffset: "2px" }}
            >
              {on && (
                <MotionBox
                  layoutId="header-switcher-bubble"
                  position="absolute"
                  inset={0}
                  borderRadius="7px"
                  bg={c.bubble}
                  boxShadow={dark ? "0 0 14px rgba(61,240,200,0.35)" : "0 2px 8px rgba(15,23,32,0.25)"}
                  zIndex={0}
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Box as="span" position="relative" zIndex={1}>
                {item.label}
              </Box>
            </Box>
          );
        })}
      </Flex>

      {/* mobile: compact dropdown */}
      <Box display={{ base: "block", md: "none" }}>
        <Menu autoSelect={false} placement="bottom-end">
          <MenuButton
            as="button"
            type="button"
            style={{
              fontFamily: MONO,
              fontSize: "10.5px",
              letterSpacing: "0.1em",
              fontWeight: 700,
              color: dark ? "#e2ecf3" : "#16202e",
              padding: "7px 11px",
              borderRadius: "9px",
              background: c.wrap,
              border: `1px solid ${c.border}`,
              whiteSpace: "nowrap",
            }}
          >
            {current.label} <Box as="span" aria-hidden ml="4px" opacity={0.6}>▾</Box>
          </MenuButton>
          <MenuList
            minW="160px"
            py="6px"
            bg={c.menuBg}
            border="1px solid"
            borderColor={c.menuBorder}
            borderRadius="11px"
            boxShadow="0 16px 40px rgba(0,0,0,0.4)"
            sx={{ backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)" }}
          >
            {ITEMS.map((item) => {
              const on = active === item.key;
              return (
                <MenuItem
                  key={item.key}
                  onClick={() => go(item.href)}
                  bg="transparent"
                  fontFamily={MONO}
                  fontSize="11px"
                  letterSpacing="0.08em"
                  fontWeight={on ? 700 : 500}
                  color={on ? c.accent : dark ? "rgba(226,236,243,0.8)" : "rgba(30,41,59,0.8)"}
                  _hover={{ bg: dark ? "rgba(61,240,200,0.1)" : "rgba(13,148,136,0.1)" }}
                  _focus={{ bg: dark ? "rgba(61,240,200,0.1)" : "rgba(13,148,136,0.1)" }}
                >
                  {item.label}
                  {on && (
                    <Box as="span" ml="auto" color={c.accent}>
                      ●
                    </Box>
                  )}
                </MenuItem>
              );
            })}
          </MenuList>
        </Menu>
      </Box>
    </>
  );
}

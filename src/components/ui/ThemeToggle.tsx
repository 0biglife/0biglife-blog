"use client";
import { useColorMode, IconButton } from "@chakra-ui/react";
import { MdOutlineLightMode, MdDarkMode } from "react-icons/md";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <IconButton
      aria-label="Toggle theme"
      onClick={toggleColorMode}
      variant="ghost"
      style={{ borderRadius: "20px" }}
      icon={
        <motion.div
          key={colorMode}
          initial={{ rotate: 0, scale: 1 }}
          animate={{ rotate: colorMode === "light" ? 15 : -15, scale: 1.1 }}
          transition={{ type: "spring", stiffness: 300, damping: 10 }}
        >
          {colorMode === "light" ? (
            <MdDarkMode size={20} />
          ) : (
            <MdOutlineLightMode size={20} />
          )}
        </motion.div>
      }
      _hover={{
        bg: "gray.200",
        _dark: { bg: "gray.700" },
      }}
      _active={{ transform: "scale(0.9)" }}
    />
  );
}

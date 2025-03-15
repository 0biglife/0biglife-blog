"use client";

import { useEffect, useState } from "react";
import { IconButton } from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";

export default function ScrollToTopButton() {
  const [showScroll, setShowScroll] = useState<boolean>(false);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setShowScroll(true);
      } else {
        setShowScroll(false);
        setIsFadingOut(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    setIsFadingOut(true);

    const startPosition = window.scrollY;
    const duration = 500;
    let startTime: number | null = null;

    const easeOutQuad = (t: number) => t * (2 - t); // Testing

    const animation = (currentTime: number) => {
      // Animation 최적화
      if (!startTime) startTime = currentTime;
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      window.scrollTo(0, startPosition * (1 - easeOutQuad(progress)));

      if (elapsedTime < duration) requestAnimationFrame(animation);
      else setTimeout(() => setShowScroll(false), 300);
    };

    requestAnimationFrame(animation);
  };

  return (
    <IconButton
      icon={<ArrowUpIcon />}
      aria-label="scroll-to-top"
      position="fixed"
      bottom="24px"
      right="24px"
      size="lg"
      colorScheme="gray"
      borderRadius="full"
      boxShadow="md"
      onClick={scrollToTop}
      transition="opacity 0.3s ease-in-out, transform 0.2s ease-in-out"
      opacity={isFadingOut ? 0 : showScroll ? 1 : 0}
      pointerEvents={isFadingOut ? "none" : "auto"}
      _hover={{ boxShadow: "md", transform: "scale(1.1)" }}
    />
  );
}

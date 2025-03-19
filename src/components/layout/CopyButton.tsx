"use client";

import { IconButton } from "@chakra-ui/react";
import { useState } from "react";
import { FaRegCopy } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";

export default function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = async () => {
    try {
      // dev -> prod test 필요
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text: ", error);
    }
  };

  return (
    <IconButton
      display={{ base: "none", sm: "flex" }}
      zIndex={2}
      aria-label="copy-code"
      icon={
        copied ? (
          <FaCheck color="black" size={16} opacity={0.7} />
        ) : (
          <FaRegCopy color="black" size={16} opacity={0.7} />
        )
      }
      size="sm"
      position="absolute"
      top={8}
      right={3}
      bg="gray.300"
      opacity={0.7}
      onClick={handleCopy}
      variant="ghost"
    />
  );
}

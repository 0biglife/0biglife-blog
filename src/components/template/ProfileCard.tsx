"use client";

import Image from "next/image";
import {
  Box,
  Flex,
  IconButton,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { PROFILE } from "@/lib/constant";

/**
 * /log 페이지 우측 사이드바 상단의 프로필 카드.
 * 사진 + 이름 + 타이틀 + 소셜 링크. 데이터는 constant.ts의 PROFILE 상수.
 */
export default function ProfileCard() {
  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.300");
  const cardShadow = useColorModeValue(
    "0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05)",
    "0 2px 10px rgba(0, 0, 0, 0.4)"
  );
  const nameColor = useColorModeValue("gray.900", "gray.50");
  const titleColor = useColorModeValue("gray.500", "gray.400");
  const ringColor = useColorModeValue("gray.100", "whiteAlpha.300");
  const iconColor = useColorModeValue("gray.600", "gray.300");
  const iconHoverBg = useColorModeValue("gray.100", "whiteAlpha.200");

  const socials = [
    {
      label: "LinkedIn",
      href: PROFILE.links.linkedin,
      icon: <FiLinkedin size={18} />,
      external: true,
    },
    {
      label: "GitHub",
      href: PROFILE.links.github,
      icon: <FiGithub size={18} />,
      external: true,
    },
    {
      label: "Email",
      href: `mailto:${PROFILE.links.email}`,
      icon: <FiMail size={18} />,
      external: false,
    },
  ];

  return (
    <Box
      as="section"
      aria-label="프로필"
      bg={cardBg}
      borderWidth="1px"
      borderColor={cardBorder}
      borderRadius="2xl"
      boxShadow={cardShadow}
      px={6}
      py={7}
      mb={6}
    >
      <Flex direction="column" align="center" textAlign="center">
        <Box
          position="relative"
          w="88px"
          h="88px"
          borderRadius="full"
          overflow="hidden"
          borderWidth="3px"
          borderColor={ringColor}
        >
          <Image
            src={PROFILE.avatar}
            alt={PROFILE.name}
            fill
            sizes="88px"
            style={{ objectFit: "cover" }}
          />
        </Box>

        <Text
          mt={4}
          fontSize="md"
          fontWeight="bold"
          color={nameColor}
          lineHeight="1.3"
        >
          {PROFILE.name}
        </Text>
        <Text mt={1} fontSize="sm" color={titleColor}>
          {PROFILE.title}
        </Text>

        <Flex mt={4} gap={2}>
          {socials.map((social) => (
            <IconButton
              key={social.label}
              as="a"
              href={social.href}
              {...(social.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              aria-label={social.label}
              icon={social.icon}
              variant="ghost"
              boxSize="40px"
              minW="40px"
              borderRadius="full"
              color={iconColor}
              cursor="pointer"
              _hover={{ bg: iconHoverBg }}
            />
          ))}
        </Flex>
      </Flex>
    </Box>
  );
}

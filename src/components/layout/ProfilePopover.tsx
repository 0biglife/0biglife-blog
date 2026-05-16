"use client";

import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Text,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { PROFILE } from "@/lib/constant";

/**
 * 헤더의 프로필 아이콘 — 클릭하면 프로필 정보가 작은 팝오버로 뜬다.
 * 데이터는 constant.ts의 PROFILE 상수.
 */
export default function ProfilePopover() {
  // 헤더의 ThemeToggle과 동일한 hover 배경 — 두 컨트롤의 인터랙션을 일치시킴
  const triggerHoverBg = useColorModeValue("gray.200", "gray.700");
  const cardBg = useColorModeValue("white", "gray.800");
  const cardBorder = useColorModeValue("gray.200", "whiteAlpha.300");
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
    <Popover placement="bottom-end" isLazy>
      <PopoverTrigger>
        <Box
          as="button"
          type="button"
          aria-label="프로필 보기"
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxSize="40px"
          borderRadius="full"
          transition="background 0.15s ease, transform 0.1s ease"
          _hover={{ bg: triggerHoverBg }}
          _active={{ transform: "scale(0.9)" }}
          _focusVisible={{
            outline: "2px solid",
            outlineColor: "teal.400",
            outlineOffset: "2px",
          }}
        >
          <Avatar size="sm" src={PROFILE.avatar} name={PROFILE.name} />
        </Box>
      </PopoverTrigger>

      <PopoverContent
        w="248px"
        bg={cardBg}
        borderColor={cardBorder}
        borderRadius="xl"
        boxShadow="xl"
        _focusVisible={{ outline: "none" }}
      >
        <PopoverArrow bg={cardBg} />
        <PopoverBody py={6} px={5}>
          <Flex direction="column" align="center" textAlign="center">
            <Box
              borderRadius="full"
              borderWidth="3px"
              borderColor={ringColor}
              lineHeight={0}
            >
              <Avatar size="xl" src={PROFILE.avatar} name={PROFILE.name} />
            </Box>

            <Text
              mt={3}
              fontSize="sm"
              fontWeight="bold"
              color={nameColor}
              lineHeight="1.3"
            >
              {PROFILE.name}
            </Text>
            <Text mt={1} fontSize="xs" color={titleColor}>
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
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
}

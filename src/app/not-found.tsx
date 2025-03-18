"use client";

import {
  Box,
  Button,
  Heading,
  Link,
  Text,
  useColorModeValue,
  VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();

  const textColor = useColorModeValue("black", "white");

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="calc(100vh - 100px)"
      textAlign="center"
      p={6}
    >
      <Heading as="h1" size="2xl" color={textColor}>
        404
      </Heading>
      <Text fontSize="1rem" mt={4} color={textColor}>
        페이지를 찾을 수 없습니다.
      </Text>
      <Text fontSize="0.9rem" mt={2} color={textColor}>
        혹시 문제가 발생하였다면
        <Link
          href="mailto:0biglife@gmail.com"
          color="blue.500"
          fontWeight="bold"
          ml={1}
          mr={1}
        >
          0biglife@gmail.com
        </Link>
        로 요청해주세요.
      </Text>
      <VStack spacing={4} mt={6}>
        <Button
          colorScheme="gray"
          fontSize="14px"
          onClick={() => router.push("/")}
        >
          홈으로 돌아가기
        </Button>
      </VStack>
    </Box>
  );
}

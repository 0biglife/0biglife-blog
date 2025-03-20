"use client";

import {
  BLOG_EMAIL,
  HOME_BUTTON_TEXT,
  NOT_FOUND_HELP_BACKWARD_TEXT,
  NOT_FOUND_HELP_FORWARD_TEXT,
  NOT_FOUND_MESSAGE,
  NOT_FOUND_STATUS_CODE,
} from "@/lib/constant";
import { Box, Button, Heading, Link, Text, VStack } from "@chakra-ui/react";
import { useRouter } from "next/navigation";

export default function NotFoundPage() {
  const router = useRouter();

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
      <Heading as="h1" size="2xl" _dark={{ color: "white" }}>
        {NOT_FOUND_STATUS_CODE}
      </Heading>
      <Text fontSize="1rem" mt={4} _dark={{ color: "white" }}>
        {NOT_FOUND_MESSAGE}
      </Text>
      <Text fontSize="0.9rem" mt={2} _dark={{ color: "white" }}>
        {NOT_FOUND_HELP_FORWARD_TEXT}
        <Link
          aria-label="gmail"
          href="mailto:0biglife@gmail.com"
          color="blue.500"
          fontWeight="bold"
          ml={1}
          mr={1}
        >
          {BLOG_EMAIL}
        </Link>
        {NOT_FOUND_HELP_BACKWARD_TEXT}
      </Text>
      <VStack spacing={4} mt={6}>
        <Button
          colorScheme="gray"
          fontSize="14px"
          onClick={() => router.push("/")}
        >
          {HOME_BUTTON_TEXT}
        </Button>
      </VStack>
    </Box>
  );
}

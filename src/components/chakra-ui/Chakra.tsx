"use client";
import { ChakraProvider, ColorModeScript, Flex, Box } from "@chakra-ui/react";
import theme from "@/styles/theme";
import { Header, Footer } from "@/components";

export default function Chakra({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>
        <Flex direction="column" minH="100vh" minWidth="300px">
          <Header />
          <Box
            as="main"
            flex="1"
            pt="84px"
            pl="20px"
            pr="20px"
            pb="60px"
            className="container mx-auto p-4"
          >
            {children}
          </Box>
          <Footer />
        </Flex>
      </ChakraProvider>
    </>
  );
}

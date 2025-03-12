"use client";
import { ChakraProvider, ColorModeScript, Box, Flex } from "@chakra-ui/react";
import theme from "@/styles/theme";
import { Header, Footer } from "@/components";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <style>
          {`
            html, body {
              min-height: 100vh;
              margin: 0;
              padding: 0;
              display: flex;
              flex-direction: column;
            }
          `}
        </style>
      </head>
      <body>
        <ChakraProvider theme={theme}>
          <Flex direction="column" minH="100vh">
            <Header />
            <Box
              as="main"
              flex="1"
              pt="104px"
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
      </body>
    </html>
  );
}

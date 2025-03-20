"use client";
import { extendTheme, ThemeConfig } from "@chakra-ui/react";
import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const colors = {
  gray: {
    800: "#1E1E1E",
  },
  colors: {
    text: {
      light: "gray.800", // 밝은 테마 텍스트 색상 (더 어둡게)
      dark: "gray.200", // 다크 테마 텍스트 색상 (더 밝게)
    },
    background: {
      light: "white",
      dark: "gray.900",
    },
  },
};

const styles = {
  global: (props: StyleFunctionProps) => ({
    body: {
      bg: mode("white", "gray.800")(props),
      color: mode("black", "white")(props),
    },
  }),
};

const theme = extendTheme({ config, colors, styles });

export default theme;

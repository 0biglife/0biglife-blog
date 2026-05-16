"use client";
import { extendTheme, ThemeConfig } from "@chakra-ui/react";

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

// mode()는 렌더 시점에 한 값으로 확정되어 정적 빌드 시 다크 규칙이 누락된다.
// Header/Footer의 _dark 와 동일하게 클래스 기반 셀렉터로 작성해 두 규칙을 모두 내보낸다.
const styles = {
  global: {
    body: {
      bg: "white",
      color: "black",
    },
    "body.chakra-ui-dark": {
      bg: "gray.800",
      color: "white",
    },
  },
};

const theme = extendTheme({ config, colors, styles });

export default theme;

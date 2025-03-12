import { extendTheme, ThemeConfig } from "@chakra-ui/react";
import { mode, StyleFunctionProps } from "@chakra-ui/theme-tools";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: true,
};

const colors = {
  gray: {
    800: "#1E1E1E",
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

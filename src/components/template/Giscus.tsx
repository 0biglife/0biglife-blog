"use client";

import React, { useEffect } from "react";
import { useColorMode } from "@chakra-ui/react";

export default function Giscus() {
  const { colorMode } = useColorMode();

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://giscus.app/client.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.setAttribute("data-repo", "0biglife/0biglife-blog");
    script.setAttribute("data-repo-id", "R_kgDOODFFQg");
    script.setAttribute("data-category", "General");
    script.setAttribute("data-category-id", "DIC_kwDOODFFQs4CpC3o");
    script.setAttribute("data-mapping", "pathname");
    script.setAttribute("data-strict", "0");
    script.setAttribute("data-reactions-enabled", "1");
    // script.setAttribute("data-emit-metadata", "0");
    script.setAttribute("data-input-position", "bottom");
    script.setAttribute("data-theme", colorMode === "dark" ? "dark" : "light");
    script.setAttribute("data-lang", "ko");
    script.setAttribute("data-loading", "lazy");
    document.getElementById("giscus-container")?.appendChild(script);

    const container = document.getElementById("giscus-container");
    while (container?.firstChild) container.removeChild(container.firstChild);
    container?.appendChild(script);
  }, []);

  useEffect(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(
      "iframe.giscus-frame"
    );
    iframe?.contentWindow?.postMessage(
      {
        giscus: {
          setConfig: {
            theme: colorMode === "dark" ? "dark" : "light",
          },
        },
      },
      "https://giscus.app"
    );
  }, [colorMode]);

  const style: React.CSSProperties = {
    width: "100%",
    marginTop: "60px",
    paddingTop: "80px",
    minWidth: "300px",
    maxWidth: "1040px",
    margin: "0 auto",
    // borderTop: "0.5px solid #eaeaea",
    // borderOpacity: 0.5,
  };

  return <div id="giscus-container" style={style} />;
}

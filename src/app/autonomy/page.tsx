"use client";

import { useEffect } from "react";
import HeroScene from "@/components/landing/HeroScene";

const DARK = "#01030a";

// The autonomy (lidar perception) scene lives only here now — its own full-screen,
// no-scroll route. Force the page background near-black so no light body strip
// shows between the dark header and the scene.
export default function AutonomyPage() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlBg: html.style.background,
      bodyBg: body.style.background,
      htmlOv: html.style.overflow,
      bodyOv: body.style.overflow,
    };
    html.style.background = DARK;
    body.style.background = DARK;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.background = prev.htmlBg;
      body.style.background = prev.bodyBg;
      html.style.overflow = prev.htmlOv;
      body.style.overflow = prev.bodyOv;
    };
  }, []);

  return <HeroScene />;
}

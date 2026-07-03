"use client";

import { useEffect, useRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

const MONO = "'JetBrains Mono', monospace";
const L = 170; // samples per graph (ring buffer length)

interface Sig {
  key: string;
  label: string;
  unit: string;
  color: string;
  min: number;
  max: number;
  fmt: (v: number) => string;
}
const SIGNALS: Sig[] = [
  { key: "vel", label: "VELOCITY", unit: "km/h", color: "#63b3ff", min: 0, max: 85, fmt: (v) => v.toFixed(0) },
  { key: "steer", label: "STEERING", unit: "°", color: "#c9ff4d", min: -35, max: 35, fmt: (v) => (v >= 0 ? "+" : "") + v.toFixed(0) },
  { key: "accel", label: "LONG. ACCEL", unit: "m/s²", color: "#ff8a5e", min: -4, max: 4, fmt: (v) => (v >= 0 ? "+" : "") + v.toFixed(1) },
  { key: "lat", label: "PERCEPTION", unit: "ms", color: "#5ce0c0", min: 12, max: 72, fmt: (v) => v.toFixed(0) },
];

/** Deterministic-ish coherent "virtual vehicle" producing all signals. */
function makeModel() {
  let t = 0;
  let vTarget = 42;
  let vTimer = 3;
  let v = 42;
  let prevV = 42;
  let laneT = 5;
  let laneDir = 0;
  return (dt: number) => {
    t += dt;
    vTimer -= dt;
    if (vTimer <= 0) {
      vTarget = 8 + Math.random() * 66;
      vTimer = 3 + Math.random() * 5;
    }
    v += (vTarget - v) * (1 - Math.pow(0.35, dt));
    const accel = Math.max(-4, Math.min(4, ((v - prevV) / Math.max(dt, 0.001)) / 3.6));
    prevV = v;
    laneT -= dt;
    if (laneT <= 0) {
      laneDir = (Math.random() - 0.5) * 2;
      laneT = 4 + Math.random() * 6;
    }
    const steer =
      Math.sin(t * 0.55) * 9 +
      Math.sin(t * 0.19) * 6 +
      laneDir * 14 * Math.exp(-Math.pow((laneT % 10) - 8, 2)) +
      (Math.random() - 0.5) * 2;
    const lat = 30 + Math.sin(t * 1.2) * 4 + (Math.random() - 0.5) * 3 + (Math.random() < 0.02 ? 25 : 0);
    return { vel: v, steer, accel, lat };
  };
}

export default function TelemetryGraphs() {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const model = makeModel();
    // ring buffers, pre-filled so graphs are alive on first paint
    const buffers = SIGNALS.map(() => new Float32Array(L));
    for (let i = 0; i < L; i++) {
      const s = model(0.05);
      buffers[0][i] = s.vel;
      buffers[1][i] = s.steer;
      buffers[2][i] = s.accel;
      buffers[3][i] = s.lat;
    }
    let head = 0; // index of newest sample

    const sizes: { w: number; h: number }[] = SIGNALS.map(() => ({ w: 1, h: 1 }));
    const resize = () => {
      canvasRefs.current.forEach((cv, i) => {
        if (!cv) return;
        const r = cv.getBoundingClientRect();
        sizes[i] = { w: Math.max(1, r.width), h: Math.max(1, r.height) };
        cv.width = Math.round(sizes[i].w * dpr);
        cv.height = Math.round(sizes[i].h * dpr);
        const ctx = cv.getContext("2d");
        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
    };
    resize();
    const ro = new ResizeObserver(resize);
    canvasRefs.current.forEach((cv) => cv && ro.observe(cv));

    const draw = () => {
      SIGNALS.forEach((sig, si) => {
        const cv = canvasRefs.current[si];
        if (!cv) return;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        const { w, h } = sizes[si];
        const buf = buffers[si];
        ctx.clearRect(0, 0, w, h);
        // grid
        ctx.strokeStyle = "rgba(140,160,180,0.09)";
        ctx.lineWidth = 1;
        for (let g = 1; g < 3; g++) {
          const y = (g / 3) * h;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        const yOf = (val: number) => {
          const t = (val - sig.min) / (sig.max - sig.min);
          return h - 4 - Math.max(0, Math.min(1, t)) * (h - 8);
        };
        // fill under the line
        ctx.beginPath();
        for (let i = 0; i < L; i++) {
          const val = buf[(head + 1 + i) % L];
          const x = (i / (L - 1)) * w;
          const y = yOf(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, sig.color + "38");
        grad.addColorStop(1, sig.color + "00");
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
        // line
        ctx.beginPath();
        for (let i = 0; i < L; i++) {
          const val = buf[(head + 1 + i) % L];
          const x = (i / (L - 1)) * w;
          const y = yOf(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = sig.color;
        ctx.lineWidth = 1.6;
        ctx.stroke();
        // leading dot
        const lv = buf[head];
        const ly = yOf(lv);
        ctx.fillStyle = sig.color;
        ctx.beginPath();
        ctx.arc(w - 1.5, ly, 2.4, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    let raf = 0;
    let running = true;
    let last = -1;
    let acc = 0;
    let valTick = 0;
    const SAMPLE_DT = 0.05; // 20 Hz data
    const loop = (now: number) => {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (last < 0) last = now;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      acc += reduce ? 0 : dt;
      let stepped = false;
      while (acc >= SAMPLE_DT) {
        acc -= SAMPLE_DT;
        const s = model(SAMPLE_DT);
        head = (head + 1) % L;
        buffers[0][head] = s.vel;
        buffers[1][head] = s.steer;
        buffers[2][head] = s.accel;
        buffers[3][head] = s.lat;
        stepped = true;
      }
      if (stepped || reduce) draw();
      if (++valTick % 6 === 0) {
        SIGNALS.forEach((sig, si) => {
          const el = valueRefs.current[si];
          if (el) el.textContent = sig.fmt(buffers[si][head]);
        });
      }
    };
    raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(
      ([e]) => {
        const vis = e.isIntersecting;
        if (vis && !running) {
          running = true;
          last = -1;
          raf = requestAnimationFrame(loop);
        } else if (!vis && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { threshold: 0.02 }
    );
    if (canvasRefs.current[0]) io.observe(canvasRefs.current[0]);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <Box
      w="100%"
      h="100%"
      p={{ base: 3, md: 4 }}
      borderRadius="10px"
      bg="rgba(6,10,15,0.55)"
      border="1px solid"
      borderColor="whiteAlpha.150"
      sx={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" justify="space-between" mb={{ base: 2, md: 3 }}>
        <Text fontFamily={MONO} fontSize={{ base: "9.5px", md: "10.5px" }} letterSpacing="0.18em" textTransform="uppercase" color="whiteAlpha.600">
          Vehicle Telemetry
        </Text>
        <Flex align="center" gap={1.5}>
          <Box w="6px" h="6px" borderRadius="full" bg="#8affc1" boxShadow="0 0 8px #8affc1" />
          <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.14em" color="#8affc1">
            LIVE · 20Hz
          </Text>
        </Flex>
      </Flex>

      <Flex direction="column" gap={{ base: 2, md: 3 }} flex="1">
        {SIGNALS.map((sig, i) => (
          <Box key={sig.key} flex="1" minH={{ base: "58px", md: "0" }}>
            <Flex align="baseline" justify="space-between" mb="3px">
              <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.06em" color="whiteAlpha.550">
                {sig.label}
              </Text>
              <Flex align="baseline" gap={1}>
                <Text
                  as="span"
                  ref={(el: HTMLSpanElement | null) => {
                    valueRefs.current[i] = el;
                  }}
                  fontFamily={MONO}
                  fontSize={{ base: "14px", md: "16px" }}
                  fontWeight={700}
                  color={sig.color}
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {sig.fmt((sig.min + sig.max) / 2)}
                </Text>
                <Text fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400">
                  {sig.unit}
                </Text>
              </Flex>
            </Flex>
            <Box position="relative" h={{ base: "38px", md: "clamp(38px, 8vh, 74px)" }} borderRadius="4px" overflow="hidden" bg="rgba(2,4,9,0.5)">
              <canvas
                ref={(el) => {
                  canvasRefs.current[i] = el;
                }}
                style={{ width: "100%", height: "100%", display: "block" }}
              />
            </Box>
          </Box>
        ))}
      </Flex>
    </Box>
  );
}

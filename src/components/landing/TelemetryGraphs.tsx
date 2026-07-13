"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

const MONO = "'JetBrains Mono', monospace";
const L = 190; // samples per graph (ring buffer length)

interface Sig {
  key: string;
  label: string;
  ch: string; // CAN-style channel id
  unit: string;
  color: string;
  min: number;
  max: number;
  signed: boolean; // draw a zero baseline
  warn?: number; // |v| beyond this shades a caution band
  sla?: number; // budget line (e.g. perception latency)
  fmt: (v: number) => string;
}
const SIGNALS: Sig[] = [
  { key: "vel", label: "VEHICLE SPEED", ch: "0x0C1", unit: "km/h", color: "#63b3ff", min: 0, max: 90, signed: false, fmt: (v) => v.toFixed(0) },
  { key: "steer", label: "STEER ANGLE", ch: "0x0E2", unit: "°", color: "#c9ff4d", min: -35, max: 35, signed: true, fmt: (v) => { const n = Math.round(v) || 0; return (n >= 0 ? "+" : "") + n; } },
  { key: "yaw", label: "YAW RATE", ch: "0x1A0", unit: "°/s", color: "#b78bff", min: -24, max: 24, signed: true, fmt: (v) => { const n = +v.toFixed(1) || 0; return (n >= 0 ? "+" : "") + n.toFixed(1); } },
  { key: "accel", label: "LONG ACCEL", ch: "0x145", unit: "m/s²", color: "#ff8a5e", min: -4.5, max: 4.5, signed: true, warn: 3, fmt: (v) => { const n = +v.toFixed(1) || 0; return (n >= 0 ? "+" : "") + n.toFixed(1); } },
  { key: "lat", label: "PERCEPTION", ch: "0x210", unit: "ms", color: "#5ce0c0", min: 10, max: 80, signed: false, sla: 50, fmt: (v) => v.toFixed(0) },
];

interface Sample {
  vel: number;
  steer: number;
  yaw: number;
  accel: number;
  lat: number;
  loc: number;
  obj: number;
}

/** Deterministic-ish coherent "virtual vehicle" producing all signals. */
function makeModel() {
  let t = 0;
  let vTarget = 42;
  let vTimer = 3;
  let v = 42;
  let prevV = 42;
  let laneT = 5;
  let laneDir = 0;
  let obj = 19;
  let objT = 2;
  return (dt: number): Sample => {
    t += dt;
    vTimer -= dt;
    if (vTimer <= 0) {
      vTarget = 8 + Math.random() * 66;
      vTimer = 3 + Math.random() * 5;
    }
    v += (vTarget - v) * (1 - Math.pow(0.35, dt));
    const accel = Math.max(-4.5, Math.min(4.5, ((v - prevV) / Math.max(dt, 0.001)) / 3.6));
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
    // yaw rate ~ steer angle scaled by speed (bicycle-model flavor)
    const yaw = steer * Math.max(0.2, Math.min(1.4, v / 45)) * 0.72 + (Math.random() - 0.5) * 1.1;
    const lat = 30 + Math.sin(t * 1.2) * 5 + (Math.random() - 0.5) * 3 + (Math.random() < 0.02 ? 26 : 0);
    const loc = 99.1 + Math.sin(t * 0.4) * 0.5 + (Math.random() - 0.5) * 0.25;
    objT -= dt;
    if (objT <= 0) {
      obj = 16 + Math.floor(Math.random() * 7);
      objT = 1.5 + Math.random() * 2.5;
    }
    return { vel: v, steer, yaw, accel, lat, loc, obj };
  };
}

export default function TelemetryGraphs() {
  // On phones, show only the three most legible channels so the panel stays a
  // supporting detail instead of a wall of graphs that buries the headline.
  const [isMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const shown = isMobile ? SIGNALS.slice(0, 3) : SIGNALS;
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const trendRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const locRef = useRef<HTMLSpanElement | null>(null);
  const objRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const model = makeModel();
    const keys: (keyof Sample)[] = ["vel", "steer", "yaw", "accel", "lat"];
    const buffers = SIGNALS.map(() => new Float32Array(L));
    for (let i = 0; i < L; i++) {
      const s = model(0.05);
      keys.forEach((k, si) => (buffers[si][i] = s[k] as number));
    }
    let head = 0;
    let lastSample: Sample = model(0.05);

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
        const span = sig.max - sig.min;
        const yOf = (val: number) => h - 3 - Math.max(0, Math.min(1, (val - sig.min) / span)) * (h - 6);
        ctx.clearRect(0, 0, w, h);

        // caution / SLA bands
        if (sig.warn !== undefined) {
          ctx.fillStyle = "rgba(255,120,70,0.08)";
          ctx.fillRect(0, 0, w, yOf(sig.warn));
          ctx.fillRect(0, yOf(-sig.warn), w, h - yOf(-sig.warn));
        }
        if (sig.sla !== undefined) {
          ctx.fillStyle = "rgba(255,90,70,0.08)";
          ctx.fillRect(0, 0, w, yOf(sig.sla));
        }

        // grid — vertical time divisions + horizontal value divisions
        ctx.strokeStyle = "rgba(150,170,190,0.07)";
        ctx.lineWidth = 1;
        for (let g = 1; g < 6; g++) {
          const x = (g / 6) * w;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let g = 1; g < 3; g++) {
          const y = (g / 3) * h;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        // zero baseline for signed channels
        if (sig.signed) {
          const zy = yOf(0);
          ctx.strokeStyle = "rgba(180,200,220,0.28)";
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(0, zy);
          ctx.lineTo(w, zy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        // SLA budget line
        if (sig.sla !== undefined) {
          const sy = yOf(sig.sla);
          ctx.strokeStyle = "rgba(255,120,90,0.55)";
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(0, sy);
          ctx.lineTo(w, sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // area fill
        ctx.beginPath();
        for (let i = 0; i < L; i++) {
          const x = (i / (L - 1)) * w;
          const y = yOf(buf[(head + 1 + i) % L]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, sig.color + "40");
        grad.addColorStop(1, sig.color + "00");
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // trace
        ctx.beginPath();
        for (let i = 0; i < L; i++) {
          const x = (i / (L - 1)) * w;
          const y = yOf(buf[(head + 1 + i) % L]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = sig.color;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = sig.color;
        ctx.shadowBlur = 5;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // "now" cursor + leading dot
        const ly = yOf(buf[head]);
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.beginPath();
        ctx.moveTo(w - 0.5, 0);
        ctx.lineTo(w - 0.5, h);
        ctx.stroke();
        ctx.fillStyle = sig.color;
        ctx.beginPath();
        ctx.arc(w - 2, ly, 2.4, 0, Math.PI * 2);
        ctx.fill();

        // axis scale labels (top = max, bottom = min)
        ctx.fillStyle = "rgba(200,215,230,0.35)";
        ctx.font = `700 8px ${MONO}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(String(sig.max), 3, 2);
        ctx.textBaseline = "bottom";
        ctx.fillText(String(sig.min), 3, h - 1);
      });
    };

    let raf = 0;
    let running = true;
    let last = -1;
    let acc = 0;
    let valTick = 0;
    const SAMPLE_DT = 0.05; // 20 Hz
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
        lastSample = s;
        head = (head + 1) % L;
        keys.forEach((k, si) => (buffers[si][head] = s[k] as number));
        stepped = true;
      }
      if (stepped || reduce) draw();
      if (++valTick % 6 === 0) {
        SIGNALS.forEach((sig, si) => {
          const el = valueRefs.current[si];
          if (el) el.textContent = sig.fmt(buffers[si][head]);
          const tr = trendRefs.current[si];
          if (tr) {
            const d = buffers[si][head] - buffers[si][(head - 14 + L) % L];
            const thr = (sig.max - sig.min) * 0.02;
            tr.textContent = d > thr ? "▲" : d < -thr ? "▼" : "▬";
            tr.style.color = d > thr ? "#8affc1" : d < -thr ? "#ff8a7a" : "rgba(255,255,255,0.3)";
          }
        });
        if (locRef.current) locRef.current.textContent = lastSample.loc.toFixed(1);
        if (objRef.current) objRef.current.textContent = String(lastSample.obj);
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
      p={{ base: 3, md: "14px" }}
      borderRadius="10px"
      bg="rgba(6,10,15,0.6)"
      border="1px solid"
      borderColor="whiteAlpha.150"
      sx={{ backdropFilter: "blur(7px)", WebkitBackdropFilter: "blur(7px)" }}
      display="flex"
      flexDirection="column"
    >
      <Flex align="center" justify="space-between" mb="2px">
        <Text fontFamily={MONO} fontSize={{ base: "9.5px", md: "10.5px" }} letterSpacing="0.18em" textTransform="uppercase" color="whiteAlpha.700">
          Vehicle Telemetry
        </Text>
        <Flex align="center" gap={1.5}>
          <Box w="6px" h="6px" borderRadius="full" bg="#8affc1" boxShadow="0 0 8px #8affc1" />
          <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.14em" color="#8affc1">
            LIVE · 20 Hz
          </Text>
        </Flex>
      </Flex>
      <Text fontFamily={MONO} fontSize="8.5px" letterSpacing="0.1em" color="whiteAlpha.350" mb={{ base: 2, md: "10px" }}>
        EGO-1 · CAN-FD 500 kb/s · ISO&nbsp;11898
      </Text>

      <Flex direction="column" gap={{ base: 2, md: "10px" }} flex="1">
        {shown.map((sig, i) => (
          <Box key={sig.key} flex="1" minH={{ base: "50px", md: "0" }}>
            <Flex align="baseline" justify="space-between" mb="2px">
              <Flex align="baseline" gap={1.5}>
                <Text fontFamily={MONO} fontSize="9.5px" letterSpacing="0.05em" color="whiteAlpha.600">
                  {sig.label}
                </Text>
                <Text fontFamily={MONO} fontSize="8px" color="whiteAlpha.300">
                  {sig.ch}
                </Text>
              </Flex>
              <Flex align="baseline" gap={1}>
                <Text
                  as="span"
                  ref={(el: HTMLSpanElement | null) => {
                    trendRefs.current[i] = el;
                  }}
                  fontSize="8px"
                  color="whiteAlpha.300"
                >
                  ▬
                </Text>
                <Text
                  as="span"
                  ref={(el: HTMLSpanElement | null) => {
                    valueRefs.current[i] = el;
                  }}
                  fontFamily={MONO}
                  fontSize={{ base: "14px", md: "15.5px" }}
                  fontWeight={700}
                  color={sig.color}
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {sig.fmt((sig.min + sig.max) / 2)}
                </Text>
                <Text fontFamily={MONO} fontSize="9px" color="whiteAlpha.400" minW="26px">
                  {sig.unit}
                </Text>
              </Flex>
            </Flex>
            <Box position="relative" h={{ base: "34px", md: "clamp(34px, 7vh, 64px)" }} borderRadius="4px" overflow="hidden" bg="rgba(2,4,9,0.55)" border="1px solid" borderColor="whiteAlpha.100">
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

      {/* system status strip */}
      <Flex mt={{ base: 2, md: "10px" }} pt="8px" borderTop="1px solid" borderColor="whiteAlpha.100" gap="6px" wrap="wrap" fontFamily={MONO} fontSize="8.5px" letterSpacing="0.03em">
        {[
          { k: "GNSS", v: "3D FIX", c: "#8affc1" },
          { k: "IMU", v: "OK", c: "#8affc1" },
        ].map((s) => (
          <Flex key={s.k} align="center" gap="4px" px="5px" py="2px" borderRadius="3px" bg="whiteAlpha.100">
            <Box w="5px" h="5px" borderRadius="full" bg={s.c} boxShadow={`0 0 6px ${s.c}`} />
            <Text as="span" color="whiteAlpha.500">{s.k}</Text>
            <Text as="span" color="whiteAlpha.800">{s.v}</Text>
          </Flex>
        ))}
        <Flex align="center" gap="4px" px="5px" py="2px" borderRadius="3px" bg="whiteAlpha.100">
          <Text as="span" color="whiteAlpha.500">LOC</Text>
          <Text as="span" ref={locRef} color="whiteAlpha.800" sx={{ fontVariantNumeric: "tabular-nums" }}>99.1</Text>
          <Text as="span" color="whiteAlpha.500">%</Text>
        </Flex>
        <Flex align="center" gap="4px" px="5px" py="2px" borderRadius="3px" bg="whiteAlpha.100">
          <Text as="span" color="whiteAlpha.500">OBJ</Text>
          <Text as="span" ref={objRef} color="whiteAlpha.800" sx={{ fontVariantNumeric: "tabular-nums" }}>19</Text>
        </Flex>
        <Flex align="center" gap="4px" px="5px" py="2px" borderRadius="3px" bg="rgba(201,255,77,0.1)">
          <Text as="span" color="whiteAlpha.500">PLAN</Text>
          <Text as="span" color="#c9ff4d">LANE-KEEP</Text>
        </Flex>
      </Flex>
    </Box>
  );
}

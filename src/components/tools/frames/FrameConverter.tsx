"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { Box, Flex, Text, SimpleGrid } from "@chakra-ui/react";
import {
  CONVENTIONS,
  DEFAULT_STATE,
  axisRole,
  clean,
  convert,
  decodeState,
  encodeState,
  fmt,
  fmtAngleExact,
  pythonSnippet,
  toDeg,
  wrapPi,
  type ConventionId,
  type FrameState,
  type InputMode,
  type Mat3,
  type Vec3,
} from "./conventions";

// Client-only WebGL (mounted guard, not ssr:false — Amplify mishandles ssr:false routes)
const FrameCanvas = dynamic(() => import("./FrameCanvas"), { loading: () => null });

// kept in sync with the disc tints the canvas draws
const STAGE_TINTS = { source: "#5ce0c0", target: "#c9ff4d" } as const;

const MONO = "'JetBrains Mono', monospace";
const BG = "#01030a";
const PANEL = "rgba(6,11,20,0.72)";
const ACCENT = "#c9ff4d";
const CYAN = "#5ce0c0";
const WARN = "#ffb454";
const BORDER = "rgba(140,180,200,0.14)";

const MODES: { id: InputMode; label: string }[] = [
  { id: "heading", label: "HEADING" },
  { id: "quat", label: "QUATERNION" },
  { id: "euler", label: "EULER" },
];

// ── primitives ────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.18em" color="whiteAlpha.500" mb={1.5}>
      {children}
    </Text>
  );
}

function Panel({ children, ...rest }: React.ComponentProps<typeof Box>) {
  return (
    // minW=0 so a wide child (matrix, code block) scrolls inside the panel
    // instead of stretching its grid track and pushing the page sideways
    <Box
      bg={PANEL}
      border="1px solid"
      borderColor={BORDER}
      borderRadius="12px"
      p={{ base: 3.5, md: 4 }}
      minW={0}
      {...rest}
    >
      {children}
    </Box>
  );
}

function Pick<T extends string>({
  value,
  options,
  onPick,
}: {
  value: T;
  options: { id: T; label: string }[];
  onPick: (id: T) => void;
}) {
  return (
    <Flex gap={1} flexWrap="wrap">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Box
            as="button"
            type="button"
            key={o.id}
            onClick={() => onPick(o.id)}
            px={2.5}
            h="27px"
            borderRadius="5px"
            border="1px solid"
            borderColor={on ? ACCENT : "whiteAlpha.150"}
            bg={on ? "rgba(201,255,77,0.14)" : "transparent"}
            color={on ? ACCENT : "whiteAlpha.700"}
            fontFamily={MONO}
            fontSize="10px"
            fontWeight={600}
            transition="all 0.14s ease"
            _hover={{ borderColor: on ? ACCENT : "whiteAlpha.400", color: on ? ACCENT : "white" }}
            _focusVisible={{ outline: "2px solid", outlineColor: CYAN, outlineOffset: "2px" }}
          >
            {o.label}
          </Box>
        );
      })}
    </Flex>
  );
}

function Num({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <Flex direction="column" gap={1} minW={0}>
      <Text fontFamily={MONO} fontSize="9px" color="whiteAlpha.450" letterSpacing="0.1em">
        {label}
      </Text>
      <Box
        as="input"
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const v = Number(e.target.value);
          onChange(Number.isFinite(v) ? v : 0);
        }}
        w="100%"
        minW={0}
        h="30px"
        px={2}
        borderRadius="5px"
        border="1px solid"
        borderColor="whiteAlpha.150"
        bg="rgba(2,5,10,0.7)"
        color="white"
        fontFamily={MONO}
        fontSize="12px"
        _focusVisible={{ outline: "none", borderColor: ACCENT }}
        sx={{
          "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
          MozAppearance: "textfield",
        }}
      />
    </Flex>
  );
}

function MatrixView({ m, integer }: { m: Mat3; integer?: boolean }) {
  return (
    <Box
      fontFamily={MONO}
      fontSize={{ base: "10.5px", md: "11.5px" }}
      lineHeight={1.75}
      color="whiteAlpha.850"
      overflowX="auto"
      sx={{ tabSize: 2 }}
    >
      {m.map((row, i) => (
        <Flex key={i} gap={0} whiteSpace="pre">
          <Box as="span" color="whiteAlpha.300">
            {i === 0 ? "⎡ " : i === 1 ? "⎢ " : "⎣ "}
          </Box>
          {row.map((v, j) => {
            const z = clean(v) === 0;
            return (
              <Box
                key={j}
                as="span"
                w={{ base: "58px", md: "68px" }}
                textAlign="right"
                pr={2}
                color={z ? "whiteAlpha.300" : clean(v) > 0 ? ACCENT : "#ff9a8b"}
              >
                {integer ? clean(v).toFixed(0) : fmt(v, 4)}
              </Box>
            );
          })}
          <Box as="span" color="whiteAlpha.300">
            {i === 0 ? " ⎤" : i === 1 ? " ⎥" : " ⎦"}
          </Box>
        </Flex>
      ))}
    </Box>
  );
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <Flex
      justify="space-between"
      align="baseline"
      gap={3}
      py="3px"
      borderBottom="1px solid"
      borderColor="whiteAlpha.50"
      direction={{ base: "column", sm: "row" }}
      minW={0}
    >
      <Text fontFamily={MONO} fontSize="10px" color="whiteAlpha.500" whiteSpace="nowrap" flexShrink={0}>
        {k}
      </Text>
      <Text
        fontFamily={MONO}
        fontSize={{ base: "11px", md: "12px" }}
        color={tone ?? "whiteAlpha.900"}
        textAlign={{ base: "left", sm: "right" }}
        minW={0}
        sx={{ overflowWrap: "anywhere" }}
      >
        {v}
      </Text>
    </Flex>
  );
}

// ── the tool ──────────────────────────────────────────────────────────

export default function FrameConverter() {
  const [s, setS] = useState<FrameState>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  // client-only WebGL + hydrate from ?s= (SSR renders defaults → no mismatch)
  useEffect(() => {
    setMounted(true);
    const raw = new URLSearchParams(window.location.search).get("s");
    if (raw) setS(decodeState(raw));
  }, []);

  const update = useCallback((patch: Partial<FrameState>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.history.replaceState(null, "", `${window.location.pathname}?s=${encodeState(next)}`);
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const c = useMemo(() => convert(s), [s]);
  const code = useMemo(() => pythonSnippet(c), [c]);

  const copy = useCallback(async (text: string, which: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  }, []);

  const swap = useCallback(() => update({ from: s.to, to: s.from }), [s.from, s.to, update]);

  const convOptions = CONVENTIONS.map((x) => ({ id: x.id, label: x.label }));
  const degTo = clean(toDeg(c.headingTo), 4);
  const degFrom = clean(toDeg(c.headingFrom), 4);
  const gap = clean(toDeg(wrapPi(c.headingToAsPose - c.headingTo)), 1);

  return (
    <Box bg={BG} color="white" minH="100vh" pb={20} overflowX="hidden">
      <Box maxW="1180px" mx="auto" px={{ base: 4, md: 6, lg: 8 }} pt={{ base: 6, md: 10 }} minW={0}>
        {/* ── header ── */}
        <Text fontFamily={MONO} fontSize="11px" letterSpacing="0.18em" color={ACCENT} mb={3}>
          AUTONOMOUS-DRIVING TOOLS
        </Text>
        <Text
          as="h1"
          fontFamily="'Pretendard Variable', Pretendard, sans-serif"
          fontWeight={800}
          letterSpacing="-0.02em"
          lineHeight={1.1}
          fontSize={{ base: "1.7rem", md: "2.6rem" }}
          sx={{ overflowWrap: "break-word" }}
        >
          Coordinate frame converter
        </Text>
        <Text mt={3} fontSize={{ base: "13px", md: "14.5px" }} lineHeight={1.65} color="whiteAlpha.650" maxW="720px">
          KITTI, nuScenes, Waymo and ROS all disagree about which axis is forward and where a
          heading angle starts. Pick two, and see the same physical car described by two different
          sets of numbers — plus the matrix and the code that carry you between them.
        </Text>

        {/* ── converter ── */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={{ base: 6, md: 8 }}>
          {/* frames */}
          <Panel>
            <Flex justify="space-between" align="center" mb={2}>
              <Label>SOURCE FRAME</Label>
              <Box
                as="button"
                type="button"
                onClick={swap}
                fontFamily={MONO}
                fontSize="10px"
                color="whiteAlpha.600"
                px={2}
                py="3px"
                borderRadius="4px"
                border="1px solid"
                borderColor="whiteAlpha.150"
                _hover={{ color: ACCENT, borderColor: ACCENT }}
                _focusVisible={{ outline: "2px solid", outlineColor: CYAN, outlineOffset: "2px" }}
              >
                ⇅ SWAP
              </Box>
            </Flex>
            <Pick value={s.from} options={convOptions} onPick={(id: ConventionId) => update({ from: id })} />
            <Text mt={2} fontFamily={MONO} fontSize="10px" color="whiteAlpha.450">
              {c.from.name} · x={axisRole(c.from, 0)} y={axisRole(c.from, 1)} z={axisRole(c.from, 2)}
            </Text>

            <Box mt={4}>
              <Label>TARGET FRAME</Label>
              <Pick value={s.to} options={convOptions} onPick={(id: ConventionId) => update({ to: id })} />
              <Text mt={2} fontFamily={MONO} fontSize="10px" color="whiteAlpha.450">
                {c.to.name} · x={axisRole(c.to, 0)} y={axisRole(c.to, 1)} z={axisRole(c.to, 2)}
              </Text>
            </Box>
          </Panel>

          {/* input */}
          <Panel>
            <Label>INPUT ROTATION</Label>
            <Pick value={s.mode} options={MODES} onPick={(id: InputMode) => update({ mode: id })} />

            <Box mt={3.5}>
              {s.mode === "heading" && (
                <>
                  <Flex gap={3} align="flex-end">
                    <Box flex="1" minW={0}>
                      <Num
                        label={`${c.from.headingName} (deg)`}
                        value={s.heading}
                        onChange={(n) => update({ heading: n })}
                      />
                    </Box>
                    <Box flex="2" minW={0} pb="4px">
                      <Box
                        as="input"
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={s.heading}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          update({ heading: Number(e.target.value) })
                        }
                        w="100%"
                        sx={{ accentColor: ACCENT }}
                      />
                    </Box>
                  </Flex>
                  <Text mt={2} fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400" lineHeight={1.5}>
                    {c.from.headingNote}
                  </Text>
                </>
              )}

              {s.mode === "quat" && (
                <>
                  <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
                    {(["w", "x", "y", "z"] as const).map((k, i) => (
                      <Num
                        key={k}
                        label={k}
                        step={0.01}
                        value={s.quat[i]}
                        onChange={(n) => {
                          const q = [...s.quat] as [number, number, number, number];
                          q[i] = n;
                          update({ quat: q });
                        }}
                      />
                    ))}
                  </SimpleGrid>
                  <Text mt={2} fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400">
                    w,x,y,z order — the nuScenes storage order. Normalized on read.
                  </Text>
                </>
              )}

              {s.mode === "euler" && (
                <>
                  <SimpleGrid columns={3} spacing={2}>
                    {(["roll", "pitch", "yaw"] as const).map((k, i) => (
                      <Num
                        key={k}
                        label={`${k} (deg)`}
                        value={s.euler[i]}
                        onChange={(n) => {
                          const e = [...s.euler] as [number, number, number];
                          e[i] = n;
                          update({ euler: e });
                        }}
                      />
                    ))}
                  </SimpleGrid>
                  <Text mt={2} fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400">
                    Intrinsic Z-Y-X (yaw, then pitch, then roll) — the ROS and Waymo ordering.
                  </Text>
                </>
              )}
            </Box>

            <Box mt={4}>
              <Label>SAMPLE POINT IN SOURCE FRAME</Label>
              <SimpleGrid columns={3} spacing={2}>
                {([0, 1, 2] as const).map((i) => (
                  <Num
                    key={i}
                    label={["x", "y", "z"][i]}
                    step={0.1}
                    value={s.point[i]}
                    onChange={(n) => {
                      const p = [...s.point] as Vec3;
                      p[i] = n;
                      update({ point: p });
                    }}
                  />
                ))}
              </SimpleGrid>
            </Box>
          </Panel>
        </SimpleGrid>

        {/* ── 3D ── */}
        <Panel mt={4} p={0} overflow="hidden" position="relative">
          <Box h={{ base: "340px", md: "440px" }} position="relative">
            {mounted && <FrameCanvas from={c.from} to={c.to} Rflu={c.Rflu} />}
          </Box>
          <Flex
            position="absolute"
            top={3}
            left={4}
            right={4}
            justify="space-between"
            align="flex-start"
            pointerEvents="none"
            gap={3}
          >
            <Text fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.500" letterSpacing="0.1em" maxW="60%">
              SAME CAR · SAME ARROWS · DIFFERENT LABELS
            </Text>
            <Text fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.350" textAlign="right">
              drag to orbit
            </Text>
          </Flex>

          {/* Stage legend lives in the DOM, not the scene — 3D text labels collide
              with the axis labels as soon as you orbit. Disc tint is the key. */}
          <Flex
            position="absolute"
            bottom={3}
            left={4}
            right={4}
            direction={{ base: "column", sm: "row" }}
            gap={{ base: 1, sm: 5 }}
            pointerEvents="none"
          >
            {[
              { tint: STAGE_TINTS.source, cap: "SOURCE", conv: c.from },
              { tint: STAGE_TINTS.target, cap: "TARGET", conv: c.to },
            ].map((st) => (
              <Flex key={st.cap} align="center" gap={2} minW={0}>
                <Box w="7px" h="7px" borderRadius="full" bg={st.tint} flexShrink={0} boxShadow={`0 0 8px ${st.tint}`} />
                <Text fontFamily={MONO} fontSize="9.5px" color="whiteAlpha.400" letterSpacing="0.12em" flexShrink={0}>
                  {st.cap}
                </Text>
                <Text fontFamily={MONO} fontSize="10.5px" color="whiteAlpha.800" noOfLines={1}>
                  {st.conv.name} · {st.conv.code}
                </Text>
              </Flex>
            ))}
          </Flex>
        </Panel>

        {/* ── results ── */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
          <Panel>
            <Label>AXIS MAP — T, WHERE p_target = T · p_source</Label>
            <Box mt={2}>
              <MatrixView m={c.T} integer />
            </Box>
            <Box mt={3.5}>
              <Row
                k={`point (${s.point.map((n) => clean(n, 3)).join(", ")})`}
                v={`→ (${c.pointTo.map((n) => clean(n, 3)).join(", ")})`}
                tone={ACCENT}
              />
              <Row k="handedness" v="right-handed, det(T) = +1" />
            </Box>
            <Text mt={3} fontSize="11.5px" lineHeight={1.6} color="whiteAlpha.500">
              This part is never ambiguous. Points, translations and any direction vector go
              through T and nothing else.
            </Text>
          </Panel>

          <Panel>
            <Label>BOX HEADING — WHAT A LABEL FILE MEANS</Label>
            <Box mt={1}>
              <Row k={`${c.from.headingName} in ${c.from.label}`} v={`${degFrom}°`} />
              <Row k={`${c.to.headingName} in ${c.to.label}`} v={`${degTo}°`} tone={ACCENT} />
              <Row
                k="relation"
                v={`${c.to.headingName} = ${c.relation.sign === 1 ? "" : "−"}${c.from.headingName}${
                  fmtAngleExact(c.relation.offset) === "0"
                    ? ""
                    : fmtAngleExact(c.relation.offset).startsWith("-")
                    ? ` − ${fmtAngleExact(c.relation.offset).slice(1)}`
                    : ` + ${fmtAngleExact(c.relation.offset)}`
                }`}
                tone={CYAN}
              />
            </Box>
            <Text mt={3} fontSize="11.5px" lineHeight={1.6} color="whiteAlpha.500">
              Derived by carrying the physical facing direction across, not from a table. A box&apos;s
              geometry does not get relabeled when you change frames.
            </Text>
          </Panel>
        </SimpleGrid>

        {/* ── the divergence: the actual reason this tool exists ── */}
        {c.diverges && (
          <Panel mt={4} borderColor="rgba(255,180,84,0.35)" bg="rgba(28,20,6,0.5)">
            <Flex align="center" gap={2} mb={2}>
              <Box w="6px" h="6px" borderRadius="full" bg={WARN} />
              <Text fontFamily={MONO} fontSize="10px" letterSpacing="0.16em" color={WARN}>
                THESE TWO FRAMES DISAGREE ABOUT +X — SO THERE ARE TWO ANSWERS
              </Text>
            </Flex>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={2}>
              <Box>
                <Text fontFamily={MONO} fontSize="10px" color="whiteAlpha.550" mb={1}>
                  A POSE / EXTRINSIC → {clean(toDeg(c.headingToAsPose), 3)}°
                </Text>
                <Text fontSize="11.5px" lineHeight={1.6} color="whiteAlpha.600">
                  <Box as="code" fontFamily={MONO} color={CYAN}>
                    T · R · Tᵀ
                  </Box>
                  . A sensor→vehicle transform really does get its body axes relabeled, so this is
                  the right one for calibration and poses.
                </Text>
              </Box>
              <Box>
                <Text fontFamily={MONO} fontSize="10px" color="whiteAlpha.550" mb={1}>
                  A BOX LABEL → {degTo}°
                </Text>
                <Text fontSize="11.5px" lineHeight={1.6} color="whiteAlpha.600">
                  The car keeps pointing where it points. This is the right one for annotations and
                  detections.
                </Text>
              </Box>
            </SimpleGrid>
            <Text mt={3} fontSize="11.5px" color={WARN} fontFamily={MONO}>
              Picking the wrong one here is a {Math.abs(gap)}° error — and it looks plausible in a plot.
            </Text>
          </Panel>
        )}

        {/* ── rotation readouts ── */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mt={4}>
          <Panel>
            <Label>ROTATION RE-EXPRESSED — R_target = T · R_source · Tᵀ</Label>
            <Box mt={2}>
              <MatrixView m={c.Rto} />
            </Box>
          </Panel>
          <Panel>
            <Label>SAME ROTATION, OTHER REPRESENTATIONS</Label>
            <Box mt={1}>
              <Row k="quaternion in (w,x,y,z)" v={c.quatFrom.map((n) => fmt(n, 5)).join("  ")} />
              <Row k="quaternion out (w,x,y,z)" v={c.quatTo.map((n) => fmt(n, 5)).join("  ")} tone={ACCENT} />
              <Row
                k="euler out (roll,pitch,yaw)"
                v={c.eulerTo.map((n) => `${clean(toDeg(n), 3)}°`).join("  ")}
              />
            </Box>
            <Text mt={3} fontSize="11.5px" lineHeight={1.6} color="whiteAlpha.500">
              Quaternions print with w ≥ 0 so the same orientation always shows the same numbers —
              q and −q are the same rotation.
            </Text>
          </Panel>
        </SimpleGrid>

        {/* ── code ── */}
        <Panel mt={4}>
          <Flex justify="space-between" align="center" mb={2} gap={3}>
            <Label>PYTHON</Label>
            <Flex gap={2}>
              <Box
                as="button"
                type="button"
                onClick={() => copy(code, "code")}
                fontFamily={MONO}
                fontSize="10px"
                fontWeight={700}
                px={2.5}
                py="4px"
                borderRadius="5px"
                border="1px solid"
                borderColor={ACCENT}
                bg="rgba(201,255,77,0.1)"
                color={ACCENT}
                _hover={{ bg: "rgba(201,255,77,0.2)" }}
                _focusVisible={{ outline: "2px solid", outlineColor: CYAN, outlineOffset: "2px" }}
              >
                {copied === "code" ? "COPIED ✓" : "COPY"}
              </Box>
              <Box
                as="button"
                type="button"
                onClick={() =>
                  copy(`${window.location.origin}/tools/coordinate-frames?s=${encodeState(s)}`, "link")
                }
                fontFamily={MONO}
                fontSize="10px"
                fontWeight={700}
                px={2.5}
                py="4px"
                borderRadius="5px"
                border="1px solid"
                borderColor="whiteAlpha.250"
                color="whiteAlpha.800"
                _hover={{ borderColor: ACCENT, color: ACCENT }}
                _focusVisible={{ outline: "2px solid", outlineColor: CYAN, outlineOffset: "2px" }}
              >
                {copied === "link" ? "LINK COPIED ✓" : "SHARE ↗"}
              </Box>
            </Flex>
          </Flex>
          <Box
            as="pre"
            overflowX="auto"
            fontFamily={MONO}
            fontSize={{ base: "10.5px", md: "11.5px" }}
            lineHeight={1.7}
            color="whiteAlpha.850"
            bg="rgba(2,5,10,0.65)"
            border="1px solid"
            borderColor="whiteAlpha.100"
            borderRadius="8px"
            p={3.5}
            sx={{ whiteSpace: "pre" }}
          >
            {code}
          </Box>
        </Panel>

        {/* ── provenance ── */}
        <Panel mt={4}>
          <Label>WHERE THESE DEFINITIONS COME FROM</Label>
          <Box mt={2}>
            {[c.from, c.to]
              .filter((v, i, arr) => arr.indexOf(v) === i)
              .map((conv) => (
                <Box key={conv.id} py={1.5} borderBottom="1px solid" borderColor="whiteAlpha.50">
                  <Text fontFamily={MONO} fontSize="10.5px" color={ACCENT}>
                    {conv.name} · {conv.code}
                  </Text>
                  <Text fontSize="11.5px" color="whiteAlpha.550" mt="2px" lineHeight={1.55}>
                    {conv.source}
                  </Text>
                </Box>
              ))}
          </Box>
          <Text mt={3} fontSize="11.5px" lineHeight={1.65} color="whiteAlpha.500">
            The KITTI and nuScenes axes were pinned from{" "}
            <Box as="span" color="whiteAlpha.700" fontFamily={MONO}>
              nuscenes-devkit/export_kitti.py
            </Box>{" "}
            rather than from prose — it asserts the velodyne→camera rotation outright, and defines
            nuScenes LIDAR_TOP as KITTI rotated +90° about z. Everything on this page is derived
            from those axis definitions; no pairwise formula is hard-coded.
          </Text>
        </Panel>

        {/* ── to the writing ── */}
        <Flex mt={6} gap={3} direction={{ base: "column", sm: "row" }}>
          {[
            { href: "/posts/av-3d-geometry", t: "3D 기하 기초 — 좌표계·회전·yaw, 그리고 쿼터니언" },
            { href: "/posts/av-calibration", t: "센서 캘리브레이션 — 좌표계를 맞추지 못하면" },
          ].map((l) => (
            <Box
              key={l.href}
              as={NextLink}
              href={l.href}
              flex="1"
              bg={PANEL}
              border="1px solid"
              borderColor={BORDER}
              borderRadius="12px"
              p={4}
              transition="border-color 0.2s ease"
              _hover={{ borderColor: ACCENT, textDecoration: "none" }}
            >
              <Text fontFamily={MONO} fontSize="9px" letterSpacing="0.16em" color={CYAN} mb={1.5}>
                왜 이렇게 되는지 ↗
              </Text>
              <Text fontSize="13px" color="whiteAlpha.850" lineHeight={1.5}>
                {l.t}
              </Text>
            </Box>
          ))}
        </Flex>

        <Text mt={6} fontSize="11.5px" color="whiteAlpha.400" lineHeight={1.6}>
          Runs entirely in your browser — nothing is uploaded, and the URL carries the whole state,
          so a shared link reproduces exactly what you are looking at. Found a convention that is
          wrong or missing?{" "}
          <Box as="a" href="mailto:0biglife@gmail.com?subject=Coordinate%20frame%20converter" color={ACCENT}>
            tell me
          </Box>
          .
        </Text>
      </Box>
    </Box>
  );
}

# /lab → 3D Studio (design)

**Date:** 2026-07-24
**Status:** implemented + deployed

## Problem

`/lab` was a static "orbit a helmet" GLB viewer — visually nice but **no function**.
Goal: make it genuinely interactive/innovative and, honestly, useful to the blog's
real goals (DE-repositioning portfolio + a soft side-income hook) without spinning
up a new project or turning the blog into a SaaS.

## Decision

Turn `/lab` into a **3D Studio**: the visitor is the director. This is the option
that best serves "fun (2) + revenue (3)" because the experience *is* the
commissionable thing — a mini product-viewer/configurator — so the soft CTA lands
with proof. Client-side only (no backend, no paid API), so scope stays contained.

Rejected: bring-your-own-model upload (needs storage + image→3D paid API),
physics playground (fun but doesn't read as "a service a brand would commission").

## What the visitor controls

- **Model** — GEM (procedural icosahedron) · HELMET (DamagedHelmet) · DUCK (glTF
  mascot, 120 kB so it loads instantly). Heavy models (BoomBox 10 MB, WaterBottle
  9 MB) were rejected for load time.
- **Finish** — ORIGINAL · MATTE · METAL · GLASS (transmission) · HOLO (lime
  emissive) · WIRE. Applied non-destructively (pristine base clone + reusable
  override + shared glass material) so swaps never leak state between models.
- **Environment** — STUDIO · NIGHT · LIME (Lightformer IBL presets, no external HDR).
- **FX · Motion** — SCANLINE, GRAIN (CSS overlays), SPIN (auto-rotate).

## Signature features

- **Shareable scene** — the full config serializes to a single `?s=` query param
  (`helmet~metal~lime~101`), round-tripped via `history.replaceState`. SHARE copies
  a link that reproduces the exact scene. No backend — the URL *is* the state.
- **SAVE PNG** — `gl.domElement.toDataURL()` (canvas uses `preserveDrawingBuffer`).
- **Soft CTA** — "이런 인터랙티브 3D, 제품·브랜드에도 → 문의" (mailto). Instrument-panel
  tone, not a shout. Lead-gen for interactive-3D commissions (direct, not brokerage).

## Architecture

Client-only, isolated to the `/lab` route (ModelLab is not used anywhere else):
- `studioConfig.ts` — presets (MODELS/MATERIALS/ENVS) + `encodeState`/`decodeState`.
- `LabCanvas.tsx` — R3F v9 / drei v10 scene: model + material override + env preset
  + `onReady(gl)` for PNG. Mounted client-side only.
- `ModelLab.tsx` — state (from `?s=` on mount), the control console (HUD-styled
  segmented controls), SHARE/PNG/CTA, CSS FX overlays. `mounted` guard keeps the
  WebGL canvas off SSR (Amplify mishandles `ssr:false`).

## Verification

typecheck + next build (35 pages, /lab 4.88 kB) + headless-Chrome (swiftshader)
render checks across model/finish/env/URL-state combinations; console shows only
swiftshader ReadPixels perf notes (no JS/React errors). No side-effects: ModelLab
is `/lab`-only; the landing switcher embeds the topology iframe, untouched.

## Not now (YAGNI)

Physics, exploded-view annotations, real postprocessing bloom (kept CSS FX to avoid
an R3F-ecosystem dep after the React-19/R3F-v8 crash), and model upload.

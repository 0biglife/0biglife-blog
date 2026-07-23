// Presets + shareable URL state for the /lab "3D studio".
//
// Everything the visitor changes (model, material finish, environment, atmosphere
// toggles, motion) is captured here and round-tripped through a single `?s=`
// query param — so a shared link reproduces the exact scene, no backend.

export type ModelId = "gem" | "helmet" | "duck";
export type MaterialMode = "original" | "matte" | "metal" | "glass" | "holo" | "wire";
export type EnvMode = "studio" | "night" | "lime";

export interface StudioState {
  model: ModelId;
  material: MaterialMode;
  env: EnvMode;
  scanline: boolean;
  grain: boolean;
  autoRotate: boolean;
}

export const MODELS: { id: ModelId; label: string; url: string }[] = [
  { id: "gem", label: "GEM", url: "" }, // procedural — no download
  { id: "helmet", label: "HELMET", url: "/models/lab-model.glb" },
  { id: "duck", label: "DUCK", url: "/models/duck.glb" },
];

export const MATERIALS: { id: MaterialMode; label: string }[] = [
  { id: "original", label: "ORIGINAL" },
  { id: "matte", label: "MATTE" },
  { id: "metal", label: "METAL" },
  { id: "glass", label: "GLASS" },
  { id: "holo", label: "HOLO" },
  { id: "wire", label: "WIRE" },
];

export const ENVS: { id: EnvMode; label: string }[] = [
  { id: "studio", label: "STUDIO" },
  { id: "night", label: "NIGHT" },
  { id: "lime", label: "LIME" },
];

export const DEFAULT_STATE: StudioState = {
  model: "helmet",
  material: "original",
  env: "studio",
  scanline: false,
  grain: true,
  autoRotate: true,
};

const MODEL_IDS = MODELS.map((m) => m.id);
const MATERIAL_IDS = MATERIALS.map((m) => m.id);
const ENV_IDS = ENVS.map((e) => e.id);

function oneOf<T extends string>(v: string, allowed: T[], fallback: T): T {
  return (allowed as string[]).includes(v) ? (v as T) : fallback;
}

/** state → "helmet~metal~lime~101" (model~material~env~[scan][grain][rotate]) */
export function encodeState(s: StudioState): string {
  const flags = `${s.scanline ? 1 : 0}${s.grain ? 1 : 0}${s.autoRotate ? 1 : 0}`;
  return [s.model, s.material, s.env, flags].join("~");
}

export function decodeState(raw: string | null | undefined): StudioState {
  if (!raw) return { ...DEFAULT_STATE };
  const [model, material, env, flags] = raw.split("~");
  const f = (flags ?? "").padEnd(3, "-");
  return {
    model: oneOf(model ?? "", MODEL_IDS, DEFAULT_STATE.model),
    material: oneOf(material ?? "", MATERIAL_IDS, DEFAULT_STATE.material),
    env: oneOf(env ?? "", ENV_IDS, DEFAULT_STATE.env),
    scanline: f[0] === "1",
    grain: f[1] === "1" || !flags, // default grain on when unspecified
    autoRotate: f[2] === "1" || !flags,
  };
}

export function modelUrl(id: ModelId): string {
  return MODELS.find((m) => m.id === id)?.url ?? "";
}

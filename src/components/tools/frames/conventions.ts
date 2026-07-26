/**
 * Coordinate-frame conventions used across autonomous-driving datasets, plus the
 * math to carry a rotation from one to another.
 *
 * Everything is expressed against a single internal reference: FLU — x forward,
 * y left, z up (the ROS REP-103 body frame). A convention is then just "which
 * physical direction does each of my own axes point in", written in FLU
 * components. Change of basis falls out of that, so no pairwise formula is
 * hand-written anywhere in here — the KITTI/nuScenes/Waymo relations are derived,
 * not typed in from memory.
 *
 * The two conventions most often mis-stated online were pinned from code rather
 * than prose, both in nuscenes-devkit's export_kitti.py:
 *   - `assert velo_to_cam_rot == [[0,-1,0],[0,0,-1],[1,0,0]]`
 *     ⇒ KITTI velodyne is x-forward/y-left/z-up, KITTI camera is x-right/y-down/z-forward.
 *   - `kitti_to_nu_lidar = Quaternion(axis=(0,0,1), angle=+pi/2)`
 *     ⇒ nuScenes LIDAR_TOP is x-right, y-forward, z-up.
 */

export type Vec3 = [number, number, number];
/** Row-major: M[r][c]. */
export type Mat3 = [Vec3, Vec3, Vec3];

// Physical directions, in FLU components.
const F: Vec3 = [1, 0, 0];
const B: Vec3 = [-1, 0, 0];
const L: Vec3 = [0, 1, 0];
const R: Vec3 = [0, -1, 0];
const U: Vec3 = [0, 0, 1];
const D: Vec3 = [0, 0, -1];

export type ConventionId =
  | "ros_flu"
  | "kitti_velo"
  | "kitti_cam"
  | "nuscenes_ego"
  | "nuscenes_lidar"
  | "waymo_vehicle"
  | "cam_optical";

export interface Convention {
  id: ConventionId;
  /** Short label for the segmented control. */
  label: string;
  /** Full name shown in readouts and generated code. */
  name: string;
  /** e.g. "FLU" / "RDF" — the axis mnemonic. */
  code: string;
  /** Where each of this frame's own axes points, in FLU components. */
  axes: { x: Vec3; y: Vec3; z: Vec3 };
  /** What this convention calls its planar rotation (yaw / rotation_y / heading). */
  headingName: string;
  /** One-line description of the heading definition, for the readout. */
  headingNote: string;
  /** Where the convention is defined, for the citations block. */
  source: string;
  /** Python identifier used in the generated snippet. */
  slug: string;
}

export const CONVENTIONS: Convention[] = [
  {
    id: "ros_flu",
    label: "ROS",
    name: "ROS REP-103 body",
    code: "FLU",
    axes: { x: F, y: L, z: U },
    headingName: "yaw",
    headingNote: "about +z (up), from +x (forward), counter-clockwise",
    source: "ROS REP-103 — body frame is x forward, y left, z up",
    slug: "ros",
  },
  {
    id: "kitti_velo",
    label: "KITTI velo",
    name: "KITTI Velodyne",
    code: "FLU",
    axes: { x: F, y: L, z: U },
    headingName: "yaw",
    headingNote: "about +z (up), from +x (forward), counter-clockwise",
    source: "KITTI object devkit; velo→cam rotation asserted in nuscenes-devkit export_kitti.py",
    slug: "kitti_velo",
  },
  {
    id: "kitti_cam",
    label: "KITTI cam",
    name: "KITTI camera (rect)",
    code: "RDF",
    axes: { x: R, y: D, z: F },
    headingName: "rotation_y",
    headingNote: "about +y (down), from +x (right) — the KITTI label field",
    source: "KITTI object devkit — rotation_y is the rotation about the camera Y axis",
    slug: "kitti_cam",
  },
  {
    id: "nuscenes_ego",
    label: "nuSc ego",
    name: "nuScenes ego / global",
    code: "FLU",
    axes: { x: F, y: L, z: U },
    headingName: "yaw",
    headingNote: "about +z (up), from +x (forward) — devkit quaternion_yaw",
    source: "nuScenes devkit — ego frame is x forward, y left, z up; rotations stored as quaternion w,x,y,z",
    slug: "nuscenes_ego",
  },
  {
    id: "nuscenes_lidar",
    label: "nuSc lidar",
    name: "nuScenes LIDAR_TOP",
    code: "RFU",
    axes: { x: R, y: F, z: U },
    headingName: "yaw",
    headingNote: "about +z (up), from +x (right)",
    source: "Derived from kitti_to_nu_lidar = Quaternion(axis=(0,0,1), angle=+pi/2) in export_kitti.py",
    slug: "nuscenes_lidar",
  },
  {
    id: "waymo_vehicle",
    label: "Waymo",
    name: "Waymo vehicle",
    code: "FLU",
    axes: { x: F, y: L, z: U },
    headingName: "heading",
    headingNote: "about +z (up), from +x (forward), counter-clockwise, wrapped to [-pi, pi)",
    source: "Waymo Open Dataset — vehicle frame x forward, y left, z up; heading rotates +x to the box front face",
    slug: "waymo",
  },
  {
    id: "cam_optical",
    label: "Optical",
    name: "Camera optical (OpenCV / REP-103)",
    code: "RDF",
    axes: { x: R, y: D, z: F },
    headingName: "rotation_y",
    headingNote: "about +y (down), from +x (right)",
    source: "ROS REP-103 optical frame / OpenCV — z forward along the optical axis, x right, y down",
    slug: "cam_optical",
  },
];

export const byId = (id: ConventionId): Convention =>
  CONVENTIONS.find((c) => c.id === id) ?? CONVENTIONS[0];

const DIR_NAMES: [Vec3, string][] = [
  [F, "forward"], [B, "back"], [L, "left"], [R, "right"], [U, "up"], [D, "down"],
];

/** What this frame's x (0), y (1) or z (2) axis physically points at. */
export function axisRole(c: Convention, i: 0 | 1 | 2): string {
  const v = [c.axes.x, c.axes.y, c.axes.z][i];
  return DIR_NAMES.find(([d]) => d[0] === v[0] && d[1] === v[1] && d[2] === v[2])?.[1] ?? "?";
}

// ── linear algebra ────────────────────────────────────────────────────
// Small and explicit on purpose: three.js is only used for drawing, never for
// producing the numbers this tool reports.

export const mat = (m: number[][]): Mat3 => m as Mat3;

export function matMul(a: Mat3, b: Mat3): Mat3 {
  const out: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
  return mat(out);
}

export function matT(m: Mat3): Mat3 {
  return mat([
    [m[0][0], m[1][0], m[2][0]],
    [m[0][1], m[1][1], m[2][1]],
    [m[0][2], m[1][2], m[2][2]],
  ]);
}

export function matVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}

const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Rows are the convention's own axes, in FLU components: p_conv = M · p_flu. */
export function basis(c: Convention): Mat3 {
  return mat([c.axes.x, c.axes.y, c.axes.z]);
}

/** Change of basis a → b. p_b = T · p_a, and R_b = T · R_a · Tᵀ. */
export function axisMap(a: Convention, b: Convention): Mat3 {
  return matMul(basis(b), matT(basis(a)));
}

/** Re-express a rotation operator in another basis. */
export function convertRotation(R: Mat3, T: Mat3): Mat3 {
  return matMul(matMul(T, R), matT(T));
}

// ── rotation representations ──────────────────────────────────────────

export function quatToMat(w: number, x: number, y: number, z: number): Mat3 {
  const n = Math.hypot(w, x, y, z) || 1;
  const [qw, qx, qy, qz] = [w / n, x / n, y / n, z / n];
  return mat([
    [1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw)],
    [2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw)],
    [2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy)],
  ]);
}

/** Returns [w, x, y, z]. Shepperd's method — stable for every branch. */
export function matToQuat(m: Mat3): [number, number, number, number] {
  const [m00, m01, m02] = m[0];
  const [m10, m11, m12] = m[1];
  const [m20, m21, m22] = m[2];
  const tr = m00 + m11 + m22;
  let w: number, x: number, y: number, z: number;
  if (tr > 0) {
    const s = Math.sqrt(tr + 1) * 2;
    w = 0.25 * s;
    x = (m21 - m12) / s;
    y = (m02 - m20) / s;
    z = (m10 - m01) / s;
  } else if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2;
    w = (m21 - m12) / s;
    x = 0.25 * s;
    y = (m01 + m10) / s;
    z = (m02 + m20) / s;
  } else if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2;
    w = (m02 - m20) / s;
    x = (m01 + m10) / s;
    y = 0.25 * s;
    z = (m12 + m21) / s;
  } else {
    const s = Math.sqrt(1 + m22 - m00 - m11) * 2;
    w = (m10 - m01) / s;
    x = (m02 + m20) / s;
    y = (m12 + m21) / s;
    z = 0.25 * s;
  }
  // canonical sign: keep w >= 0 so the same orientation always prints the same
  return w < 0 ? [-w, -x, -y, -z] : [w, x, y, z];
}

/** Intrinsic Z-Y-X (yaw, then pitch, then roll) — the ROS / Waymo ordering. */
export function eulerToMat(roll: number, pitch: number, yaw: number): Mat3 {
  const [cr, sr] = [Math.cos(roll), Math.sin(roll)];
  const [cp, sp] = [Math.cos(pitch), Math.sin(pitch)];
  const [cy, sy] = [Math.cos(yaw), Math.sin(yaw)];
  return mat([
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ]);
}

/** Inverse of eulerToMat. Returns [roll, pitch, yaw]; gimbal lock folds roll into yaw. */
export function matToEuler(m: Mat3): [number, number, number] {
  const sp = -m[2][0];
  if (sp > 0.999999) return [0, Math.PI / 2, Math.atan2(-m[0][1], m[1][1])];
  if (sp < -0.999999) return [0, -Math.PI / 2, Math.atan2(-m[0][1], m[1][1])];
  return [Math.atan2(m[2][1], m[2][2]), Math.asin(sp), Math.atan2(m[1][0], m[0][0])];
}

/** Rodrigues rotation of `v` about unit axis `k` by `t` radians. */
export function rotateAbout(k: Vec3, t: number, v: Vec3): Vec3 {
  const c = Math.cos(t);
  const s = Math.sin(t);
  const kv = cross(k, v);
  const kd = dot(k, v);
  return [
    v[0] * c + kv[0] * s + k[0] * kd * (1 - c),
    v[1] * c + kv[1] * s + k[1] * kd * (1 - c),
    v[2] * c + kv[2] * s + k[2] * kd * (1 - c),
  ];
}

// ── heading ───────────────────────────────────────────────────────────
// A heading is a *physical direction*, not a number — which is exactly why the
// number changes between conventions. So every heading conversion here goes
// through the direction: angle → direction in frame A → same direction in frame
// B → angle. The KITTI relation rotation_y = -yaw - pi/2 is a consequence of
// this, not an input to it.

/** The frame's own vertical axis (the one parallel to world up/down), in frame coords. */
export function verticalAxis(c: Convention): Vec3 {
  if (Math.abs(c.axes.x[2]) > 0.5) return [1, 0, 0];
  if (Math.abs(c.axes.y[2]) > 0.5) return [0, 1, 0];
  return [0, 0, 1];
}

/** Heading zero-reference: the frame's own +x. Horizontal in every convention here. */
const REF: Vec3 = [1, 0, 0];

/** Direction the object faces, in frame coords, for a given heading angle. */
export function headingToFront(c: Convention, theta: number): Vec3 {
  return rotateAbout(verticalAxis(c), theta, REF);
}

/** Signed angle from +x to `front`, measured about the frame's vertical axis. */
export function frontToHeading(c: Convention, front: Vec3): number {
  const k = verticalAxis(c);
  return Math.atan2(dot(k, cross(REF, front)), dot(REF, front));
}

export const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * How this pair's heading numbers relate: theta_b = sign * theta_a + offset.
 * Both frames' vertical axes are parallel to world up here, so the relation is
 * always affine — recovered by probing the conversion rather than tabulated.
 */
export function headingRelation(a: Convention, b: Convention): { sign: 1 | -1; offset: number } {
  const T = axisMap(a, b);
  const at = (t: number) => frontToHeading(b, matVec(T, headingToFront(a, t)));
  const offset = at(0);
  const quarter = wrapPi(at(Math.PI / 2) - offset);
  return { sign: quarter > 0 ? 1 : -1, offset };
}

// ── formatting ────────────────────────────────────────────────────────

/** -0 and 1e-17 are noise from float math; show them as clean zeros. */
export const clean = (n: number, dp = 6): number => {
  const r = Number(n.toFixed(dp));
  return Object.is(r, -0) ? 0 : r;
};

export const fmt = (n: number, dp = 6): string => clean(n, dp).toFixed(dp);

/** "-pi/2", "pi", "0" … for angles that land on a quarter turn; else radians. */
export function fmtAngleExact(a: number): string {
  const q = wrapPi(a) / (Math.PI / 2);
  const nearest = Math.round(q);
  if (Math.abs(q - nearest) > 1e-9) return `${clean(a, 6)}`;
  const n = ((nearest % 4) + 4) % 4;
  return ["0", "pi/2", "pi", "-pi/2"][n];
}

export const toDeg = (r: number) => (r * 180) / Math.PI;
export const toRad = (d: number) => (d * Math.PI) / 180;

// ── shareable URL state ───────────────────────────────────────────────

export type InputMode = "quat" | "euler" | "heading";

export interface FrameState {
  from: ConventionId;
  to: ConventionId;
  mode: InputMode;
  /** quaternion w,x,y,z */
  quat: [number, number, number, number];
  /** roll, pitch, yaw in degrees */
  euler: [number, number, number];
  /** heading in degrees */
  heading: number;
  /** a sample point in the source frame */
  point: Vec3;
}

export const DEFAULT_STATE: FrameState = {
  from: "nuscenes_lidar",
  to: "kitti_cam",
  mode: "heading",
  quat: [1, 0, 0, 0],
  euler: [0, 0, 0],
  heading: 30,
  point: [1, 0, 0],
};

const num = (s: string | undefined, fallback: number) => {
  const v = Number(s);
  return Number.isFinite(v) ? v : fallback;
};

/** state → "nuscenes_lidar.kitti_cam.heading.30~1,0,0,0~0,0,0~1,0,0" */
export function encodeState(s: FrameState): string {
  return [
    `${s.from}.${s.to}.${s.mode}.${clean(s.heading, 4)}`,
    s.quat.map((n) => clean(n, 6)).join(","),
    s.euler.map((n) => clean(n, 4)).join(","),
    s.point.map((n) => clean(n, 4)).join(","),
  ].join("~");
}

export function decodeState(raw: string | null | undefined): FrameState {
  if (!raw) return { ...DEFAULT_STATE };
  const [head, q, e, p] = raw.split("~");
  const [from, to, mode, heading] = (head ?? "").split(".");
  const ids = CONVENTIONS.map((c) => c.id) as string[];
  const qs = (q ?? "").split(",");
  const es = (e ?? "").split(",");
  const ps = (p ?? "").split(",");
  return {
    from: ids.includes(from) ? (from as ConventionId) : DEFAULT_STATE.from,
    to: ids.includes(to) ? (to as ConventionId) : DEFAULT_STATE.to,
    mode: (["quat", "euler", "heading"] as string[]).includes(mode)
      ? (mode as InputMode)
      : DEFAULT_STATE.mode,
    heading: num(heading, DEFAULT_STATE.heading),
    quat: [num(qs[0], 1), num(qs[1], 0), num(qs[2], 0), num(qs[3], 0)],
    euler: [num(es[0], 0), num(es[1], 0), num(es[2], 0)],
    point: [num(ps[0], 1), num(ps[1], 0), num(ps[2], 0)],
  };
}

// ── the actual conversion ─────────────────────────────────────────────

export interface Conversion {
  from: Convention;
  to: Convention;
  /** basis change, p_to = T · p_from */
  T: Mat3;
  /** the input rotation, in the source frame */
  Rfrom: Mat3;
  /** the same rotation operator, re-expressed in the target basis: T · R · Tᵀ */
  Rto: Mat3;
  quatFrom: [number, number, number, number];
  quatTo: [number, number, number, number];
  eulerTo: [number, number, number];
  headingFrom: number;
  /** heading of the physical facing direction, read in the target frame */
  headingTo: number;
  /**
   * Heading you would read off Rto by treating its +x column as the facing
   * direction. Differs from `headingTo` whenever the two frames disagree about
   * which axis means "forward" — see `diverges`.
   */
  headingToAsPose: number;
  /**
   * True when the pose reading and the label reading disagree. Not a bug: a
   * sensor→vehicle extrinsic really does get its body axes relabeled by a basis
   * change, while a box's physical geometry does not. Same input, two different
   * questions.
   */
  diverges: boolean;
  relation: { sign: 1 | -1; offset: number };
  pointTo: Vec3;
  /** the facing direction, in FLU — what the 3D view draws */
  frontFlu: Vec3;
  /** the input orientation expressed in FLU, so the 3D view can show roll/pitch too */
  Rflu: Mat3;
}

export function convert(s: FrameState): Conversion {
  const from = byId(s.from);
  const to = byId(s.to);
  const T = axisMap(from, to);

  const Rfrom =
    s.mode === "quat"
      ? quatToMat(s.quat[0], s.quat[1], s.quat[2], s.quat[3])
      : s.mode === "euler"
      ? eulerToMat(toRad(s.euler[0]), toRad(s.euler[1]), toRad(s.euler[2]))
      : rotationFromHeading(from, toRad(s.heading));

  const Rto = convertRotation(Rfrom, T);

  // Heading is read off the facing direction, so it stays meaningful even when
  // the input carries roll/pitch that no single angle could describe.
  const frontFrom = matVec(Rfrom, REF);
  const headingFrom = frontToHeading(from, frontFrom);
  const frontTo = matVec(T, frontFrom);
  const headingTo = frontToHeading(to, frontTo);
  const headingToAsPose = frontToHeading(to, matVec(Rto, REF));

  return {
    from,
    to,
    T,
    Rfrom,
    Rto,
    quatFrom: matToQuat(Rfrom),
    quatTo: matToQuat(Rto),
    eulerTo: matToEuler(Rto),
    headingFrom,
    headingTo,
    headingToAsPose,
    diverges: Math.abs(wrapPi(headingToAsPose - headingTo)) > 1e-9,
    relation: headingRelation(from, to),
    pointTo: matVec(T, s.point),
    frontFlu: matVec(matT(basis(from)), frontFrom),
    Rflu: matMul(matMul(matT(basis(from)), Rfrom), basis(from)),
  };
}

/** Pure heading input: a rotation about the frame's vertical axis, no roll/pitch. */
function rotationFromHeading(c: Convention, theta: number): Mat3 {
  const k = verticalAxis(c);
  const e0 = rotateAbout(k, theta, [1, 0, 0]);
  const e1 = rotateAbout(k, theta, [0, 1, 0]);
  const e2 = rotateAbout(k, theta, [0, 0, 1]);
  // columns are the rotated basis vectors
  return mat([
    [e0[0], e1[0], e2[0]],
    [e0[1], e1[1], e2[1]],
    [e0[2], e1[2], e2[2]],
  ]);
}

// ── generated code ────────────────────────────────────────────────────

export function pythonSnippet(c: Conversion): string {
  const row = (r: Vec3) => `[${r.map((n) => (clean(n) === 0 ? " 0." : clean(n) > 0 ? " 1." : "-1.")).join(", ")}]`;
  const { sign, offset } = c.relation;
  const off = fmtAngleExact(offset);
  const term =
    off === "0"
      ? ""
      : off.startsWith("-")
      ? ` - ${off.slice(1) === "pi" ? "np.pi" : `np.pi/${off.split("/")[1]}`}`
      : ` + ${off === "pi" ? "np.pi" : `np.pi/${off.split("/")[1]}`}`;
  const lhs = `${sign === 1 ? "" : "-"}${c.from.headingName}`;

  const divergence = c.diverges
    ? `
# NOTE: these two answers differ for this pair, and that is not a mistake.
# ${c.from.name} calls +x "${axisRole(c.from, 0)}", ${c.to.name} calls it "${axisRole(c.to, 0)}".
# A sensor->vehicle extrinsic really does get its body axes relabeled by T, so
# T @ R @ T.T is right for poses. A box's physical geometry does NOT get
# relabeled, so use the heading formula for labels. Picking the wrong one here
# is the ${clean(toDeg(wrapPi(c.headingToAsPose - c.headingTo)), 1)} deg error.
`
    : "";

  return `import numpy as np

# ${c.from.name} (${c.from.code})  ->  ${c.to.name} (${c.to.code})
T = np.array([
    ${row(c.T[0])},
    ${row(c.T[1])},
    ${row(c.T[2])},
])

# 1. points, translations, and any direction vector
p_${c.to.slug} = T @ p_${c.from.slug}

# 2. poses / extrinsics — re-express the rotation operator in the new basis
R_${c.to.slug} = T @ R_${c.from.slug} @ T.T

# 3. box labels — carry the physical facing direction across
#    ${c.from.headingName}: ${c.from.headingNote}
#    ${c.to.headingName}: ${c.to.headingNote}
${c.to.headingName} = ${lhs}${term}
${c.to.headingName} = np.arctan2(np.sin(${c.to.headingName}), np.cos(${c.to.headingName}))  # wrap to [-pi, pi)
${divergence}`;
}

// Scene-data schema for the autonomous-perception hero.
//
// The shape mirrors how a real AV log stores a frame: an ego pose, a list of
// tracked agents (stable ids, class, box dims, velocity, detection score) and a
// planned trajectory. Everything the HUD prints is read from here — the numbers
// are produced by the simulation, never hard-coded.

export type AgentType = "car" | "truck" | "pedestrian" | "cyclist";

/** A tracked object in the ego frame. +z is straight ahead, +x is to the right. */
export interface Agent {
  id: number;
  type: AgentType;
  /** lateral position on the road, meters (0 = road centerline) */
  x: number;
  /** longitudinal position, meters ahead of ego */
  z: number;
  /** yaw in radians, 0 = facing +z (same heading as ego) */
  heading: number;
  /** lateral velocity, m/s */
  vx: number;
  /** longitudinal velocity RELATIVE to ego, m/s (closing rate) */
  vz: number;
  /** absolute longitudinal speed, m/s */
  vzAbs: number;
  /** bounding-box dims, meters */
  w: number;
  l: number;
  h: number;
  /** detection confidence 0..1 */
  confidence: number;
  /** frames this id has been tracked */
  trackAge: number;
}

export interface EgoState {
  /** lateral position on the road, meters */
  x: number;
  /** speed, m/s */
  speed: number;
  /** small yaw used for visual banking, radians */
  heading: number;
  /** planned path ahead, ego frame, nearest-first */
  plannedPath: { x: number; z: number }[];
}

export interface SceneFrame {
  frameId: number;
  time: number;
  /** longitudinal scroll phase for lane markings, meters */
  roadS: number;
  ego: EgoState;
  agents: Agent[];
}

/** Small summary pushed to the DOM HUD at a throttled rate. */
export interface Telemetry {
  frameId: number;
  speedKmh: number;
  trackCount: number;
  sensorHz: number;
  lidarPoints: number;
  nearestDist: number | null;
  mode: "replay" | "drive";
}

/** Live control input, mutated in place by the drive controls. */
export interface DriveInput {
  /** -1 (brake) .. +1 (throttle) */
  throttle: number;
  /** -1 (left) .. +1 (right) */
  steer: number;
}

export interface SceneQuality {
  maxAgents: number;
  lidarPoints: number;
  /** rebuild the lidar cloud every N frames (1 = every frame) */
  lidarStride: number;
  bloom: boolean;
}

// ---- road geometry (shared by sim + renderer) ----------------------------
export const LANE_W = 3.6;
export const LANE_COUNT = 3;
/** lane center x for lane index 0..LANE_COUNT-1 */
export const laneCenter = (i: number): number => (i - (LANE_COUNT - 1) / 2) * LANE_W;
export const ROAD_HALF = (LANE_COUNT / 2) * LANE_W; // outer edge x
export const RANGE_FRONT = 78; // meters simulated ahead
export const RANGE_BACK = 34; // meters simulated behind

export const CLASS_COLOR: Record<AgentType, string> = {
  car: "#5ec8ff",
  truck: "#ffcf5e",
  pedestrian: "#ff5ea8",
  cyclist: "#7cff9e",
};

export const ACCENT = "#c8ff5e"; // ego / planned path / CTA
export const STATUS = "#7cff9e";
export const BG = "#05070a";

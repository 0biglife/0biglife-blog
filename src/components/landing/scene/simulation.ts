// Deterministic driving-scene simulation.
//
// Produces a fresh SceneFrame every step. Everything keeps to its own space so
// the scene is physically plausible: vehicles drive in the lanes, cyclists ride
// the right-side bike lane, pedestrians walk the sidewalks and only step onto
// the carriageway at crosswalks. In the ego frame ego stays at z=0 (the world
// scrolls past in z) but carries a real lateral x so it can change lanes.

import {
  Agent,
  AgentType,
  BIKE_HALF,
  BIKE_X,
  CROSSWALK_SPACING,
  DriveInput,
  EgoState,
  laneCenter,
  LANE_COUNT,
  RANGE_BACK,
  RANGE_FRONT,
  ROAD_HALF,
  SceneFrame,
  SIDEWALK_HALF,
  SIDEWALK_L,
  SIDEWALK_R,
} from "./sceneTypes";

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// pressing "right" should move the ego to screen-right; the chase camera looks
// down +z, where world +x is on screen-LEFT, so steering maps to -x.
const STEER_SIGN = -1;

interface Dims {
  w: number;
  l: number;
  h: number;
  vMin: number;
  vMax: number;
  conf: number;
}
const DIMS: Record<AgentType, Dims> = {
  car: { w: 1.9, l: 4.6, h: 1.5, vMin: 12, vMax: 24, conf: 0.94 },
  truck: { w: 2.5, l: 9.2, h: 3.3, vMin: 9, vMax: 16, conf: 0.96 },
  cyclist: { w: 0.7, l: 1.8, h: 1.7, vMin: 4, vMax: 7, conf: 0.87 },
  pedestrian: { w: 0.6, l: 0.6, h: 1.75, vMin: 0.9, vMax: 1.7, conf: 0.83 },
};

export class SceneSim {
  frameId = 0;
  time = 0;
  roadS = 0;
  ego: EgoState;
  agents: Agent[] = [];

  private rng: () => number;
  private nextId = 1;
  private maxAgents: number;
  private egoTargetLane = 1;
  private egoSpeedTarget = 15.5; // m/s
  private egoLaneTimer = 5;
  private egoSpeedTimer = 4;
  private plannedPath: { x: number; z: number }[] = [];

  constructor(seed = 0x1a2b3c, maxAgents = 22) {
    this.rng = mulberry32(seed);
    this.maxAgents = maxAgents;
    this.ego = { x: 0, speed: 15.5, heading: 0, plannedPath: this.plannedPath };
    for (let i = 0; i < maxAgents; i++) {
      const z = lerp(-RANGE_BACK * 0.8, RANGE_FRONT * 0.9, this.rng());
      this.spawn(z);
    }
  }

  private pickType(): AgentType {
    const r = this.rng();
    if (r < 0.58) return "car";
    if (r < 0.72) return "truck";
    if (r < 0.85) return "cyclist";
    return "pedestrian";
  }

  /** relative z of the next crosswalk ahead (world-fixed, scrolls with roadS) */
  private crosswalkAheadZ(): number {
    const S = CROSSWALK_SPACING;
    const m = Math.ceil((this.roadS + 22) / S);
    return m * S - this.roadS; // in [22, 22 + S)
  }

  private spawn(atZ?: number): void {
    if (this.agents.length >= this.maxAgents) return;
    const type = this.pickType();
    const d = DIMS[type];
    let z =
      atZ ??
      (this.rng() < 0.68 ? RANGE_FRONT - this.rng() * 10 : -RANGE_BACK + this.rng() * 6);

    let x: number;
    let vx = 0;
    let vzAbs: number;
    let heading = 0;

    if (type === "pedestrian") {
      if (this.rng() < 0.26) {
        // crossing the carriageway — only at a crosswalk
        const fromLeft = this.rng() < 0.5;
        x = fromLeft ? SIDEWALK_L : SIDEWALK_R;
        vx = (fromLeft ? 1 : -1) * lerp(1.1, 1.7, this.rng());
        vzAbs = 0;
        heading = vx > 0 ? Math.PI / 2 : -Math.PI / 2;
        z = this.crosswalkAheadZ();
      } else {
        // strolling a sidewalk (either direction)
        const right = this.rng() < 0.5;
        x =
          (right ? SIDEWALK_R : SIDEWALK_L) +
          lerp(-SIDEWALK_HALF, SIDEWALK_HALF, this.rng()) * 0.8;
        vzAbs = (this.rng() < 0.5 ? 1 : -1) * lerp(d.vMin, d.vMax, this.rng());
        heading = vzAbs >= 0 ? 0 : Math.PI;
      }
    } else if (type === "cyclist") {
      x = BIKE_X + lerp(-BIKE_HALF, BIKE_HALF, this.rng()) * 0.6;
      vzAbs = lerp(d.vMin, d.vMax, this.rng());
    } else {
      const lane = Math.floor(this.rng() * LANE_COUNT);
      x = laneCenter(lane) + lerp(-0.3, 0.3, this.rng());
      vzAbs = lerp(d.vMin, d.vMax, this.rng());
    }

    this.agents.push({
      id: this.nextId++,
      type,
      x,
      z,
      heading,
      vx,
      vz: vzAbs - this.ego.speed,
      vzAbs,
      w: d.w,
      l: d.l,
      h: d.h,
      confidence: clamp(d.conf + lerp(-0.04, 0.03, this.rng()), 0.6, 0.99),
      trackAge: 0,
    });
  }

  /** nearest slower vehicle ahead in a lane band around `x`, else null */
  private leadIn(x: number): Agent | null {
    let best: Agent | null = null;
    for (const a of this.agents) {
      if (a.type === "pedestrian" || a.type === "cyclist") continue;
      if (a.z <= 2 || a.z > 40) continue;
      if (Math.abs(a.x - x) > 1.6) continue;
      if (a.vzAbs >= this.ego.speed - 0.5) continue;
      if (!best || a.z < best.z) best = a;
    }
    return best;
  }

  private laneIsClear(lane: number): boolean {
    const cx = laneCenter(lane);
    for (const a of this.agents) {
      if (a.type === "pedestrian" || a.type === "cyclist") continue;
      if (Math.abs(a.x - cx) > 2) continue;
      if (a.z > -8 && a.z < 26) return false;
    }
    return true;
  }

  step(dt: number, input: DriveInput | null): void {
    dt = Math.min(dt, 0.05);
    this.time += dt;
    this.frameId++;

    // ---- ego ----------------------------------------------------------
    if (input) {
      this.egoSpeedTarget = clamp(this.egoSpeedTarget + input.throttle * 14 * dt, 0, 33);
      this.ego.speed = lerp(this.ego.speed, this.egoSpeedTarget, 1 - Math.pow(0.05, dt));
      const steerV = input.steer * 6.5 * STEER_SIGN; // m/s lateral
      this.ego.x = clamp(this.ego.x + steerV * dt, -ROAD_HALF + 1, ROAD_HALF - 1);
      this.ego.heading = lerp(this.ego.heading, input.steer * STEER_SIGN * 0.16, 1 - Math.pow(0.02, dt));
    } else {
      this.egoSpeedTimer -= dt;
      if (this.egoSpeedTimer <= 0) {
        this.egoSpeedTarget = lerp(12.5, 20, this.rng());
        this.egoSpeedTimer = lerp(3.5, 7, this.rng());
      }
      this.egoLaneTimer -= dt;
      const lead = this.leadIn(laneCenter(this.egoTargetLane));
      if (lead && lead.z < 24 && this.egoLaneTimer < 2.5) {
        this.egoSpeedTarget = Math.min(this.egoSpeedTarget, lead.vzAbs + 1.5);
        for (const cand of [this.egoTargetLane - 1, this.egoTargetLane + 1]) {
          if (cand >= 0 && cand < LANE_COUNT && this.laneIsClear(cand)) {
            this.egoTargetLane = cand;
            this.egoLaneTimer = lerp(4, 7, this.rng());
            break;
          }
        }
      }
      if (this.egoLaneTimer <= 0) {
        const cand = clamp(this.egoTargetLane + (this.rng() < 0.5 ? -1 : 1), 0, LANE_COUNT - 1);
        if (this.laneIsClear(cand)) this.egoTargetLane = cand;
        this.egoLaneTimer = lerp(4.5, 8.5, this.rng());
      }
      this.ego.speed = lerp(this.ego.speed, this.egoSpeedTarget, 1 - Math.pow(0.35, dt));
      const targetX = laneCenter(this.egoTargetLane);
      const nx = lerp(this.ego.x, targetX, 1 - Math.pow(0.08, dt));
      this.ego.heading = lerp(this.ego.heading, clamp((this.ego.x - nx) * 6, -0.16, 0.16), 0.2);
      this.ego.x = nx;
    }

    // wrap at a multiple of the crosswalk + dash pitches to avoid a scroll jump
    this.roadS = (this.roadS + this.ego.speed * dt) % 9720;

    // ---- agents -------------------------------------------------------
    const outX = SIDEWALK_R + 4;
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      a.vz = a.vzAbs - this.ego.speed;
      a.z += a.vz * dt;
      a.x += a.vx * dt;
      a.trackAge++;
      a.confidence = clamp(a.confidence + lerp(-0.01, 0.01, this.rng()), 0.55, 0.99);

      if (a.type === "car" || a.type === "truck") {
        const lane = Math.round(a.x / 3.6 + (LANE_COUNT - 1) / 2);
        const cx = laneCenter(clamp(lane, 0, LANE_COUNT - 1));
        a.x = lerp(a.x, cx, 1 - Math.pow(0.6, dt));
      }

      const out =
        a.z > RANGE_FRONT + 6 || a.z < -RANGE_BACK - 6 || Math.abs(a.x) > outX;
      if (out) this.agents.splice(i, 1);
    }

    if (this.agents.length < this.maxAgents && this.rng() < 0.4) this.spawn();

    // ---- planner: smooth trajectory toward the target lane ------------
    const path = this.plannedPath;
    path.length = 0;
    const goalX = input
      ? clamp(this.ego.x + input.steer * STEER_SIGN * 4, -ROAD_HALF + 1, ROAD_HALF - 1)
      : laneCenter(this.egoTargetLane);
    const lead = this.leadIn(this.ego.x);
    for (let s = 0; s <= 20; s++) {
      const z = (s / 20) * 40;
      const k = 1 - Math.pow(1 - s / 20, 2);
      let px = lerp(this.ego.x, goalX, k);
      if (lead && z > lead.z - 8 && z < lead.z + 8) {
        const side = this.ego.x <= lead.x ? -1 : 1;
        px += side * 1.1 * Math.exp(-Math.pow((z - lead.z) / 6, 2));
      }
      path.push({ x: px, z });
    }
    this.ego.plannedPath = path;
  }

  toFrame(): SceneFrame {
    return {
      frameId: this.frameId,
      time: this.time,
      roadS: this.roadS,
      ego: this.ego,
      agents: this.agents,
    };
  }

  nearestDist(): number | null {
    let best: number | null = null;
    for (const a of this.agents) {
      if (a.z < 0) continue;
      const d = Math.hypot(a.x - this.ego.x, a.z);
      if (best === null || d < best) best = d;
    }
    return best;
  }
}

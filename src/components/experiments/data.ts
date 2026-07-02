import type { Variant } from "./ExperimentCanvas";

export interface Experiment {
  id: string;
  variant: Variant;
  title: string;
  tag: string;
  accent: string;
  blurb: string;
}

// Autonomous-driving / perception experiments. Titles + blurbs are technical
// (kept in English); the section chrome is localized via the dictionary.
export const EXPERIMENTS: Experiment[] = [
  {
    id: "bev",
    variant: "bev",
    title: "BEV Occupancy Grid",
    tag: "perception",
    accent: "#c9ff4d",
    blurb:
      "A bird's-eye occupancy grid fused from the sensor stack — free space vs. occupied cells, refreshed every frame as the ego moves through the scene.",
  },
  {
    id: "pcd",
    variant: "pointcloud",
    title: "LiDAR Point Cloud",
    tag: "sensors",
    accent: "#5ce0c0",
    blurb:
      "Raw spinning-LiDAR returns, colored by height, with the beam sweeping the scene. The primitive every downstream perception model consumes.",
  },
  {
    id: "plan",
    variant: "trajectory",
    title: "Trajectory Planner",
    tag: "planning",
    accent: "#c9ff4d",
    blurb:
      "A smooth planned path that bends around detected obstacles while tracking the lane — the bridge from 'what's there' to 'what to do next'.",
  },
  {
    id: "track",
    variant: "tracking",
    title: "Multi-Object Tracking",
    tag: "tracking",
    accent: "#63b3ff",
    blurb:
      "Stable track IDs across frames with motion trails and uncertainty ellipses — associating detections over time so objects don't flicker in and out.",
  },
  {
    id: "fuse",
    variant: "fusion",
    title: "Sensor Fusion",
    tag: "fusion",
    accent: "#ffb95e",
    blurb:
      "Camera, LiDAR and radar fields of view overlaid; detections are confirmed where the modalities agree — the redundancy that makes perception trustworthy.",
  },
  {
    id: "map",
    variant: "lanegraph",
    title: "Lane Graph",
    tag: "HD map",
    accent: "#63b3ff",
    blurb:
      "The road as a routable graph of lane nodes and connections, with a route traversing it — the map layer the planner reasons over.",
  },
];

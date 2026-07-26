import type { Metadata } from "next";
import { FrameConverter } from "@/components/tools/frames";

const TITLE = "Coordinate frame converter — KITTI, nuScenes, Waymo, ROS";
const DESCRIPTION =
  "Convert rotations and headings between autonomous-driving coordinate conventions. KITTI velodyne and camera, nuScenes ego and LIDAR_TOP, Waymo vehicle, ROS REP-103 — with the axis map, the yaw/rotation_y relation, and copyable Python. Runs in the browser.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "coordinate frame converter",
    "nuscenes to kitti",
    "kitti rotation_y",
    "quaternion to yaw",
    "waymo heading",
    "ROS REP-103",
    "LIDAR coordinate system",
    "autonomous driving",
  ],
  alternates: { canonical: "https://www.0biglife.com/tools/coordinate-frames" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.0biglife.com/tools/coordinate-frames",
    type: "website",
  },
};

export default function CoordinateFramesPage() {
  return <FrameConverter />;
}

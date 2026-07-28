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
  // openGraph 를 라우트에서 재정의하면 Next 는 부모(layout)의 images 를 물려주지 않는다.
  // 그래서 이 페이지만 소셜 미리보기가 비어 있었다 — 영어권 공유가 목적인 페이지라
  // 전용 이미지를 굽는다(scripts/make-og-tools.mjs).
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://www.0biglife.com/tools/coordinate-frames",
    type: "website",
    images: [
      {
        url: "/assets/og-coordinate-frames.png",
        width: 1200,
        height: 630,
        alt: "Coordinate frame converter — FLU to RDF axis maps for KITTI, nuScenes, Waymo and ROS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/assets/og-coordinate-frames.png"],
  },
};

export default function CoordinateFramesPage() {
  return <FrameConverter />;
}

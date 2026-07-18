// Purpose-drawn line-icon system for the autonomous-driving experiment domains.
//
// Why hand-authored instead of a generic icon pack: the site's existing chrome
// mixes several react-icons families (Fa filled, Fi outline, Md, Tb…), which
// reads as "assembled" rather than "designed". These six glyphs share one grid
// (24), one stroke (1.5, round caps/joins) and one metaphor language, so a card
// row of them reads as a single instrument panel. All icons inherit `currentColor`
// so a card can tint its glyph with its own accent.
import type { ReactElement, SVGProps } from "react";
import type { Variant } from "@/components/experiments/ExperimentCanvas";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Glyph({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

// BEV occupancy grid — a top-down grid with one occupied cell.
export function IconBev(p: IconProps) {
  return (
    <Glyph {...p}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />
      <rect x="9.6" y="9.6" width="4.8" height="4.8" rx="0.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

// LiDAR point cloud — scattered returns at varied depths.
export function IconPointcloud(p: IconProps) {
  const dots: [number, number, number][] = [
    [6, 8, 1.1], [10, 6, 1.3], [14, 7, 1], [18, 9.5, 1.2],
    [8, 12, 1.3], [12.5, 11, 1], [16.5, 13, 1.2],
    [7, 17, 1], [12, 17.5, 1.3], [17.5, 16.5, 1.1],
  ];
  return (
    <Glyph {...p}>
      {dots.map(([cx, cy, r], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
      ))}
    </Glyph>
  );
}

// Trajectory planner — a smooth path bending past an obstacle, node to node.
export function IconTrajectory(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M4 19C8 19 8 9 12 9s4-4 8-4" />
      <circle cx="4" cy="19" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10.5" cy="15" r="1.4" />
    </Glyph>
  );
}

// Multi-object tracking — a bounding box, center lock and a motion lead.
export function IconTracking(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M8 6.5H6.5V8M17.5 8V6.5H16M16 18.5h1.5V17M6.5 17v1.5H8" />
      <circle cx="12" cy="12.5" r="1.4" fill="currentColor" stroke="none" />
      <path d="M2.5 12.5H5" strokeDasharray="0.5 2.2" />
    </Glyph>
  );
}

// Sensor fusion — three overlapping modality fields agreeing at the center.
export function IconFusion(p: IconProps) {
  return (
    <Glyph {...p}>
      <circle cx="9" cy="10" r="5" />
      <circle cx="15" cy="10" r="5" />
      <circle cx="12" cy="15.5" r="5" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

// Lane graph — routable nodes and the edges the planner reasons over.
export function IconLaneGraph(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M5 6.5l7 3 7-2M12 9.5l-4 7.5M8 17l7.5 1M12 9.5l3.5 8.5" />
      {([[5, 6.5], [12, 9.5], [19, 7.5], [8, 17], [15.5, 18]] as [number, number][]).map(
        ([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="1.5" fill="currentColor" stroke="none" />
        )
      )}
    </Glyph>
  );
}

// Small utility arrow for "open"/external affordances, same stroke language.
export function IconArrowUpRight(p: IconProps) {
  return (
    <Glyph {...p}>
      <path d="M8 16 16 8M9.5 8H16v6.5" />
    </Glyph>
  );
}

export const DOMAIN_ICON: Record<Variant, (p: IconProps) => ReactElement> = {
  bev: IconBev,
  pointcloud: IconPointcloud,
  trajectory: IconTrajectory,
  tracking: IconTracking,
  fusion: IconFusion,
  lanegraph: IconLaneGraph,
};

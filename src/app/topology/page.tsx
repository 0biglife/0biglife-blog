import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Topology",
  description:
    "실시간으로 운영 중인 프로젝트들의 3D 뉴럴 토폴로지 — 어떤 것들을 만들고 운영 중인지 한눈에.",
};

export default function TopologyPage() {
  return (
    <iframe
      src="/pulse/index.html?showcase"
      title="claude-pulse · project topology"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
      }}
    />
  );
}

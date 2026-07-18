import type { Metadata } from "next";
import { ModelLab } from "@/components/lab";

export const metadata: Metadata = {
  title: "3D Lab",
  description:
    "A 3D model lab — bring a Tripo-generated GLB into the browser and explore it interactively. Drag to orbit, scroll to zoom.",
};

export default function LabPage() {
  return <ModelLab />;
}

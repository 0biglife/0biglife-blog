import type { Metadata } from "next";
import { ModelLab } from "@/components/lab";

// /lab is an almost entirely client-only surface (its 3D canvas is a
// `dynamic(..., { ssr: false })` import). As a *static* prerender, Amplify's
// Next adapter mis-served it — the client resolved the route to not-found even
// though the SSR HTML was correct. Rendering it dynamically (server-computed per
// request) makes Amplify serve it through the compute path like other routes and
// keeps the client router tree consistent. Verified against the live site.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D Lab",
  description:
    "A 3D model lab — bring a Tripo-generated GLB into the browser and explore it interactively. Drag to orbit, scroll to zoom.",
};

export default function LabPage() {
  return <ModelLab />;
}

import { redirect } from "next/navigation";

// The landing (/) IS the topology now. Keep this path working for old links by
// redirecting home, instead of a second full-screen iframe that the fixed header
// would clip at the top.
export default function TopologyPage() {
  redirect("/");
}

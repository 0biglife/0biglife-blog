import dynamic from "next/dynamic";

const IntroductionClient = dynamic(() => import("./content"));

export default function IntroductionPage() {
  return <IntroductionClient />;
}

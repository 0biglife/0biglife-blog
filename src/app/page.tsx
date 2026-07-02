import { getAllWorks } from "@/lib/works";
import { WorkGallery } from "@/components/works";
import { HeroScene } from "@/components/landing";

export default function HomePage() {
  const works = getAllWorks();
  return (
    <>
      <HeroScene />
      <section id="works">
        <WorkGallery works={works} />
      </section>
    </>
  );
}

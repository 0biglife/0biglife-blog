import { getAllWorks } from "@/lib/works";
import { WorkGallery } from "@/components/works";

export default function HomePage() {
  const works = getAllWorks();
  return <WorkGallery works={works} />;
}

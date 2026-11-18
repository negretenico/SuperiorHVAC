import { business } from "@/config/business";
import { pageMetadata } from "@/lib/seo";
import { Hero } from "@/components/home/Hero";
import { Services } from "@/components/home/Services";
import { Team } from "@/components/home/Team";
import { Testimonials } from "@/components/home/Testimonials";
import { BookCta } from "@/components/home/BookCta";

export const metadata = pageMetadata({
  title: `Heating & Cooling in ${business.address.city}, ${business.address.region}`,
  description: `Family-run furnace and AC repair, installs and tune-ups in ${business.serviceAreas
    .map((a) => a.name)
    .join(", ")} and nearby. Call ${business.phoneDisplay} or request service online.`,
  path: "/",
});

const pad = (n: number) => String(n).padStart(2, "0");

export default function Home() {
  const hasReviews = business.testimonials.length > 0;
  let n = 0;
  const next = () => pad(++n);
  return (
    <>
      <Hero />
      <Services index={next()} />
      <Team index={next()} />
      {hasReviews ? <Testimonials items={business.testimonials} index={next()} /> : null}
      <BookCta index={next()} />
    </>
  );
}

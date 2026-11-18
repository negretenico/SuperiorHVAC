import { business } from "@/config/business";

// Phase 0 placeholder. Agent B builds the real homepage.
export default function Home() {
  return (
    <main>
      <h1>{business.name}</h1>
      <p>{business.tagline}</p>
    </main>
  );
}

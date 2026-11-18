import { serializeJsonLd } from "@/lib/jsonld";

/** Inline structured data. `<` is escaped so the payload can't close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}

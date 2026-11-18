import Link from "next/link";
import { notFound } from "next/navigation";
import { business } from "@/config/business";
import { bookPath, findService, serviceParams, servicePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { serviceJsonLd } from "@/lib/jsonld";
import { serviceNote, spectrum } from "@/lib/text";
import { JsonLd } from "@/components/JsonLd";
import { PhoneLink } from "@/components/PhoneLink";
import { Breadcrumbs } from "@/components/page/Breadcrumbs";
import { HowItWorks } from "@/components/page/HowItWorks";
import { posStyle } from "@/components/posStyle";
import styles from "@/components/page/Page.module.css";

export const dynamicParams = false;
export const generateStaticParams = serviceParams;

export async function generateMetadata({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = findService(slug);
  if (!service) return {};
  return pageMetadata({
    title: `${service.name} in ${business.address.city}, ${business.address.region}`,
    description: service.summary,
    path: servicePath(slug),
  });
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const stop = spectrum(business.services).find((s) => s.service.slug === slug);
  if (!stop) notFound();
  const { service, pos, side } = stop;
  const note = serviceNote(service);
  const others = business.services.filter((s) => s.slug !== slug);

  return (
    <div className={`${styles.page} wrap`}>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: service.name, path: servicePath(slug) },
        ]}
      />
      <JsonLd data={serviceJsonLd(service)} />

      <header className={`${styles.intro} on-spectrum`} style={posStyle(pos)}>
        <p className={styles.side}>{side}</p>
        <h1 className={styles.title}>{service.name}</h1>
        <p className={styles.lede}>{service.summary}</p>
        {note ? (
          <p className={styles.note}>
            <b>{note.label}</b>
            {note.text}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Link className="btn btn-primary" href={bookPath(slug)}>
            Book {service.name}{" "}
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
          <PhoneLink className="btn btn-ghost" />
        </div>
      </header>

      <HowItWorks />

      <section className={styles.section} aria-labelledby="other-title">
        <div className="section-head">
          <p className="kicker">Also on the dial</p>
          <h2 id="other-title">Other things we do.</h2>
        </div>
        <ul className={styles.links}>
          {others.map((s) => (
            <li key={s.slug}>
              <Link href={servicePath(s.slug)}>
                <b>{s.name}</b>
                <span>{s.summary}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

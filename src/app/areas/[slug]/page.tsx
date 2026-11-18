import Link from "next/link";
import { notFound } from "next/navigation";
import { business } from "@/config/business";
import { areaParams, areaPath, bookPath, findArea, servicePath } from "@/lib/routes";
import { pageMetadata } from "@/lib/seo";
import { PhoneLink } from "@/components/PhoneLink";
import { Breadcrumbs } from "@/components/page/Breadcrumbs";
import styles from "@/components/page/Page.module.css";

// Only towns with a unique description get a page (see routes.ts areaPages).
export const dynamicParams = false;
export const generateStaticParams = () => areaParams();

const heading = (town: string) => `Heating & cooling in ${town}, ${business.address.region}`;

export async function generateMetadata({ params }: PageProps<"/areas/[slug]">) {
  const { slug } = await params;
  const area = findArea(slug);
  if (!area?.description) return {};
  return pageMetadata({
    title: `Heating & Cooling in ${area.name}, ${business.address.region}`,
    description: area.description,
    path: areaPath(slug),
  });
}

export default async function AreaPage({ params }: PageProps<"/areas/[slug]">) {
  const { slug } = await params;
  const area = findArea(slug);
  if (!area) notFound();

  return (
    <div className={`${styles.page} wrap`}>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: area.name, path: areaPath(slug) },
        ]}
      />
      <header className={styles.intro}>
        <p className={styles.side}>Service area</p>
        <h1 className={styles.title}>{heading(area.name)}</h1>
        <p className={styles.lede}>{area.description}</p>
        <div className={styles.actions}>
          <Link className="btn btn-primary" href={bookPath()}>
            Request service{" "}
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
          <PhoneLink className="btn btn-ghost" />
        </div>
      </header>

      <section className={styles.section} aria-labelledby="services-title">
        <div className="section-head">
          <p className="kicker">What we do in {area.name}</p>
          <h2 id="services-title">Heating and cooling, start to finish.</h2>
        </div>
        <ul className={styles.links}>
          {business.services.map((s) => (
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

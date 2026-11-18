import Link from "next/link";
import { business } from "@/config/business";
import { bookPath, servicePath } from "@/lib/routes";
import { countWord, serviceNote, spectrum } from "@/lib/text";
import { posStyle } from "@/components/posStyle";
import styles from "./Services.module.css";

export function Services({ index }: { index: string }) {
  const stops = spectrum(business.services);
  return (
    <section className={`${styles.services} wrap`} id="services" aria-labelledby="services-title">
      <div className="section-head">
        <p className="kicker">
          <span className="num">{index}</span> Services
        </p>
        <h2 id="services-title">Warm side, cool side, and everything in between.</h2>
        <p>{countWord(stops.length)} things we do, laid out the way your thermostat thinks about them.</p>
      </div>
      <ol className={styles.spectrum}>
        {stops.map(({ service, pos, side }) => {
          const note = serviceNote(service);
          return (
            <li key={service.slug} className={styles.stop} style={posStyle(pos)}>
              <p className={styles.side}>{side}</p>
              <h3>
                <Link href={servicePath(service.slug)}>{service.name}</Link>
              </h3>
              <p>{service.summary}</p>
              {note ? (
                <p className={styles.note}>
                  <b>{note.label}</b>
                  {note.text}
                </p>
              ) : null}
              <Link className={styles.link} href={bookPath(service.slug)}>
                Book {service.name}{" "}
                <span className="arrow" aria-hidden="true">
                  &rarr;
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

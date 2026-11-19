import { business } from "@/config/business";
import { countWord, initials } from "@/lib/text";
import { Fill } from "@/components/Fill";
import { ServingTowns } from "@/components/site/ServingTowns";
import styles from "./Team.module.css";

export function Team({ index }: { index: string }) {
  const n = business.team.length;
  return (
    <section className={`${styles.team} wrap`} id="team" aria-labelledby="team-title">
      <div className="section-head">
        <p className="kicker">
          <span className="num">{index}</span> About us
        </p>
        <h2 id="team-title">
          {countWord(n)} {n === 1 ? "person" : "people"}. You&apos;ll know us {n === 2 ? "both" : "all"} by name.
        </h2>
        <p className={styles.aside}>No call center. No mystery tech. Just us.</p>
        <p className={styles.about}>{business.about}</p>
      </div>
      <div className={styles.people}>
        {business.team.map((m, i) => (
          <article key={m.name} className={`${styles.person} ${i % 2 ? styles.ice : styles.ember}`}>
            <div className={styles.swatch} aria-hidden="true">
              <b>{initials(m.name)}</b>
            </div>
            <div>
              <h3>{m.name}</h3>
              <p className={styles.role}>{m.role}</p>
              <Fill value={m.bio}>{(bio) => <p className={styles.line}>{bio}</p>}</Fill>
            </div>
          </article>
        ))}
      </div>
      <p className={styles.serving}>
        <span>
          Based in {business.address.city}. Serving <ServingTowns />.
        </span>
      </p>
    </section>
  );
}

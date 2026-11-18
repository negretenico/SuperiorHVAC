import type { Testimonial } from "@/config/business";
import styles from "./Testimonials.module.css";

/** Rendered only when there is at least one real testimonial (never placeholders). */
export function Testimonials({ items, index }: { items: Testimonial[]; index: string }) {
  if (items.length === 0) return null;
  return (
    <section className={`${styles.section} wrap`} id="reviews" aria-labelledby="reviews-title">
      <div className="section-head">
        <p className="kicker">
          <span className="num">{index}</span> From neighbors
        </p>
        <h2 id="reviews-title">What people say after we leave.</h2>
      </div>
      <ul className={styles.list}>
        {items.map((t, i) => (
          <li key={i}>
            <figure className={styles.quote}>
              {t.rating ? <p className={styles.rating}>Rated {t.rating} out of 5</p> : null}
              <blockquote>
                <p>{t.quote}</p>
              </blockquote>
              <figcaption>
                {t.author}
                {t.town ? `, ${t.town}` : ""}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}

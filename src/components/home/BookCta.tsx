import Link from "next/link";
import { bookPath } from "@/lib/routes";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "./BookCta.module.css";

const STEPS = ["What's going on?", "When works for you?", "How do we reach you?"];

/** Points to the /book/ flow. No inline form on the homepage. */
export function BookCta({ index }: { index: string }) {
  return (
    <section className={styles.book} id="book" aria-labelledby="book-title">
      <div className={`${styles.inner} wrap`}>
        <div className="section-head">
          <p className="kicker">
            <span className="num">{index}</span> Request service
          </p>
          <h2 id="book-title">Tell us what&apos;s going on.</h2>
          <p>
            Three quick steps. We&apos;ll call you back to set a time. If it&apos;s urgent, just call{" "}
            <PhoneLink className={styles.phone} />.
          </p>
        </div>
        <div className={styles.panel}>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s}>
                <span className={`${styles.n} num`} aria-hidden="true">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>
          <Link className={`btn btn-primary ${styles.go}`} href={bookPath()}>
            Start a request{" "}
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

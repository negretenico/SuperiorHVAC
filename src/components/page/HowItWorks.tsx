import { PhoneLink } from "@/components/PhoneLink";
import styles from "./Page.module.css";

/** Generic process. Keep it honest: no promised arrival times or guarantees. */
export function HowItWorks() {
  return (
    <section className={styles.section} aria-labelledby="how-title">
      <div className="section-head">
        <p className="kicker">What happens when you call</p>
        <h2 id="how-title">Three steps. No runaround.</h2>
      </div>
      <ol className={styles.steps}>
        <li>
          <div>
            <h3>You call or send a request.</h3>
            <p>
              Call <PhoneLink /> or fill out the short form. Tell us what&apos;s going on in your own words.
            </p>
          </div>
        </li>
        <li>
          <div>
            <h3>We call you back to set a time.</h3>
            <p>We&apos;ll find a time that works for you.</p>
          </div>
        </li>
        <li>
          <div>
            <h3>We come out and take a look.</h3>
            <p>We find what&apos;s wrong and tell you straight what it needs.</p>
          </div>
        </li>
      </ol>
    </section>
  );
}

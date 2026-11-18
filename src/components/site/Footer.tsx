import Link from "next/link";
import { business, type Hours } from "@/config/business";
import { Fill } from "@/components/Fill";
import { PhoneLink } from "@/components/PhoneLink";
import { ServingTowns } from "./ServingTowns";
import styles from "./Footer.module.css";

const DAY_NAMES = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" } as const;
const hoursLine = (h: Hours) =>
  `${h.days.map((d) => DAY_NAMES[d]).join(", ")}: ${h.opens} to ${h.closes}`;

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={`${styles.footer} wrap`}>
      <div>
        <p className={styles.mark}>
          {business.name}
          <span aria-hidden="true">.</span>
        </p>
        <p className={styles.legal}>{business.tagline}</p>
      </div>
      <div className={styles.grid}>
        <div>
          <h2>Reach us</h2>
          <ul>
            <li>
              <PhoneLink />
            </li>
            <li>
              <a href={`mailto:${business.email}`}>{business.email}</a>
            </li>
            {business.socials.facebook ? (
              <li>
                <a href={business.socials.facebook} rel="noopener">
                  Facebook
                </a>
              </li>
            ) : null}
            <Fill value={business.socials.google}>
              {(url) => (
                <li>
                  <a href={url} rel="noopener">
                    Google
                  </a>
                </li>
              )}
            </Fill>
          </ul>
          <p className={styles.address}>
            <Fill value={business.address.street}>
              {(street) => (
                <>
                  {street}
                  <br />
                </>
              )}
            </Fill>
            {business.address.city}, {business.address.region}{" "}
            <Fill value={business.address.postalCode}>{(zip) => zip}</Fill>
          </p>
          <Fill value={business.hours}>
            {(hours) => (
              <ul className={styles.hours}>
                {hours.map((h) => (
                  <li key={h.days.join()}>{hoursLine(h)}</li>
                ))}
              </ul>
            )}
          </Fill>
        </div>
        <div>
          <h2>Serving</h2>
          <p className={styles.towns}>
            <ServingTowns />.
          </p>
        </div>
        <div>
          <h2>The team</h2>
          <ul className={styles.team}>
            {business.team.map((m) => (
              <li key={m.name}>
                {m.name}, {m.role}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className={styles.legal}>
        &copy; <span className="num">{year}</span> {business.name} ·{" "}
        <Link className={styles.privacy} href="/privacy/">
          Privacy
        </Link>
      </p>
    </footer>
  );
}

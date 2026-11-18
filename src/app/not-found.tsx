import type { Metadata } from "next";
import Link from "next/link";
import { business } from "@/config/business";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "@/components/page/Page.module.css";

export const metadata: Metadata = {
  title: { absolute: `Page not found | ${business.name}` },
  description: `That page doesn't exist. Head back to ${business.name}'s homepage or services, or give us a call.`,
};

export default function NotFound() {
  return (
    <div className={`${styles.page} wrap`}>
      <header className={styles.intro}>
        <p className={styles.side}>404</p>
        <h1 className={styles.title}>That page went cold.</h1>
        <p className={styles.lede}>
          We couldn&apos;t find what you were looking for. It may have moved, or the link has a typo.
        </p>
        <div className={styles.actions}>
          <Link className="btn btn-primary" href="/">
            Back to the homepage
          </Link>
          <Link className="btn btn-ghost" href="/#services">
            See our services
          </Link>
        </div>
        <p className={styles.lede}>
          Rather talk to a person? Call <PhoneLink />.
        </p>
      </header>
    </div>
  );
}

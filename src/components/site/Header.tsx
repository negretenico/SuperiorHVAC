import Link from "next/link";
import { business } from "@/config/business";
import { filled } from "@/lib/todo";
import { bookPath } from "@/lib/routes";
import { wordmarkParts } from "@/lib/text";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "./Header.module.css";

export function Header() {
  const logo = filled(business.logo);
  const { main, tag } = wordmarkParts(business.name);
  return (
    <header className={`${styles.header} wrap`}>
      <Link className={styles.wordmark} href="/" aria-label={`${business.name}, home`}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- static export, unoptimized images
          <img className={styles.logo} src={logo} alt="" height={40} />
        ) : (
          <>
            <b>{main}</b>
            {tag ? <span>{tag}</span> : null}
            <i aria-hidden="true" />
          </>
        )}
      </Link>
      <div className={styles.cta}>
        <PhoneLink className={styles.phone} />
        <span className={styles.tag}>Family-run · {business.address.city}</span>
        <Link className="btn btn-primary" href={bookPath()}>
          Request service
        </Link>
      </div>
    </header>
  );
}

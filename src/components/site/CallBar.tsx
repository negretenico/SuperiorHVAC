import Link from "next/link";
import { bookPath } from "@/lib/routes";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "./CallBar.module.css";

/** Sticky bottom bar on phones (hidden ≥768px). body padding-bottom in globals.css keeps content clear of it. */
export function CallBar() {
  return (
    <nav className={styles.bar} aria-label="Quick contact">
      <PhoneLink className="btn btn-ghost">Call</PhoneLink>
      <Link className="btn btn-primary" href={bookPath()}>
        Request Service
      </Link>
    </nav>
  );
}

import type { Metadata } from "next";
import { business } from "@/config/business";
import { BookingFlow } from "@/components/booking/BookingFlow";
import styles from "./page.module.css";

const towns = business.serviceAreas.map((a) => a.name).join(", ");

export const metadata: Metadata = {
  title: "Request service",
  description: `Tell ${business.name} what's going on with your heating or cooling and when works. Three quick steps, and we call you back to set a time. Serving ${towns} and nearby.`,
  alternates: { canonical: "/book/" },
};

export default function BookPage() {
  return (
    <main id="main" className={styles.main}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Request service</h1>
        <p className={styles.lead}>
          Three quick steps, about a minute. We&apos;ll call you back to set a time.
        </p>
        <p className={styles.call}>
          Rather talk? Call{" "}
          <a className="num" href={`tel:${business.phoneE164}`}>
            {business.phoneDisplay}
          </a>
          .
        </p>
      </div>
      <BookingFlow />
    </main>
  );
}

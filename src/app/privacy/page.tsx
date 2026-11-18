import Link from "next/link";
import { business } from "@/config/business";
import { pageMetadata } from "@/lib/seo";
import { bookPath } from "@/lib/routes";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "@/components/page/Page.module.css";

export const metadata = pageMetadata({
  title: "Privacy",
  description: `What ${business.name} collects when you request service, why, where it's kept, and how to have it deleted.`,
  path: "/privacy/",
});

/** Plain-language policy. Keep it in step with worker/ (D1, Resend, Turnstile, 24-month purge). */
export default function PrivacyPage() {
  const email = <a href={`mailto:${business.email}`}>{business.email}</a>;
  return (
    <div className={`${styles.page} wrap`}>
      <header className={styles.intro}>
        <p className={styles.side}>The short version</p>
        <h1 className={styles.title}>Privacy</h1>
        <p className={styles.lede}>
          We only collect what we need to call you back and get someone out to your house. We don&apos;t sell it.
        </p>
      </header>

      <div className={`${styles.prose} ${styles.section}`}>
        <h2>What we collect</h2>
        <p>
          When you use the <Link href={bookPath()}>request service</Link> form, we collect:
        </p>
        <ul>
          <li>The service you picked and any details you type in</li>
          <li>The time window that works for you</li>
          <li>Your name, phone number and email</li>
          <li>Your street address (if you give it) and ZIP code</li>
        </ul>

        <h2>Why we collect it</h2>
        <p>
          To call you back, set a time, and find your house. We send you one email confirming we got your request.
          That&apos;s it. No newsletters, no marketing lists.
        </p>

        <h2>Where it&apos;s kept</h2>
        <ul>
          <li>Requests are stored in a database run by Cloudflare (Cloudflare D1).</li>
          <li>
            The emails about your request (to us, and the confirmation to you) are sent through Resend, an email
            delivery service.
          </li>
          <li>
            The form uses Cloudflare Turnstile to check that a real person is filling it out. It looks at basic
            details from your browser to do that.
          </li>
          <li>
            We use Cloudflare Web Analytics to count visits. It doesn&apos;t use cookies and doesn&apos;t track you
            across other sites.
          </li>
        </ul>

        <h2>How long we keep it</h2>
        <p>Service requests are deleted automatically after 24 months.</p>

        <h2>What we don&apos;t do</h2>
        <p>We don&apos;t sell, rent or share your information with anyone for their own marketing.</p>

        <h2>Want it deleted?</h2>
        <p>
          Email {email} or call <PhoneLink /> and we&apos;ll delete your request. You can ask what we have on file,
          too.
        </p>
        <p>
          {business.name} · {business.address.city}, {business.address.region}
        </p>
      </div>
    </div>
  );
}

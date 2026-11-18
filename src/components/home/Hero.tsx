import Link from "next/link";
import type { CSSProperties } from "react";
import { business } from "@/config/business";
import { bookPath } from "@/lib/routes";
import { PhoneLink } from "@/components/PhoneLink";
import styles from "./Hero.module.css";

const badgeStyle = (r: string, d: string) => ({ "--r": r, "--d": d }) as CSSProperties;

export function Hero() {
  return (
    <section className={`${styles.hero} wrap`} aria-labelledby="hero-title">
      <div>
        <p className={styles.eyebrow}>Heating &amp; cooling · Family-run</p>
        <h1 id="hero-title" className={styles.title}>
          We keep your house at <em>the number</em> you want.
        </h1>
        <p className={styles.lede}>
          Furnace quit in January? AC blowing warm in July? Call us. We come out, find what&apos;s wrong, and tell
          you straight what it needs.
        </p>
        <div className={styles.actions}>
          <Link className="btn btn-primary" href={bookPath()}>
            Request service{" "}
            <span className="arrow" aria-hidden="true">
              &rarr;
            </span>
          </Link>
          <a className="btn btn-ghost" href="#services">
            What we fix
          </a>
        </div>
        <p className={styles.phone}>
          Or call <PhoneLink />
        </p>
        <ul className={styles.badges} aria-label="About us">
          <li className={`${styles.badge} ${styles.ember}`} style={badgeStyle("-3deg", ".15s")}>
            Family-run
          </li>
          <li className={`${styles.badge} ${styles.plain}`} style={badgeStyle("2deg", ".3s")}>
            {business.address.city}-based
          </li>
          <li className={`${styles.badge} ${styles.ice}`} style={badgeStyle("-1.5deg", ".45s")}>
            Straight answers
          </li>
        </ul>
      </div>

      <figure className={styles.dial} aria-label="Thermostat dial holding at 72 degrees">
        <svg viewBox="0 0 320 300" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="spectrum" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" className={styles.stopEmber} />
              <stop offset="0.5" className={styles.stopMid} />
              <stop offset="1" className={styles.stopIce} />
            </linearGradient>
          </defs>
          {/* 240° arc, 50°F at lower-left to 90°F at lower-right */}
          <path className={styles.track} d="M 52.9 221.8 A 124 124 0 1 1 267.1 221.8" />
          <path
            className={styles.ticks}
            d="M 52.9 221.8 A 124 124 0 1 1 267.1 221.8"
            pathLength={400}
            strokeDasharray="0.7 9.3"
          />
          <path className={styles.band} d="M 38.8 230 A 140 140 0 1 1 281.2 230" />
          <circle className={styles.setpointGlow} cx="189.1" cy="23.1" r="17" />
          <circle className={styles.setpoint} cx="189.1" cy="23.1" r="8" />
          <text className={styles.scale} x="30" y="258" textAnchor="middle">
            50
          </text>
          <text className={styles.scale} x="290" y="258" textAnchor="middle">
            90
          </text>
        </svg>
        <figcaption className={styles.readout}>
          <span className={styles.readoutLabel}>Set to</span>
          <span className={`${styles.readoutValue} num`}>
            72<sup>&deg;</sup>
          </span>
          <span className={styles.readoutStatus}>Holding steady</span>
        </figcaption>
        <div className={styles.ends} aria-hidden="true">
          <span className={styles.warm}>Heat</span>
          <span className={styles.cool}>Cool</span>
        </div>
      </figure>
    </section>
  );
}

/**
 * Single source of truth for every business fact on the site.
 * Nothing else in the codebase may hard-code name, phone, email, address, hours, team,
 * services, areas, or socials. Import from here.
 *
 * Unknown values use `todo("…")`. `npm run check:launch` lists every remaining TODO and
 * fails the production deploy until they are filled in.
 */

/** A value that has not been provided yet. Renders visibly in dev; blocks launch. */
export type Todo = { readonly __todo: string };
export type Maybe<T> = T | Todo;

export const todo = (label: string): Todo => ({ __todo: label });
export const isTodo = (v: unknown): v is Todo =>
  typeof v === "object" && v !== null && "__todo" in v;

export type Weekday = "Mo" | "Tu" | "We" | "Th" | "Fr" | "Sa" | "Su";

export interface Hours {
  days: Weekday[];
  /** 24h "HH:MM" */
  opens: string;
  closes: string;
}

export interface Address {
  /** Optional: omit for a service-area business that doesn't publish an address. */
  street?: Maybe<string>;
  city: string;
  region: string; // state code, e.g. "OH"
  postalCode?: Maybe<string>;
  country: "US";
}

export interface TeamMember {
  name: string;
  role: string;
  /** One plain-English line in their own voice. */
  bio?: Maybe<string>;
}

export interface Service {
  slug: string;
  name: string;
  /** Short line used on cards, booking choices, meta descriptions. */
  summary: string;
  /** "heat" | "cool" | "both": lets designs place services on a warm/cool axis. */
  climate: "heat" | "cool" | "both";
  /** Common symptoms, shown as a "Call us if" note and used in booking hints. */
  symptoms: string[];
  /** Optional labelled note shown instead of symptoms, e.g. { label: "Good timing", ... }. */
  note?: { label: string; text: string };
}

export interface ServiceArea {
  slug: string;
  name: string;
  /**
   * Optional unique description. An /areas/[slug] page is generated ONLY when this is set,
   * to avoid thin "doorway" pages. Without it, the town still appears in the
   * "Serving …" line, the footer, and JSON-LD areaServed.
   */
  description?: string;
}

export interface Testimonial {
  author: string;
  town?: string;
  quote: string;
  /** 1–5 */
  rating?: number;
}

export interface Business {
  name: string;
  legalName?: string;
  tagline: string;
  /** The owner's own "about us" paragraph. Shown on the homepage; used as the JSON-LD description. */
  about: string;
  siteUrl: Maybe<string>;
  email: string;
  /** E.164, e.g. "+14197061724" */
  phoneE164: string;
  /** Human format, rendered everywhere identically, e.g. "419-706-1724" */
  phoneDisplay: string;
  address: Address;
  /** Approximate business location for JSON-LD geo (home base). */
  geo?: Maybe<{ latitude: number; longitude: number }>;
  /** Optional: omitted while the business runs by appointment. */
  hours?: Maybe<Hours[]>;
  regionLabel: string;
  team: TeamMember[];
  services: Service[];
  serviceAreas: ServiceArea[];
  testimonials: Testimonial[];
  socials: { facebook?: string; google?: Maybe<string> };
  /** Path under /public to a logo; Todo means the typographic wordmark is used. */
  logo?: Maybe<string>;
  foundedYear?: number;
}

export const business: Business = {
  name: "Superior HVAC",
  legalName: "Superior HVAC LLC",
  about:
    "Superior HVAC LLC is a family-owned and operated heating and air conditioning company providing service and installation to keep your space comfortable year-round. Whether you need service for your existing system or a new HVAC installation, we're committed to dependable workmanship, honest communication, and personalized care. As a family business, we take pride in treating our customers like neighbors and delivering reliable comfort you can count on.",
  tagline: "Heating & cooling, family-run in Northwest Ohio.",
  siteUrl: "https://superiorhvacoh.com",
  email: "superiorhvac90@gmail.com",
  phoneE164: "+14197061724",
  phoneDisplay: "419-706-1724",
  address: {
    city: "Norwalk",
    region: "OH",
    country: "US",
  },
  regionLabel: "Northwest Ohio",
  team: [
    { name: "Joey Ojeda", role: "Owner/Operator" },
    { name: "Ramon Negrete", role: "Lead Installer" },
  ],
  services: [
    {
      slug: "ac-repair",
      name: "AC Repair",
      summary: "Warm air coming out of the vents, a unit that won't kick on, or water where it shouldn't be. We find the cause and fix that.",
      climate: "cool",
      symptoms: ["Blowing warm", "Short cycling", "Ice on the lines"],
    },
    {
      slug: "furnace-heating-repair",
      name: "Furnace & Heating Repair",
      summary: "No heat, a strange smell, or a furnace that keeps shutting itself off. We track down what's wrong and get you warm again.",
      climate: "heat",
      symptoms: ["No heat", "Cold rooms", "Cycling on and off"],
    },
    {
      slug: "hvac-installation-replacement",
      name: "HVAC Installation & Replacement",
      summary: "When it's time for a new system, we size it for your house, put it in clean, and walk you through how it works before we go.",
      note: { label: "Straight answer", text: "If a repair still makes more sense than a new unit, we'll tell you." },
      climate: "both",
      symptoms: ["System is 15+ years old", "Repairs keep adding up", "Uneven temperatures"],
    },
    {
      slug: "maintenance-tune-ups",
      name: "Maintenance & Tune-Ups",
      summary: "A check-up before the season turns. We clean it, test it, and catch the small stuff before it turns into a no-heat call.",
      note: { label: "Good timing", text: "Spring for the AC, fall for the furnace." },
      climate: "both",
      symptoms: ["Seasonal check-up", "Higher energy bills", "Haven't had it looked at in a year"],
    },
  ],
  serviceAreas: [
    // Each description must be unique, specific, and only state verifiable facts.
    // Remove a description to drop that town's /areas/ page (it stays in the footer and JSON-LD).
    {
      slug: "norwalk-oh",
      name: "Norwalk",
      description:
        "Norwalk is home. It's the Huron County seat and where we're based, so most of our calls are close by. If your furnace or AC is acting up in town, we're not far.",
    },
    {
      slug: "sandusky-oh",
      name: "Sandusky",
      description:
        "Sandusky sits on Sandusky Bay along Lake Erie, and it's the Erie County seat. Lake weather means long heating seasons and muggy summers. We work on furnaces and AC across town.",
    },
    {
      slug: "huron-oh",
      name: "Huron",
      description:
        "Huron is in Erie County, where the Huron River meets Lake Erie. Lakefront homes get the full winter wind and a damp summer. We fix and install heating and cooling all over town.",
    },
    {
      slug: "willard-oh",
      name: "Willard",
      description:
        "Willard is in southern Huron County, a short drive down from our home base in Norwalk. Out in the farm country, a furnace that quits is a real problem. Call us and we'll come out.",
    },
  ],
  testimonials: [],
  socials: {
    facebook: "https://www.facebook.com/profile.php?id=61562683560654",
  },
};

/** Lists every unfilled value as a dotted path. Used by check:launch and dev banners. */
export function findTodos(value: unknown, path = "business"): string[] {
  if (isTodo(value)) return [`${path}: ${value.__todo}`];
  if (Array.isArray(value)) return value.flatMap((v, i) => findTodos(v, `${path}[${i}]`));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) => findTodos(v, `${path}.${k}`));
  }
  return [];
}

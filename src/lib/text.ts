/** Small pure helpers for turning config into display text. */
import type { Service } from "../config/business";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** "Superior HVAC" -> { main: "Superior", tag: "HVAC" } for the two-weight wordmark. */
export function wordmarkParts(name: string): { main: string; tag: string } {
  const m = /^(.*\S)\s+([A-Z]{2,})$/.exec(name.trim());
  return m ? { main: m[1]!, tag: m[2]! } : { main: name, tag: "" };
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
export const countWord = (n: number) => WORDS[n] ?? String(n);

export const joinTowns = (towns: string[]) => towns.join(", ");

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The labelled note if present, otherwise "Call us if" + symptoms. */
export function serviceNote(service: Service): { label: string; text: string } | undefined {
  if (service.note) return service.note;
  if (!service.symptoms.length) return undefined;
  const [first, ...rest] = service.symptoms;
  return { label: "Call us if", text: [first!, ...rest.map(lowerFirst)].join(" · ") };
}

const ORDER: Record<Service["climate"], number> = { heat: 0, both: 1, cool: 2 };
const SIDE: Record<Service["climate"], string> = { heat: "Warm side", both: "Both seasons", cool: "Cool side" };

export interface SpectrumStop {
  service: Service;
  /** 0 = ember (warm), 1 = ice (cool). Drives the --pos CSS variable. */
  pos: number;
  side: string;
}

/** Services laid out warm to cool, the way the thermostat thinks about them. */
export function spectrum(services: Service[]): SpectrumStop[] {
  const sorted = services
    .map((service, i) => ({ service, i }))
    .sort((a, b) => ORDER[a.service.climate] - ORDER[b.service.climate] || a.i - b.i);
  const n = sorted.length;
  return sorted.map(({ service }, i) => ({
    service,
    pos: n > 1 ? i / (n - 1) : 0.5,
    side: SIDE[service.climate],
  }));
}

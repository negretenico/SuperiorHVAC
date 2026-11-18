/**
 * Booking flow state machine and helpers. Pure: no DOM, no React, no network.
 * The client component (BookingFlow.tsx) wires this to the UI; tests cover it directly.
 *
 * Validation always goes through the shared contract in src/lib/booking.ts. The whole
 * form object is validated and only the errors belonging to the current step are kept,
 * so client and server rules can never drift apart.
 */
import {
  LIMITS,
  SERVICE_SLUGS,
  type BookingField,
  type BookingRequestBody,
  type ValidationResult,
} from "../../lib/booking";
import type { Service } from "../../config/business";

export type Step = 1 | 2 | 3;
export type FlowStep = Step | "done";

export interface FormValues {
  service: string;
  details: string;
  timeWindow: string;
  name: string;
  phone: string;
  email: string;
  street: string;
  zip: string;
  /** Honeypot. Real users never see or fill it. */
  company: string;
}

export type FieldErrors = Partial<Record<BookingField, string>>;
export type Validator = (body: unknown) => ValidationResult;

export const STEP_FIELDS: Record<Step, readonly BookingField[]> = {
  1: ["service", "details"],
  2: ["timeWindow"],
  3: ["name", "phone", "email", "street", "zip", "turnstileToken"],
};

const ALL_FIELDS = new Set<string>([...STEP_FIELDS[1], ...STEP_FIELDS[2], ...STEP_FIELDS[3]]);

export const TURNSTILE_PENDING_MESSAGE =
  "The spam check hasn't finished yet. Give it a moment, then send again.";

/** Show the live character count only when this close to the details limit. */
export const DETAILS_COUNT_THRESHOLD = 50;

export type Banner = "turnstile" | "rate_limited" | "server";

export type Outcome =
  | { kind: "ok" }
  | { kind: "validation"; errors: FieldErrors }
  | { kind: "turnstile" }
  | { kind: "rate_limited" }
  | { kind: "server" };

/** Where focus should go after the next render. `n` changes every time focus must move. */
export type FocusTarget = "none" | "heading" | "summary" | "confirmation" | `field:${BookingField}`;

export interface FlowState {
  step: FlowStep;
  values: FormValues;
  errors: FieldErrors;
  token: string | null;
  status: "idle" | "sending";
  banner: Banner | null;
  /** Incremented to ask the Turnstile widget to reset. */
  turnstileReset: number;
  focus: { target: FocusTarget; n: number };
}

export type Action =
  | { type: "preselect"; service: string }
  | { type: "set"; field: keyof FormValues; value: string }
  | { type: "next" }
  | { type: "back" }
  | { type: "submit" }
  | { type: "token"; token: string | null }
  | { type: "result"; outcome: Outcome };

export function initialState(): FlowState {
  return {
    step: 1,
    values: { service: "", details: "", timeWindow: "", name: "", phone: "", email: "", street: "", zip: "", company: "" },
    errors: {},
    token: null,
    status: "idle",
    banner: null,
    turnstileReset: 0,
    focus: { target: "none", n: 0 },
  };
}

/** `?service=<slug>` → slug, or null for missing/unknown values. */
export function parsePreselect(value: string | null | undefined): string | null {
  return value && SERVICE_SLUGS.includes(value) ? value : null;
}

export function stepForField(field: BookingField): Step {
  if (STEP_FIELDS[1].includes(field)) return 1;
  if (STEP_FIELDS[2].includes(field)) return 2;
  return 3;
}

export function firstErrorStep(errors: FieldErrors): Step | null {
  const steps = (Object.keys(errors) as BookingField[]).filter((f) => errors[f]).map(stepForField);
  return steps.length ? (Math.min(...steps) as Step) : null;
}

export function buildRequestBody(values: FormValues, token: string | null): BookingRequestBody {
  return {
    service: values.service,
    details: values.details,
    timeWindow: values.timeWindow,
    name: values.name,
    phone: values.phone,
    email: values.email,
    street: values.street,
    zip: values.zip,
    company: values.company,
    turnstileToken: token ?? "",
  };
}

/** Errors for one step only, from validating the whole form with the shared rules. */
export function stepErrors(step: Step, values: FormValues, token: string | null, validate: Validator): FieldErrors {
  const result = validate(buildRequestBody(values, token));
  if (result.ok) return {};
  const out: FieldErrors = {};
  for (const f of STEP_FIELDS[step]) {
    const msg = result.errors[f];
    if (msg) out[f] = f === "turnstileToken" && !token ? TURNSTILE_PENDING_MESSAGE : msg;
  }
  return out;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** HTTP status + parsed JSON (or null) from POST /api/booking → what the UI should do. */
export function interpretResponse(status: number, body: unknown): Outcome {
  if (status === 429) return { kind: "rate_limited" };
  if (status === 403) return { kind: "turnstile" };
  if (!isRecord(body)) return { kind: "server" };
  if (status === 200 && body.ok === true) return { kind: "ok" };
  if (status === 400 && body.error === "validation" && isRecord(body.errors)) {
    const errors: FieldErrors = {};
    for (const [k, v] of Object.entries(body.errors)) {
      if (ALL_FIELDS.has(k) && typeof v === "string" && v) errors[k as BookingField] = v;
    }
    return Object.keys(errors).length ? { kind: "validation", errors } : { kind: "server" };
  }
  return { kind: "server" };
}

/** "419-555-0142" for any 10-digit US number (optional leading 1), else the trimmed input. */
export function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : raw.trim();
}

export function confirmationFor(values: FormValues): { firstName: string; phone: string } {
  return { firstName: values.name.trim().split(/\s+/)[0] ?? "", phone: formatPhone(values.phone) };
}

/** Characters left in the details box, or null while comfortably under the limit. */
export function detailsRemaining(details: string): number | null {
  const left = LIMITS.detailsMax - details.length;
  return left <= DETAILS_COUNT_THRESHOLD ? Math.max(0, left) : null;
}

/**
 * Position of each service on the ember (0) ↔ ice (1) spectrum, used as CSS `--pos`.
 * Heat services sit at 0, cool at 1, and "both" services are spread evenly across 0.4–0.6.
 */
export function climatePositions(services: readonly Service[]): Record<string, number> {
  const both = services.filter((s) => s.climate === "both");
  const out: Record<string, number> = {};
  for (const s of services) {
    if (s.climate === "heat") out[s.slug] = 0;
    else if (s.climate === "cool") out[s.slug] = 1;
    else {
      const i = both.indexOf(s);
      out[s.slug] = both.length === 1 ? 0.5 : 0.4 + (0.2 * i) / (both.length - 1);
    }
  }
  return out;
}

const focus = (s: FlowState, target: FocusTarget) => ({ target, n: s.focus.n + 1 });

export function createReducer(validate: Validator) {
  return function reducer(state: FlowState, action: Action): FlowState {
    switch (action.type) {
      case "preselect":
        if (state.values.service || state.step !== 1) return state;
        return { ...state, values: { ...state.values, service: action.service } };

      case "set": {
        const errors = { ...state.errors };
        delete errors[action.field as BookingField];
        return { ...state, values: { ...state.values, [action.field]: action.value }, errors };
      }

      case "token": {
        const errors = { ...state.errors };
        if (action.token) delete errors.turnstileToken;
        return { ...state, token: action.token, errors };
      }

      case "next": {
        if (state.step !== 1 && state.step !== 2) return state;
        const errors = stepErrors(state.step, state.values, state.token, validate);
        const first = STEP_FIELDS[state.step].find((f) => errors[f]);
        if (first) return { ...state, errors: { ...state.errors, ...errors }, focus: focus(state, `field:${first}`) };
        return { ...state, step: (state.step + 1) as Step, banner: null, focus: focus(state, "heading") };
      }

      case "back":
        if (state.step !== 2 && state.step !== 3) return state;
        return { ...state, step: (state.step - 1) as Step, banner: null, focus: focus(state, "heading") };

      case "submit": {
        if (state.step !== 3 || state.status === "sending") return state;
        const errors = stepErrors(3, state.values, state.token, validate);
        if (Object.keys(errors).length) {
          return { ...state, errors: { ...state.errors, ...errors }, banner: null, focus: focus(state, "summary") };
        }
        return { ...state, status: "sending", banner: null };
      }

      case "result": {
        const base = { ...state, status: "idle" as const };
        const o = action.outcome;
        switch (o.kind) {
          case "ok":
            return { ...base, step: "done", errors: {}, banner: null, focus: focus(state, "confirmation") };
          case "validation":
            return {
              ...base,
              step: firstErrorStep(o.errors) ?? 3,
              errors: o.errors,
              banner: null,
              focus: focus(state, "summary"),
            };
          case "turnstile":
            return {
              ...base,
              banner: "turnstile",
              token: null,
              turnstileReset: state.turnstileReset + 1,
              focus: focus(state, "summary"),
            };
          case "rate_limited":
          case "server":
            return { ...base, banner: o.kind, focus: focus(state, "summary") };
        }
      }
    }
  };
}

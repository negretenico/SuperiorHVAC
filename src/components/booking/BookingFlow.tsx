"use client";

import { Suspense, useCallback, useEffect, useReducer, useRef, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { business } from "@/config/business";
import { LIMITS, TIME_WINDOWS, validateBooking, type BookingField, type TimeWindow } from "@/lib/booking";
import { sendBooking } from "./api";
import {
  STEP_FIELDS,
  buildRequestBody,
  climatePositions,
  confirmationFor,
  createReducer,
  detailsRemaining,
  initialState,
  parsePreselect,
  stepErrors,
  type Action,
  type Banner,
  type FieldErrors,
  type FormValues,
  type Step,
} from "./flow";
import { Turnstile } from "./Turnstile";
import styles from "./booking.module.css";

const reducer = createReducer(validateBooking);

const STEP_TITLES: Record<Step, string> = {
  1: "What's going on?",
  2: "When works?",
  3: "How do we reach you?",
};

const TIME_LABELS: Record<TimeWindow, { label: string; hint: string }> = {
  asap: { label: "ASAP", hint: "Soonest we can" },
  morning: { label: "Morning", hint: "Before noon" },
  afternoon: { label: "Afternoon", hint: "Noon to 5" },
  evening: { label: "Evening", hint: "After 5" },
};

const FIELD_LABELS: Record<BookingField, string> = {
  service: "Service",
  details: "Details",
  timeWindow: "Time",
  name: "Name",
  phone: "Phone",
  email: "Email",
  street: "Street address",
  zip: "ZIP code",
  turnstileToken: "Spam check",
};

const POSITIONS = climatePositions(business.services);
const SERVICES = [...business.services].sort((a, b) => (POSITIONS[a.slug] ?? 0) - (POSITIONS[b.slug] ?? 0));

const fieldId = (f: BookingField | "company") => `bk-${f}`;
const errorId = (f: BookingField) => `bk-${f}-error`;

/** Focus a field by name; for a radio group, its checked (or first) option. */
function focusField(f: BookingField) {
  const el = document.getElementById(fieldId(f));
  if (!el) return;
  if (el instanceof HTMLFieldSetElement) {
    (el.querySelector<HTMLInputElement>("input:checked") ?? el.querySelector<HTMLInputElement>("input"))?.focus();
  } else {
    el.focus();
  }
}

function PhoneLink() {
  return (
    <a className="num" href={`tel:${business.phoneE164}`}>
      {business.phoneDisplay}
    </a>
  );
}

/** Reads ?service=<slug> on the client. Lives in its own Suspense boundary so the form still prerenders. */
function QueryPreselect({ dispatch }: { dispatch: (a: Action) => void }) {
  const service = parsePreselect(useSearchParams().get("service"));
  useEffect(() => {
    if (service) dispatch({ type: "preselect", service });
  }, [service, dispatch]);
  return null;
}

function FieldError({ field, errors }: { field: BookingField; errors: FieldErrors }) {
  const msg = errors[field];
  return msg ? (
    <p id={errorId(field)} className={styles.error}>
      {msg}
    </p>
  ) : null;
}

/** Props that wire an input to its error message. */
function a11y(field: BookingField, errors: FieldErrors, hintId?: string) {
  const ids = [errors[field] ? errorId(field) : null, hintId].filter(Boolean).join(" ");
  return { "aria-invalid": errors[field] ? true : undefined, "aria-describedby": ids || undefined } as const;
}

function BannerMessage({ banner }: { banner: Banner }) {
  switch (banner) {
    case "turnstile":
      return <>The spam check didn&apos;t go through. Please try again.</>;
    case "rate_limited":
      return (
        <>
          Too many requests from this connection. Please wait a minute or call us at <PhoneLink />.
        </>
      );
    case "server":
      return (
        <>
          Something went wrong on our end. Your request wasn&apos;t sent. Please call <PhoneLink /> or try again.
        </>
      );
  }
}

interface TextFieldProps {
  field: "name" | "phone" | "email" | "street" | "zip";
  label: ReactNode;
  values: FormValues;
  errors: FieldErrors;
  onChange: (field: keyof FormValues, value: string) => void;
  hint?: string;
  input: React.InputHTMLAttributes<HTMLInputElement>;
}

function TextField({ field, label, values, errors, onChange, hint, input }: TextFieldProps) {
  const hintId = hint ? `${fieldId(field)}-hint` : undefined;
  return (
    <div className={styles.field}>
      <label htmlFor={fieldId(field)}>{label}</label>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      <input
        id={fieldId(field)}
        name={field}
        className={styles.input}
        value={values[field]}
        onChange={(e) => onChange(field, e.target.value)}
        {...a11y(field, errors, hintId)}
        {...input}
      />
      <FieldError field={field} errors={errors} />
    </div>
  );
}

export function BookingFlow() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const { step, values, errors, status, banner, focus } = state;
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLHeadingElement>(null);
  const sending = useRef(false);

  useEffect(() => {
    if (focus.n === 0) return; // never steal focus on first load
    const t = focus.target;
    if (t === "heading") headingRef.current?.focus();
    else if (t === "summary") summaryRef.current?.focus();
    else if (t === "confirmation") confirmRef.current?.focus();
    else if (t.startsWith("field:")) focusField(t.slice("field:".length) as BookingField);
  }, [focus]);

  const set = useCallback((field: keyof FormValues, value: string) => dispatch({ type: "set", field, value }), []);
  const onToken = useCallback((token: string | null) => dispatch({ type: "token", token }), []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (step === 1 || step === 2) return dispatch({ type: "next" });
    if (step !== 3 || sending.current) return;
    const invalid = Object.keys(stepErrors(3, values, state.token, validateBooking)).length > 0;
    dispatch({ type: "submit" }); // shows errors, or flips to "sending"
    if (invalid) return;
    sending.current = true;
    const outcome = await sendBooking(buildRequestBody(values, state.token));
    sending.current = false;
    dispatch({ type: "result", outcome });
  }

  if (step === "done") {
    const { firstName, phone } = confirmationFor(values);
    return (
      <section className={styles.panel} aria-labelledby="bk-done">
        <div className={styles.done}>
          <h2 id="bk-done" ref={confirmRef} tabIndex={-1} className={styles.stepTitle}>
            Got it, {firstName}.
          </h2>
          <p className={styles.doneLead}>
            We&apos;ll call you at <strong className="num">{phone}</strong> to set a time.
          </p>
          <p className={styles.hint}>
            If it&apos;s urgent, call us now at <PhoneLink />.
          </p>
        </div>
      </section>
    );
  }

  const stepErrorList = STEP_FIELDS[step].filter((f) => errors[f]);
  const showSummary = banner !== null || (focus.target === "summary" && stepErrorList.length > 0);
  const remaining = detailsRemaining(values.details);

  return (
    <form className={styles.panel} noValidate onSubmit={onSubmit} aria-labelledby="bk-step-title" aria-busy={status === "sending"}>
      <Suspense fallback={null}>
        <QueryPreselect dispatch={dispatch} />
      </Suspense>

      <div className={styles.progress}>
        <p className={styles.progressRow}>
          Step <span className="num">{step}</span> of <span className="num">3</span>
        </p>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-label="Request progress"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step}
          aria-valuetext={`Step ${step} of 3`}
        >
          {[1, 2, 3].map((n) => (
            <span key={n} data-on={n <= step ? "" : undefined} />
          ))}
        </div>
      </div>

      <h2 id="bk-step-title" ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
        {STEP_TITLES[step]}
      </h2>

      {showSummary && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className={styles.summary} data-testid="booking-summary">
          {banner ? (
            <p>
              <BannerMessage banner={banner} />
            </p>
          ) : (
            <>
              <p className={styles.summaryTitle}>Please fix {stepErrorList.length === 1 ? "this" : "these"} to continue:</p>
              <ul>
                {stepErrorList.map((f) => (
                  <li key={f}>
                    <a
                      href={`#${fieldId(f)}`}
                      onClick={(e) => {
                        e.preventDefault();
                        focusField(f);
                      }}
                    >
                      {FIELD_LABELS[f]}: {errors[f]}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {step === 1 && (
        <>
          <fieldset id={fieldId("service")} className={styles.group}>
            <legend className={styles.legend}>Pick the closest match</legend>
            <div className={styles.choices}>
              {SERVICES.map((s) => (
                <div className={styles.choice} key={s.slug}>
                  <input
                    type="radio"
                    name="service"
                    id={`bk-service-${s.slug}`}
                    value={s.slug}
                    checked={values.service === s.slug}
                    onChange={() => set("service", s.slug)}
                    {...a11y("service", errors)}
                  />
                  <label htmlFor={`bk-service-${s.slug}`} style={{ "--pos": POSITIONS[s.slug] } as CSSProperties}>
                    <span>
                      <span className={styles.choiceName}>{s.name}</span>
                      <span className={styles.choiceHint}>{s.symptoms.slice(0, 2).join(" · ")}</span>
                    </span>
                  </label>
                </div>
              ))}
            </div>
            <FieldError field="service" errors={errors} />
          </fieldset>

          <div className={styles.field}>
            <label htmlFor={fieldId("details")}>
              Anything we should know? <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id={fieldId("details")}
              name="details"
              rows={3}
              maxLength={LIMITS.detailsMax}
              className={styles.textarea}
              placeholder="e.g. Furnace clicks on, then shuts off after a minute."
              value={values.details}
              onChange={(e) => set("details", e.target.value)}
              {...a11y("details", errors, remaining !== null ? "bk-details-count" : undefined)}
            />
            {remaining !== null && (
              <p id="bk-details-count" className={styles.hint} aria-live="polite">
                {remaining} {remaining === 1 ? "character" : "characters"} left
              </p>
            )}
            <FieldError field="details" errors={errors} />
          </div>
        </>
      )}

      {step === 2 && (
        <fieldset id={fieldId("timeWindow")} className={styles.group}>
          <legend className={styles.legend}>Best time for a visit. We&apos;ll confirm the exact time by phone.</legend>
          <div className={styles.chips}>
            {TIME_WINDOWS.map((w) => (
              <div className={styles.chip} key={w}>
                <input
                  type="radio"
                  name="timeWindow"
                  id={`bk-time-${w}`}
                  value={w}
                  checked={values.timeWindow === w}
                  onChange={() => set("timeWindow", w)}
                  {...a11y("timeWindow", errors)}
                />
                <label htmlFor={`bk-time-${w}`}>
                  <span className={styles.choiceName}>{TIME_LABELS[w].label}</span>
                  <span className={styles.choiceHint}>{TIME_LABELS[w].hint}</span>
                </label>
              </div>
            ))}
          </div>
          <FieldError field="timeWindow" errors={errors} />
        </fieldset>
      )}

      {step === 3 && (
        <>
          <TextField
            field="name"
            label="Your name"
            values={values}
            errors={errors}
            onChange={set}
            input={{ type: "text", autoComplete: "name", maxLength: LIMITS.nameMax, required: true }}
          />
          <TextField
            field="phone"
            label="Phone"
            hint="We'll call this number to set a time."
            values={values}
            errors={errors}
            onChange={set}
            input={{ type: "tel", autoComplete: "tel", inputMode: "tel", required: true }}
          />
          <TextField
            field="email"
            label="Email"
            values={values}
            errors={errors}
            onChange={set}
            input={{ type: "email", autoComplete: "email", maxLength: LIMITS.emailMax, required: true }}
          />
          <TextField
            field="street"
            label={
              <>
                Street address <span className={styles.optional}>(optional)</span>
              </>
            }
            values={values}
            errors={errors}
            onChange={set}
            input={{ type: "text", autoComplete: "street-address", maxLength: LIMITS.streetMax }}
          />
          <TextField
            field="zip"
            label="ZIP code"
            values={values}
            errors={errors}
            onChange={set}
            input={{
              type: "text",
              autoComplete: "postal-code",
              inputMode: "numeric",
              pattern: "[0-9]{5}(-[0-9]{4})?",
              maxLength: 10,
              required: true,
            }}
          />

          {/* Honeypot: hidden from people and assistive tech; bots that fill it are dropped server-side. */}
          <div className={styles.honeypot} aria-hidden="true">
            <label htmlFor={fieldId("company")}>Company</label>
            <input
              id={fieldId("company")}
              name="company"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={values.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <Turnstile
              onToken={onToken}
              resetSignal={state.turnstileReset}
              fallback={
                <>
                  Or call us at <PhoneLink />.
                </>
              }
            />
            <FieldError field="turnstileToken" errors={errors} />
          </div>
        </>
      )}

      <div className={styles.foot}>
        {step !== 1 && (
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={() => dispatch({ type: "back" })} disabled={status === "sending"}>
            <span className={styles.arrow} aria-hidden="true">
              &larr;
            </span>{" "}
            Back
          </button>
        )}
        <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={status === "sending"}>
          {step === 3 ? (status === "sending" ? "Sending…" : "Send request") : "Next"}{" "}
          {status !== "sending" && (
            <span className={styles.arrow} aria-hidden="true">
              &rarr;
            </span>
          )}
        </button>
        <p className={styles.note} role="status" aria-live="polite">
          {status === "sending" ? "Sending your request…" : ""}
        </p>
      </div>
    </form>
  );
}

# Prototype brief (shared by all three directions)

Each direction is ONE self-contained HTML file: `design/prototypes/<direction>/index.html`.
It will be published as a private claude.ai Artifact page so the owner can compare directions on a phone,
each on its own URL. Treat it as a high-fidelity, phone-first prototype of the real homepage, not a mood board.

## Real content (no lorem ipsum, no invented facts)
- Business: Superior HVAC — heating & cooling, family-run, Northwest Ohio.
- Phone: 419-706-1724 (show as selectable text; `tel:` link is a convenience only)
- Email: superiorhvac90@gmail.com
- Team: Joey Ojeda — Owner/Operator. Ramon Negrete — Lead Installer.
- Serving: Norwalk, Sandusky, Huron, Willard & surrounding areas (home base: Norwalk, OH). Keep this LOW-KEY: one subtle line + footer, never a big section.
- Services: AC Repair; Furnace & Heating Repair; HVAC Installation & Replacement; Maintenance & Tune-Ups.
- No testimonials yet (do not invent any). No photos exist (must look finished without them). No logo yet: use a typographic wordmark "Superior HVAC".
- Hours/address unknown: don't show them.

## Sections to include (phone layout first, then scale up at ≥ 768px and ≥ 1100px)
1. Sticky bottom bar on phone: "Call" + "Request Service" (respect `env(safe-area-inset-bottom)`). On desktop it can become a header CTA.
2. Hero: states the thesis of the direction. Not a stock-photo hero.
3. Services: the four services. Must NOT be a row of identical icon cards.
4. Team: Joey and Ramon as real people, personal, local, trustworthy (no photos; find a non-photo treatment).
5. Subtle "Serving Norwalk, Sandusky, Huron, Willard & surrounding areas" line.
6. A preview of booking step 1 of 3 ("What's going on?": pick a service as large tappable choices + optional short description textarea, progress indicator "1 of 3", Next button). Interactive selection is nice; submit must `preventDefault()`.
7. Footer: name, phone, email, Facebook link (https://www.facebook.com/profile.php?id=61562683560654), service towns.

## Hard rules
- Hard bans: generic blue-and-orange, stock wrench guy, rows of identical icon cards, emoji as icons, purple gradients, `rounded-lg`-everything, the warm-cream (#F4F1EA) + terracotta default, near-black + lone acid-green default.
- Light AND dark: site follows system setting only (no toggle). Use the exact token shape:
  ```css
  :root { /* every token, light */ }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark tokens */ color-scheme: dark } }
  :root[data-theme="dark"] { /* same dark tokens */ color-scheme: dark }
  body { background: var(--bg); color: var(--fg) }
  ```
  No literal colors in component rules. Dark must be designed, not inverted.
- Motion: subtle and purposeful, ONE signature moment. Everything visible at rest (never opacity:0 waiting for an observer). Full `prefers-reduced-motion: reduce` support.
- Fonts: Google Fonts `<link>` only, with real fallback stacks. No other external resources except pinned cdnjs scripts (avoid scripts if possible; vanilla JS inline). Minimal JS: this mirrors a site targeting Lighthouse 95+.
- File format: NO `<!doctype>`, `<html>`, `<head>`, `<body>` tags (a skeleton wraps it). Top of file: `<title>` (short name, e.g. "Superior HVAC · Thermostat"), then `<meta name="claude:viewport-fit-sides" content="cover">`, then `<style>`.
- Side gutter on body or outer wrapper: `padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px));` use `padding-block` for vertical. No horizontal scroll at 360–400px. Fixed bottom bar adds the safe-area insets to its padding.
- Accessibility: one h1, semantic landmarks, labels on every input, stable ids, visible focus states, WCAG AA contrast in BOTH themes, tap targets ≥ 44px.
- Put the design tokens (color, type, a one-line layout-concept comment) at the top of `<style>` — these become the real site's tokens if chosen.
- Copy: plain, warm, local, short sentences, written as Joey would say it. No corporate filler ("industry-leading solutions"), no em-dash asides.

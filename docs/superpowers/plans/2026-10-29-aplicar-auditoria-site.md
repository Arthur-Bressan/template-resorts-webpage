# Site Audit Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the approved findings A1–A16 from `AUDITORIA-SITE.md` across the public website, booking flow, SEO, and admin navigation.

**Architecture:** Preserve the current Next.js App Router, Tailwind 4, Prisma, and existing UI primitives. Reuse current database models and dependencies; keep all reservation validation server-side and use a narrow, non-sensitive status response for payment return pages. Improve the current visual language rather than replacing it.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Prisma 6, TypeScript.

**Spec:** `AUDITORIA-SITE.md`

## Global Constraints

- Do not add dependencies or change frameworks.
- Keep private contact and reservation fields out of public responses.
- Preserve existing reservation, admin, and CMS data models unless an existing model cannot support the requirement.
- Do not introduce unsupported availability, ratings, scarcity, discounts, or delivery promises.
- No test files or test commands in this implementation pass; user requested implementation, not testing.

## Review Focus

- Two concurrent booking attempts for overlapping dates must not both proceed when the stored status holds inventory.
- A pending or rejected payment return must never render as confirmed.
- Mobile drawer, lightbox, collapsed FAQ, and async form errors must remain operable/announced without motion.
- Existing CMS values and fallback mode must not render blank controls or broken links.
- Placeholder URLs, missing database records, or invalid query identifiers must result in useful user-facing states.

---

### Task 1: Reservation integrity and payment return states

**Files:** `src/app/api/reservations/create-preference/route.ts`, `src/app/api/reservations/webhook/route.ts`, `src/app/api/reservations/status/route.ts` (new), `src/app/reservas/page.tsx`, `src/app/reservas/sucesso/page.tsx`, `src/app/reservas/pendente/page.tsx`, `src/app/reservas/falha/page.tsx`.

- Compare requested guests with the selected room capacity on the server.
- Reject overlapping reservations in inventory-holding states before payment preference creation; return a clear conflict response.
- Keep client guest/date selections consistent with the chosen room and explain invalid dates/errors accessibly.
- Provide a public status endpoint authenticated by an HMAC token that returns only the payment state; never return reservation or guest details.
- Use verified server state on success/pending pages and avoid claiming email delivery unless configured.
- Keep mock mode visibly non-production and avoid presenting it as a completed payment.
- Remove hardcoded support details from the payment-failure page by loading public site settings.

### Task 2: Public shell, real content and conversion actions

**Files:** `src/components/sections/About.tsx`, `src/components/sections/SobrePage.tsx`, `src/components/sections/Gallery.tsx`, `src/components/sections/Location.tsx`, `src/components/sections/BookingCTA.tsx`, `src/components/sections/Hero.tsx`, `src/components/sections/Rooms.tsx`, `src/components/sections/RoomDetailPage.tsx`, `src/components/layout/Footer.tsx`, `src/app/api/newsletter/route.ts` (new), `src/lib/data.ts`.

- Replace visible template instructions with existing image assets or honest, compact content states; add a real map embed/link structure.
- Correct the home location grid and position `Image fill` wrappers explicitly.
- Align reserve CTAs to a consistent online flow while preserving the selected room; retain phone/email as secondary actions.
- Add a validated public newsletter subscription endpoint backed by `NewsletterSubscriber`, and return success/error states.
- Make footer anchors work from every route, add legal links, and preserve sensible empty/error states when CMS data is absent.
- Remove or dynamically source unsupported claims and prices; make empty catalog/section states clear.
- Refresh responsive hero spacing and reduce repeated decorative treatments without removing the existing brand palette/type.

### Task 3: Privacy and accessible interaction states

**Files:** `src/app/layout.tsx`, `src/app/globals.css`, `src/components/layout/CookieConsent.tsx`, `src/components/layout/Header.tsx`, `src/components/layout/Footer.tsx`, `src/components/ui/ConsentCheckbox.tsx`, `src/components/sections/FAQ.tsx`, `src/components/sections/Gallery.tsx`, `src/app/reservas/page.tsx`.

- Link the reservation consent to the privacy policy and connect optional analytics to the recorded consent decision.
- Add a skip link and implement accessible mobile navigation and lightbox focus/keyboard behavior.
- Ensure collapsed FAQ answers are hidden semantically and long answers are not clipped.
- Announce asynchronous errors and preserve field guidance.
- Render accurate final metric values for reduced-motion users; animate only when allowed.

### Task 4: CMS-backed metadata and site configuration

**Files:** `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/politica-de-privacidade/page.tsx`, `src/app/termos-de-uso/page.tsx`, `src/app/admin/layout.tsx`, relevant `src/app/admin/**` settings consumers.

- Use configured OG image and public site settings consistently across public/legal/payment pages.
- Generate room sitemap entries from published database records while preserving static legal/home URLs.
- Fix admin drawer toggling, accessible names, and small-screen scroll behavior.
- Avoid implying configured analytics IDs are active when no tracker consumes them; connect only if the existing provider can support the setting without adding a dependency.

### Task 5: Visual consistency and implementation review

**Files:** only the files modified by prior tasks.

- Review spacing, responsive breakpoints, image wrappers, CTA hierarchy, focus states, reduced motion, and empty/error states against A1–A16.
- Do not run or add tests in this pass. Report any implementation points that cannot be completed safely without an external provider or business decision.

## Execution record — 2026-10-29

- Public implementation delivered by `implement_public`; booking/payment implementation delivered by `implement_booking`; CMS, metadata, legal-contact consumers and admin integration completed by the coordinator.
- A1/A4/A6/A8/A13/A14/A15: existing photographs, functioning newsletter persistence, complete navigation, location columns, restrained visual treatments, positioned image wrappers and consistent online reservation destinations.
- A2/A3: server capacity/date validation, transactional checkout holds, authenticated provider verification, HMAC-protected status consultation, no automatic public mock and no email-delivery promises.
- A5/A9: consent-controlled analytics with revocation, private-route/query filtering, policy link, skip links, accessible dialogs, native FAQ and final metric values without animation dependence.
- A7/A10/A11/A12/A16: unsupported fixed claims removed, explicit unavailable-content states, CMS-backed metadata/sitemap/legal contacts, accessible admin navigation and manual payment-review handling.
- Review performed by reading implementation/diffs, checking asset paths and searching removed claims/placeholders. `git diff --check` reported no whitespace issues. No tests, lint, build, dependency installation, commit, publish or external account mutation was performed.
- Configuration: `MERCADO_PAGO_ACCESS_TOKEN` and absolute `NEXT_PUBLIC_BASE_URL` are required for checkout; HTTPS in production. `RESERVATION_STATUS_SECRET` and `MERCADO_PAGO_WEBHOOK_SECRET` are optional documented additions.
- Operational limits: existing pending reservations without expiry keep blocking inventory; late approvals with conflicts enter `payment_review` for staff reconciliation. Admin confirmation now uses the same room lock and rejects capacity or date conflicts before confirming. CMS-provided policies, metrics and image provenance still depend on the operator's content; technical changes do not certify those facts. Browser, provider and concurrent-request execution were not performed in this pass.

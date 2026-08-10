# Task 8: Mercado Pago Reservation System

## Work Log

### Files Created
1. **`src/lib/rate-limit.ts`** — In-memory rate limiter (key → {count, resetAt}), with auto-cleanup every 60s. Exports `rateLimit(key, max, windowMs)` and `getClientIp(request)`.

2. **`src/components/ui/Honeypot.tsx`** — Hidden input field (`opacity-0 h-0 w-0 overflow-hidden pointer-events-none`) to trap bots. If filled, the API silently returns 200.

3. **`src/components/ui/ConsentCheckbox.tsx`** — LGPD consent checkbox using shadcn Checkbox + Label. Links to Privacy Policy text.

4. **`src/app/api/rooms/public/route.ts`** — GET endpoint returning published rooms (id, name, slug, price, capacity, size, bedType, description). Used by the reservation form.

5. **`src/app/api/reservations/create-preference/route.ts`** — POST handler that:
   - Checks honeypot field (silent 200 if filled)
   - Rate limits 3 req/min per IP
   - Validates all inputs (roomId, dates, guest info, consent)
   - Checks room exists and is published
   - Calculates total (room.price × nights)
   - Creates pending Reservation in DB
   - Creates Mercado Pago preference (real or mock)
   - Returns `{init_point, sandbox_init_point, reservationId}`

6. **`src/app/api/reservations/webhook/route.ts`** — POST handler for Mercado Pago webhooks:
   - Parses `data.id` (payment ID) from body
   - Fetches payment details from MP API
   - Maps MP status (approved/rejected/pending/cancelled) to reservation status
   - Updates reservation in DB
   - Returns 200 always

7. **`src/app/reservas/page.tsx`** — Full reservation form ("use client"):
   - Room dropdown (fetched from /api/rooms/public)
   - Date inputs (check-in min=today, check-out min=check-in)
   - Guest count selector (max = room capacity)
   - Personal info (name, email, phone)
   - Price summary card with breakdown (R$ 680 × 3 noites = R$ 2.040)
   - LGPD consent checkbox
   - Honeypot field
   - Submit → POST /api/reservations/create-preference → redirect to MP

8. **`src/app/reservas/sucesso/page.tsx`** — Green success page with reservation ID display, email confirmation notice, "Voltar ao início" button.

9. **`src/app/reservas/falha/page.tsx`** — Red error page with retry button (→ /reservas), phone call button, email button.

10. **`src/app/reservas/pendente/page.tsx`** — Yellow warning page for pending payments with reservation ID, "Voltar ao início" button.

### Files Modified
1. **`src/components/layout/Header.tsx`** — Desktop nav button changed from "Reservar" (#booking) to "Reservas" (/reservas). Mobile drawer now has "Reservar Online" (primary) + "Contato" (secondary outline) buttons.

2. **`src/components/sections/BookingCTA.tsx`** — Added "Reservar Online" button (CreditCard icon, accent color, first position) alongside existing "Ligar Agora" and "Enviar E-mail".

3. **`.env`** — Added `MERCADO_PAGO_ACCESS_TOKEN=` (empty for dev/mock mode) and `NEXT_PUBLIC_BASE_URL=`.

### Lint Status
- **0 errors, 0 warnings** — clean pass

## Reservation Flow

1. Guest visits `/reservas` → form loads with published rooms
2. Guest fills room, dates, guest info, accepts LGPD
3. Guest clicks "Reservar via Mercado Pago"
4. POST to `/api/reservations/create-preference`
5. API validates, creates pending Reservation in DB
6. If `MERCADO_PAGO_ACCESS_TOKEN` is set:
   - Creates real MP preference → redirects to MP checkout
   - On payment, MP calls webhook → updates reservation status
   - MP redirects to sucesso/falha/pendente
7. If no token (dev mode):
   - Returns mock `init_point` → `/reservas/pendente`
   - Reservation stays "pending" in DB

## Mercado Pago Production Setup

1. Set `MERCADO_PAGO_ACCESS_TOKEN` in `.env` to your MP access token
2. Set `NEXT_PUBLIC_BASE_URL` to your public URL (e.g., `https://seusite.com.br`)
3. Configure webhook URL in MP dashboard: `https://seusite.com.br/api/reservations/webhook`
4. Back URLs are auto-generated using `NEXT_PUBLIC_BASE_URL`

## Errors
- None. Lint passes cleanly.

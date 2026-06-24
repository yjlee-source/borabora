# BoraBora BRG

Personal hotel BRG dashboard for favorite hotels. It stores your preferred Marriott, Hilton, Hyatt, and Accor hotels, runs one-off rate checks, and keeps official/third-party results with source links for manual BRG review.

## What Works Now

- Next.js App Router dashboard for favorite hotels, one-to-seven-night searches, recent results, encrypted chain credentials, and promotion drafts.
- API routes for hotels, credentials, search runs, search-run status, dashboard data, and promotion refresh.
- Unified connector interface for `official`, `google`, `booking`, and `agoda`.
- BRG same-condition filters for room keyword, bed type, cancellation policy, meal plan, taxes/fees, payment timing, and publicly bookable rates.
- Saved search presets for reusable BRG options while hotel and dates remain per-search.
- Policy-based BRG prediction badges using curated Marriott, Hilton, Hyatt, and Accor policy summaries.
- Demo rate output when `BROWSERLESS_WS_ENDPOINT` is not configured, so the app can be tested before connecting Browserless or another remote Chromium service.
- AES-256-GCM encryption for stored chain passwords. Passwords are never returned by the API.

## Local Setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL="file:./dev.db"` for local SQLite.
3. Set `APP_ENCRYPTION_KEY` with a base64 32-byte key.
4. Install dependencies, then run:

```bash
pnpm db:push
pnpm dev
```

## Vercel Notes

- Use Vercel Deployment Protection or equivalent access control so only you can open the dashboard.
- For production Postgres, switch `prisma/schema.prisma` datasource provider to `postgresql`, set `DATABASE_URL` to Vercel Postgres, and run the migration/deploy flow.
- Set `BROWSERLESS_WS_ENDPOINT` to a remote Chromium CDP endpoint for real browser automation.
- Keep `PERSONAL_ACCESS_TOKEN` empty if you rely on Vercel Deployment Protection for the web UI. If set, direct API calls must include `Authorization: Bearer <token>`.

## Automation Limits

The generic browser runner intentionally does not bypass CAPTCHA, MFA, bot protection, or site access controls. Source-specific selectors and login flows should be added per hotel chain and OTA. Each extracted cash rate should set `conditionMatch` to `MATCH`, `MISMATCH`, or `UNKNOWN` so BRG candidates are not chosen by price alone.

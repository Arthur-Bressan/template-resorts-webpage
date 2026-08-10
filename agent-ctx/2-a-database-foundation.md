# Task 2-a: Database Foundation Agent

## Files Created/Modified

### Modified:
1. **`prisma/schema.prisma`** — Replaced placeholder User/Post models with 16 production models
2. **`src/lib/db.ts`** — Updated singleton Prisma client with Prisma 7 adapter (`PrismaBetterSqlite3`)
3. **`.env`** — Added `ADMIN_SECRET` and `NEXT_PUBLIC_ADMIN_EMAIL`
4. **`package.json`** — Added `prisma` seed command and `prisma.config.ts` reference

### Created:
5. **`prisma/seed.ts`** — Comprehensive seed script with all site data from `src/data/site.ts` and `src/data/sobre.ts`
6. **`src/lib/auth.ts`** — Auth utilities: `hashPassword`, `verifyPassword`, `generateToken`, `verifyToken`
7. **`prisma.config.ts`** — Prisma 7 configuration (datasource URL + seed command)
8. **`agent-ctx/2-a-database-foundation.md`** — This worklog

### Installed packages:
- `bcryptjs` + `@types/bcryptjs` (password hashing)
- `@prisma/client` (Prisma 7 runtime)
- `prisma` (devDependency — Prisma 7 CLI)
- `@prisma/adapter-better-sqlite3` + `better-sqlite3` + `@types/better-sqlite3` (SQLite driver adapter for Prisma 7)

## Database Tables Created (16 models)

| # | Table | Purpose |
|---|-------|---------|
| 1 | Admin | Admin authentication (email, bcrypt hash, role) |
| 2 | SiteSetting | Singleton site config (contact info, socials, SEO) |
| 3 | NavLink | Navigation menu items |
| 4 | Room | Accommodation listings |
| 5 | RoomImage | Room gallery images (cascade delete) |
| 6 | RoomAmenity | Room amenity tags (cascade delete) |
| 7 | Experience | Activity listings |
| 8 | GalleryImage | Photo gallery items |
| 9 | Testimonial | Guest reviews |
| 10 | FAQ | Frequently asked questions |
| 11 | AboutAmenity | About page amenity grid |
| 12 | Distance | Nearby locations with distance/time |
| 13 | Direction | Driving/transit directions |
| 14 | SensoryConfig | About page sensory text (singleton, JSON paragraphs) |
| 15 | Stat | Footer stats (counters) |
| 16 | NewsletterSubscriber | Newsletter email signups |
| 17 | ContactSubmission | Contact form submissions |
| 18 | Reservation | Booking reservations (with MercadoPago fields) |

## Seed Results

| Table | Records |
|-------|---------|
| Admin | 1 (admin@refugio.com / admin123) |
| SiteSetting | 1 (singleton) |
| NavLink | 7 |
| Room | 4 |
| RoomImage | 15 |
| RoomAmenity | 29 |
| Experience | 4 |
| GalleryImage | 6 |
| Testimonial | 3 |
| FAQ | 7 |
| AboutAmenity | 12 |
| Distance | 7 |
| Direction | 4 |
| SensoryConfig | 1 (singleton) |
| Stat | 4 |
| **Total** | **~105 records** |

## Prisma 7 Notes

- Prisma 7 requires a **driver adapter** (no more direct datasource URL in schema)
- `prisma.config.ts` uses `defineConfig()` from `prisma/config` for datasource URL and seed command
- Schema `datasource` block no longer has `url = env(...)` — URL comes from config
- `PrismaBetterSqlite3` constructor takes `{ url: 'file:...' }` object (not a raw string)
- `db push` works with `--url` flag or via `prisma.config.ts`

## Errors Encountered & Resolved

1. **Prisma 7 schema validation**: `url` property no longer supported in `datasource` block → removed it, created `prisma.config.ts`
2. **`@prisma/client` not found**: Prisma 7 doesn't auto-install → ran `bun add @prisma/client`
3. **Seed config format changed**: Prisma 7 requires seed in `prisma.config.ts`, not `package.json` → added to config
4. **`prisma/config` module not found**: CLI-only package → installed `prisma` as devDependency
5. **Driver adapter required**: Prisma 7 requires adapter → installed `@prisma/adapter-better-sqlite3` + `better-sqlite3`
6. **Adapter export name**: `PrismaBetterSqlite3` not `PrismaBetterSQLite3` → fixed case
7. **Adapter constructor signature**: Takes `{ url }` object, not raw string → fixed constructor call

## Lint Status
✅ Clean — 0 errors, 0 warnings

## Database File
- Location: `/home/z/my-project/db/custom.db`
- Size: ~180KB
- Engine: SQLite via better-sqlite3 adapter

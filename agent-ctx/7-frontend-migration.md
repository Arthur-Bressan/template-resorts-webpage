---
Task ID: 7
Agent: Frontend Migration Agent
Task: Migrate public-facing frontend from hardcoded data files to Prisma database

## Files Created

### `src/lib/data.ts`
New data-fetching layer with all TypeScript interfaces and async functions:
- `getSiteConfig()` — fetches SiteSetting (singleton), NavLinks, Stats
- `getRooms(publishedOnly?)` — fetches rooms with images and amenities
- `getRoomBySlug(slug)` — fetches single room by slug
- `getExperiences(publishedOnly?)` — fetches experiences
- `getGalleryImages(publishedOnly?)` — fetches gallery images
- `getTestimonials(publishedOnly?)` — fetches testimonials
- `getFAQs(publishedOnly?)` — fetches FAQ items
- `getAboutData()` — fetches AboutAmenity, Distance, Direction, SensoryConfig, Stats

All interfaces exported: SiteSettings, NavLink, Stat, Room, RoomImage, RoomAmenity, Experience, GalleryImage, Testimonial, FAQ, AboutAmenity, Distance, Direction, SensoryConfig

## Files Modified

### Page Components (converted to async server components)

1. **`src/app/page.tsx`** — Removed `"use client"`, converted to async server component. Fetches all data via `getSiteConfig()`, `getRooms()`, `getExperiences()`, `getGalleryImages()`, `getTestimonials()`, `getFAQs()` in parallel. Passes data as props to all child sections.

2. **`src/app/sobre/page.tsx`** — Removed `"use client"`, converted to async server component. Fetches site config and about data. Passes to SobrePage component.

3. **`src/app/quartos/[slug]/page.tsx`** — Removed `"use client"`, converted to async server component. Fetches room by slug and all rooms for the "also like" section.

4. **`src/app/quartos/[slug]/layout.tsx`** — Updated `generateMetadata()` and `generateStaticParams()` to use `getRoomBySlug()` and `getRooms()` from DB instead of hardcoded imports.

5. **`src/app/layout.tsx`** — Converted `metadata` export to async `generateMetadata()` that reads from DB. Layout now fetches SiteSetting to pass `siteSettings` to WhatsAppFloat.

### Section Components (kept as "use client", now accept props)

6. **`src/components/layout/Header.tsx`** — Added `HeaderProps { siteSettings, navLinks }`. Removed `import { navLinks, siteConfig } from "@/data/site"`. Uses `siteSettings.name` instead of `siteConfig.name`.

7. **`src/components/layout/Footer.tsx`** — Added `FooterProps { siteSettings, stats }`. Removed `import { siteConfig, stats } from "@/data/site"`. Uses `siteSettings.*` for name, description, phone, email, address, social links.

8. **`src/components/sections/Hero.tsx`** — Added `HeroProps { siteSettings }`. Removed `import { siteConfig } from "@/data/site"`. Uses `siteSettings.tagline`.

9. **`src/components/sections/Rooms.tsx`** — Added `RoomsProps { rooms }` with `Room` type. Removed `import { rooms } from "@/data/site"`. RoomCard uses `Room` type from data.ts instead of inferred type.

10. **`src/components/sections/Experiences.tsx`** — Added `ExperiencesProps { experiences }`. Removed `import { experiences } from "@/data/site"`. ExperienceCard uses `Experience` type.

11. **`src/components/sections/Gallery.tsx`** — Added `GalleryProps { galleryImages }`. Removed `import { galleryImages } from "@/data/site"`. GalleryItem uses `GalleryImage` type.

12. **`src/components/sections/Testimonials.tsx`** — Added `TestimonialsProps { testimonials }`. Removed `import { testimonials } from "@/data/site"`. TestimonialCard uses `Testimonial` type.

13. **`src/components/sections/FAQ.tsx`** — Added `FAQProps { faqItems }`. Removed `import { faqItems } from "@/data/site"`. Uses `FAQ` type from data.ts (aliased to avoid naming conflict).

14. **`src/components/sections/BookingCTA.tsx`** — Added `BookingCTAProps { siteSettings }`. Removed `import { siteConfig } from "@/data/site"`. Uses `siteSettings.phone` and `siteSettings.email`.

15. **`src/components/sections/Location.tsx`** — Added `LocationProps { siteSettings }`. Removed `import { siteConfig } from "@/data/site"`. Uses `siteSettings.lat` and `siteSettings.lng`.

16. **`src/components/sections/SobrePage.tsx`** — Added `SobrePageProps { siteSettings, amenities, distances, directions, sensory }`. Removed all imports from `@/data/sobre` and `@/data/site`. All sub-components (AmenitiesSection, LocationSection, SensorySection, FinalCTA, LodgingSchema) receive data via props.

17. **`src/components/sections/RoomDetailPage.tsx`** — Added `RoomDetailPageProps { room, allRooms, siteSettings }`. Removed all imports from `@/data/site"`. All sub-components receive room/siteSettings data via props.

18. **`src/components/ui/WhatsAppFloat.tsx`** — Added `WhatsAppFloatProps { siteSettings }`. Removed `import { siteConfig } from "@/data/site"`. Uses `siteSettings.whatsapp`.

### Components NOT Modified (no data file imports)
- `About.tsx` — Uses hardcoded content, no data file imports
- `SocialProof.tsx` — Uses hardcoded badges, no data file imports
- `not-found.tsx` — Not in migration scope, still uses fallback data file

## Errors Encountered

None. Lint passed cleanly with 0 errors.

## Pattern Summary

The migration follows the standard Next.js server/client component data flow:
1. **Server component** (page.tsx) fetches data from Prisma DB
2. **Data is passed as typed props** to client components
3. **Client components** ("use client") remain unchanged in behavior, just receive data via props instead of direct imports
4. **Admin pages and API routes** were not touched
5. **Original data files** (`src/data/site.ts`, `src/data/sobre.ts`) preserved as reference/fallback

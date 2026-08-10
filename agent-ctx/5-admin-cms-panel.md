# Task 5: Admin CMS Panel

## Agent: Admin CMS Panel Agent

### Files Created

1. `src/lib/admin-client.ts` — Client-side admin API helper with auth, CRUD for all entities, upload, and dashboard
2. `src/components/admin/ImageUpload.tsx` — Reusable image upload component (URL or file upload)
3. `src/app/admin/login/page.tsx` — Login page with email/password, centered card, credentials hint
4. `src/app/admin/layout.tsx` — Admin layout with dark sidebar navigation, mobile hamburger, auth check, header bar
5. `src/app/admin/page.tsx` — Dashboard with 6 stat cards + recent contacts list
6. `src/app/admin/rooms/page.tsx` — Rooms list with publish toggle, edit/delete
7. `src/app/admin/rooms/new/page.tsx` — Create room form with images + amenities management
8. `src/app/admin/rooms/[id]/page.tsx` — Edit room form (same fields as create)
9. `src/app/admin/experiences/page.tsx` — Experiences list with delete
10. `src/app/admin/experiences/[id]/page.tsx` — Create/edit experience form (doubles as new page via `/new`)
11. `src/app/admin/gallery/page.tsx` — Gallery grid with add/edit/delete dialog, span class selector
12. `src/app/admin/testimonials/page.tsx` — Testimonials list with star ratings
13. `src/app/admin/testimonials/[id]/page.tsx` — Create/edit testimonial form with star rating picker
14. `src/app/admin/faq/page.tsx` — FAQ list with delete
15. `src/app/admin/faq/[id]/page.tsx` — Create/edit FAQ form
16. `src/app/admin/about/page.tsx` — About page editor with 5 tabs (amenities, distances, directions, sensory, stats)
17. `src/app/admin/settings/page.tsx` — Site settings with 5 tabs (basic, contact, social, brand, SEO)
18. `src/app/admin/newsletter/page.tsx` — Newsletter subscribers table with search
19. `src/app/admin/contacts/page.tsx` — Contact submissions with read/unread filter, expand, mark as read
20. `src/app/admin/nav-links/page.tsx` — Navigation links editor with reorder up/down
21. `src/app/admin/reservations/page.tsx` — Reservations management with status filter and inline status update

### Total Admin Pages: 17

### Design
- Clean CMS admin look: `bg-gray-50` background, `bg-gray-900` dark sidebar, white cards
- Visually distinct from the public site (no glassmorphism, no GSAP animations, no green theme)\n- Responsive: sidebar collapses to hamburger on mobile
- Professional navigation with 12 items and Lucide icons

### Lint Status
- **0 errors, 0 warnings** — clean pass

### Notes
- All pages are `"use client"` components
- API routes are handled by another agent (Task 6)
- Experiences and Testimonials use dynamic `[id]` routes that handle both create (id=`new`) and edit
- Admin auth uses localStorage for token/user storage with automatic 401 redirect

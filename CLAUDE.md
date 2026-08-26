# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- **Build:** `npm run build`
- **Dev server:** `npm run dev`
- **Production server:** `npm run start`
- **Lint:** `npm run lint`
- **Format:** `npx prettier --write .` or `npx prettier --write <file>`
- **Type check:** `npx tsc --noEmit`
- **Prisma migrate:** `npx prisma migrate dev`
- **Prisma generate:** `npx prisma generate`
- **Test:** `npm test` (single run) or `npm run test:watch` (watch mode)

## Architecture

**Warrior Wives Unite** is a Next.js 14 App Router application for military spouses to connect through groups and events. It uses Supabase (PostgreSQL + file storage), Auth.js v5 with Google OAuth, and SheerID for military verification.

### Authentication & Authorization Flow
1. Users sign in via Google OAuth (Auth.js v5, configured in `src/auth.ts`)
2. `src/middleware.ts` protects routes: `/groups`, `/members`, `/all-groups`, `/all-members`, `/verification`, `/community`
3. After sign-in, users must complete military verification via SheerID (`manualVerified` flag on User model)
4. `UserVerifiedRoute` component (used in page layouts) enforces both auth AND verification before rendering
5. API routes call `await auth()` and throw custom errors from `src/lib/errors.ts` (`UnauthenticatedError`, `UnauthorizedError`)
6. Super users (`superUser: true`) have elevated privileges (e.g., creating groups)

### Data Flow Patterns
- **Server Components:** Fetch data via functions in `src/data/` which call API routes with `next: { tags, revalidate }` caching
- **Client Components:** Use SWR with `src/apiClient.ts` as the fetcher for interactive data
- **Mutations:** Client components call API routes directly, then `router.refresh()` to revalidate server data
- **API routes** each have a `helper.ts`/`helpers.ts` with shared Prisma queries and type exports

### Key Files
- `src/auth.ts` — NextAuth v5 configuration (Google provider, Prisma adapter, JWT strategy)
- `src/middleware.ts` — Route protection
- `src/prisma.ts` — Prisma client singleton (prevents connection exhaustion in dev)
- `src/apiClient.ts` — Client-side fetch wrapper with `NEXT_PUBLIC_API_URL` base
- `src/lib/errors.ts` — Custom error classes used across API routes
- `src/resend.ts` — Email sending (Resend) with React Email templates and ICS calendar attachments
- `src/supabase.ts` — Supabase client for file storage (group banners, event photos, profile images)
- `prisma/schema.prisma` — Database schema

### Database Models (Prisma)
Core models: **User**, **Group**, **Event**, **Interest**
Junction tables: `MembersOnGroups` (has `admin` flag), `AttendeesOnEvents`, `OrganizersOnEvents`, `InterestsOnUsers`, `TagsOnGroups`
Groups can be password-protected (`passwordEnabled`, `password`) and archived.

### Deployment
Production runs on **Render** (web service `warriorwives`, srv-cohucqf79t8c7388dodg, https://warriorwives.onrender.com, Ohio, starter plan, auto-deploys from `main`). The `fly.toml`/`Dockerfile` are from an old Fly.io setup and are not used by Render (build: `npm install; npx prisma migrate deploy; npx prisma generate; npm run build`). Note: Chakra/Emotion inlines ~237 KB of `<style>` into every SSR response, so every page (including 404s) is ~251 KB uncompressed.

### Styling
Hybrid approach: Tailwind CSS + Chakra UI (with custom theme in `src/theme/`) + shadcn/ui components in `src/components/ui/`. Chakra provider wraps the app via `src/providers/chakraProvider.tsx`.

## Code Style
- TypeScript strict mode; double quotes, semicolons required
- Max line length: 80 chars, 2-space indentation
- Path alias: `@/*` → `./src/*`
- Component files: PascalCase; utility files: camelCase
- Form validation: yup or zod with `react-hook-form`
- Pre-commit hooks via husky + lint-staged (prettier + eslint)

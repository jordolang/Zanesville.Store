# Repository Guidelines

## Project Structure & Module Organization
Next.js App Router code lives under `src/app/(site)` with shared context providers and CSS in `src/app/context` and `src/app/css`. UI pieces sit in `src/components`, grouped by domain (`Home`, `Blog`, `Common`, etc.) to keep reuse high. Global state is centralized in `src/redux` (Redux Toolkit slices, store, and providers), while shared TypeScript contracts stay in `src/types`. Static assets (images, fonts, favicons) belong in `public/` and are referenced via `/asset-name`. Keep configuration (Tailwind, PostCSS, tsconfig) at the repo root so edits remain obvious in pull requests.

## Build, Test, and Development Commands
Run `npm install` before contributing. Use `npm run dev` for the local dev server, `npm run build` for the production bundle, and `npm run start` to serve the optimized build. Execute `npm run lint` to apply the Next.js + ESLint ruleset; the CI gate rejects PRs that fail linting, so run it before opening a review. Once Prisma models change, run `npx prisma generate` to refresh the typed client before committing.

## Database & Prisma Workflow
Copy `.env.example` to `.env.local` and drop in the `DATABASE_URL`, `POSTGRES_URL`, and `PRISMA_DATABASE_URL` strings from Vercel (Project → Storage → prisma-postgres-zanesville-store). Never commit the populated file. Use `npm run db:push` for schema-only syncing during UI work and `npm run db:migrate -- --name <change>` when evolving the production data model. Query the database through the shared client in `src/lib/prisma.ts`, or via REST endpoints such as `src/app/api/products/route.ts` when you need server actions. Seed scripts should live in `prisma/seed.ts` and be referenced with `npx prisma db seed`.

## Coding Style & Naming Conventions
Stick to TypeScript, functional components, and 2-space indentation as seen in `src/app/(site)/layout.tsx`. Prefer named exports for reusable components and colocate styles via Tailwind utility classes; global CSS changes go through `src/app/css`. Use PascalCase for components (`HeaderBar.tsx`), camelCase for hooks/utilities, and SCREAMING_SNAKE_CASE for environment variables in `.env.local`. Keep props typed with explicit interfaces and avoid `any` unless there is a TODO explaining why.

## Testing Guidelines
No automated test runner ships with this template yet, so rely on linting plus manual UI verification in multiple viewports. When you add Jest or React Testing Library, place specs under `src/__tests__` or next to the component with a `.test.tsx` suffix, mirror the component name (`ProductCard.test.tsx`), and cover Redux interactions alongside rendering states. Document any new testing command in `package.json` and this guide.

## Commit & Pull Request Guidelines
History currently only shows `Initial commit`, so establish clarity by using present-tense, 72-character-or-shorter subject lines, ideally following `<type>: <summary>` (e.g., `feat: add hero carousel filter`). Each PR should describe the change, note impacted routes/components, link related issues, and attach screenshots for UI updates (desktop + mobile). Rebase on `main`, ensure `npm run build && npm run lint` succeed locally, and tag reviewers once the branch is clean.

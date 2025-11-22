# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview
NextMerce - A Next.js 15 eCommerce template built with TypeScript, React 19, Redux Toolkit, and Tailwind CSS. This is a free/lite version with static pages and demo functionality (no backend integrations).

## Development Commands

### Core Commands
```bash
npm run dev          # Start development server on http://localhost:3000
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing
This project does not include a test suite. When adding tests, follow Next.js 15 conventions with Jest or Vitest.

## Architecture

### Tech Stack
- **Framework**: Next.js 15.2.3 (App Router)
- **React**: 19.0.0
- **TypeScript**: 5.2.2
- **State Management**: Redux Toolkit 2.6.1
- **Styling**: Tailwind CSS 3.3.3 with custom design system
- **UI Libraries**: Swiper 10.2.0, react-hot-toast 2.4.1, react-range-slider-input 3.0.7

### Project Structure

#### App Router (`src/app/`)
- Uses Next.js App Router with route groups
- `(site)/` - Main site route group containing:
  - `(pages)/` - Shop, cart, checkout, account, contact, auth pages
  - `blogs/` - Blog listing and detail pages
  - `layout.tsx` - Root layout with providers and modals
  - `page.tsx` - Homepage

#### Component Organization (`src/components/`)
Components are organized by feature/page:
- **Page Components**: `Home/`, `Shop/`, `ShopDetails/`, `Cart/`, `Checkout/`, `Auth/`, `Blog/`, etc.
- **Common**: Shared components (modals, newsletter, scroll-to-top, preloader)
- **Layout**: `Header/`, `Footer/`

Each page component typically contains:
- Main `index.tsx` component
- Associated data files (e.g., `blogData.ts` for blog content). Product inventory is streamed from Prisma via `src/lib/productCatalog.ts`.
- Sub-components in nested folders

#### State Management (`src/redux/`)
Redux Toolkit slices:
- `cart-slice.ts` - Shopping cart state (add/remove items, update quantity)
- `wishlist-slice.ts` - Wishlist functionality
- `quickView-slice.ts` - Quick view modal state
- `product-details.ts` - Product detail view state

Custom hook: `useAppSelector` for typed Redux selectors

#### Context Providers (`src/app/context/`)
React Context for UI state:
- `CartSidebarModalContext.tsx` - Cart sidebar visibility
- `QuickViewModalContext.tsx` - Quick view modal visibility
- `PreviewSliderContext.tsx` - Product preview slider state

#### Type Definitions (`src/types/`)
- `product.ts` - Product interface with pricing, images, reviews
- `category.ts` - Category types
- `blogItem.ts` - Blog post types
- `testimonial.ts` - Testimonial types
- `Menu.ts` - Navigation menu types

#### Data Structure
Static content data stored in component-specific files:
- `src/components/BlogGrid/blogData.ts` - Blog posts
- `src/components/Home/Categories/categoryData.ts` - Category data
- `src/components/Header/menuData.ts` - Navigation structure
- Product data now lives inside the SQLite Prisma database and is fetched through `src/lib/productCatalog.ts`.

### Styling System

#### Tailwind Configuration
Custom design system with:
- **Custom Colors**: Full palette including blue, red, green, yellow, teal, orange with variants
- **Custom Font**: Euclid Circular A (loaded via `euclid-circular-a-font.css`)
- **Extended Spacing**: Granular spacing scale from 4.5 to 90 (rem-based)
- **Custom Font Sizes**: Heading scales (1-6) and custom sizes (xl, lg, sm, xs, 2xl, 4xl, etc.)
- **Breakpoints**: Includes xsm (375px), lsm (425px), 3xl (2000px) plus standard breakpoints

#### Path Aliases
- `@/*` resolves to `src/*`

### Key Implementation Patterns

1. **Client-Side Rendering**: Root layout uses `"use client"` - entire app is client-rendered
2. **Provider Nesting**: Redux → Cart Modal → Quick View Modal → Preview Slider contexts
3. **Modal System**: Three global modals managed via context (cart sidebar, quick view, image preview)
4. **Product Images**: Each product has `thumbnails[]` and `previews[]` arrays
5. **Preloader**: 1-second loading screen on initial mount
6. **Static Data**: Blogs and categories are hardcoded, but products now come from Prisma via `/api/products`.

## Code Style Guidelines

### TypeScript
- `strict: false` in tsconfig - be mindful of type safety
- Use type imports from `@/types/` for domain models
- Redux types: `RootState`, `AppDispatch` exported from store

### Component Patterns
- Functional components with TypeScript
- Client components use `"use client"` directive
- Use Redux hooks (`useAppSelector`, `useDispatch`) for state
- Use context hooks for UI modal state

### Naming Conventions
- Component files: PascalCase `index.tsx` or descriptive names
- Data files: camelCase with `Data` suffix (e.g., `shopData.ts`)
- Redux slices: kebab-case files, camelCase exports

## Adding New Features

### Adding Products
1. Update/replace the CSV used by `prisma/seed.ts` (default: `Zanesville-store-lists/facebook_inventory_detailed.csv`).
2. Run `npm run db:seed` (or `DATABASE_URL="file:./zanesville-store.db" npx prisma db seed`) to regenerate `prisma/zanesville-store.db`.
3. Ensure any new image hosts are allowed in `next.config.js` or add fallback images in `/public/images/products/`.

### Adding Pages
1. Create page in `src/app/(site)/(pages)/[page-name]/page.tsx`
2. Create corresponding component in `src/components/[PageName]/`
3. Add navigation links to `src/components/Header/menuData.ts`

### Adding Redux State
1. Create slice in `src/redux/features/[feature]-slice.ts`
2. Add reducer to `src/redux/store.ts`
3. Export selectors and actions from slice

### Adding Modals
1. Create context in `src/app/context/[Modal]Context.tsx`
2. Add provider to `src/app/(site)/layout.tsx`
3. Create modal component in `src/components/Common/`

## Important Notes

- **No Backend**: Auth, checkout, and account flows remain UI-only; product data is the only live source via Prisma.
- **Database**: SQLite file (`prisma/zanesville-store.db`) seeded from `facebook_inventory_detailed.csv`.
- **Image Paths**: Images use absolute paths from `/public/` (e.g., `/images/products/...`) unless loaded remotely via Next Image remote patterns.
- **ESLint Config**: Uses Next.js core web vitals preset
- **TypeScript Strict Mode**: Disabled - be cautious with typing

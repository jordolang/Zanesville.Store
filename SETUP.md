# Zanesville Store - Setup Guide

## Overview
Zanesville Store is a fully functional eCommerce platform built with Next.js 15, featuring real product inventory, authentication, and payment processing.

## Features Implemented
✅ **370 Real Products** - Seeded from Facebook inventory CSV  
✅ **Dynamic Categories** - Furniture, Home Decor, Electronics, Bedding, etc.  
✅ **User Authentication** - NextAuth.js with credentials provider  
✅ **Payment Processing** - Stripe checkout integration  
✅ **Responsive Design** - Mobile-first Tailwind CSS  
✅ **Product Images** - Amazon and S3 CDN integration  
✅ **Shopping Cart** - Redux state management  
✅ **SEO Optimized** - Proper metadata for all pages  

## Store Information
- **Name**: Zanesville Store
- **Address**: 2010 BeechRock Circle, Zanesville, OH 43701
- **Phone**: (740) 555-1234
- **Email**: info@zanesvillestore.com

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup
The SQLite database is already set up with 370 products. To regenerate:
```bash
npm run db:seed
```

### 3. Environment Variables
Copy `.env.local.example` to `.env.local` and configure:

```env
# Database (already configured)
DATABASE_URL="file:./prisma/zanesville-store.db"

# NextAuth (already configured)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"

# Stripe (ADD YOUR KEYS)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# App URL
NEXT_PUBLIC_URL="http://localhost:3000"
```

### 4. Get Stripe API Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Create an account or sign in
3. Copy your **Publishable key** and **Secret key**
4. Add them to `.env.local`

### 5. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Authentication

### Creating User Accounts
Users can register at `/signup` with:
- Name
- Email
- Password (hashed with bcrypt)

### Signing In
Users can sign in at `/signin` with:
- Email
- Password

### Protected Routes
- `/my-account` - User dashboard
- `/checkout` - Checkout process

## Payment Integration

### Stripe Checkout Flow
1. User adds items to cart
2. User goes to `/checkout`
3. Clicks "Proceed to Payment"
4. Redirected to Stripe Checkout
5. After payment, redirected to `/mail-success`

### Testing Stripe
Use test card numbers:
- **Success**: `4242 4242 4242 4242`
- **Requires authentication**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

Any future expiration date, any 3-digit CVC

## Product Management

### Adding Products
Products are managed via the Prisma database:

```bash
# Edit CSV file
nano Zanesville-store-lists/facebook_inventory_detailed.csv

# Reseed database
npm run db:seed
```

### Product Schema
- Title
- Description  
- Price & Discounted Price
- Category
- Images (thumbnails & previews)
- Brand, ASIN, Features

## Categories

Real categories from inventory:
- Bedding & Textiles
- Furniture
- Home Decor
- Electronics & Small Appliances
- Lighting & Electrical
- Apparel
- Pet Supplies
- Baby & Safety
- Health & Personal Care
- Miscellaneous

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products?take=10` - Limit results

### Categories
- `GET /api/categories` - Get all categories with product counts

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/[...nextauth]` - NextAuth endpoints

### Checkout
- `POST /api/checkout` - Create Stripe checkout session

## Development Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Database commands
npm run db:generate    # Generate Prisma Client
npm run db:push        # Push schema changes
npm run db:migrate     # Create migration
npm run db:seed        # Seed database

# Linting
npm run lint
```

## File Structure

```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── categories/   # Categories API
│   │   ├── checkout/     # Stripe checkout
│   │   └── products/     # Products API
│   ├── (site)/           # Main site routes
│   └── context/          # React contexts
├── components/           # React components
│   ├── Auth/            # Sign in/up components
│   ├── Cart/            # Shopping cart
│   ├── Checkout/        # Checkout flow
│   ├── Common/          # Shared components
│   ├── Header/          # Navigation
│   ├── Footer/          # Site footer
│   ├── Home/            # Homepage sections
│   └── Shop/            # Product browsing
├── lib/                 # Utilities
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma client
│   └── stripe.ts        # Stripe client
├── redux/               # State management
│   └── features/        # Redux slices
└── types/               # TypeScript types

prisma/
├── schema.prisma        # Database schema
├── migrations/          # DB migrations
├── seed.ts             # Data seeding
└── zanesville-store.db # SQLite database
```

## Next Steps

### Required for Production
1. **Add Stripe Keys** to `.env.local`
2. **Update Logo** at `/public/images/logo/logo.svg`
3. **SSL Certificate** for HTTPS
4. **Update NEXTAUTH_URL** to production domain
5. **Configure Email** for order confirmations
6. **Set up Stripe Webhooks** for payment events

### Optional Enhancements
1. **Sanity CMS** - Content management for blogs
2. **Google OAuth** - Social login
3. **Email Verification** - Verify user emails
4. **Product Reviews** - User reviews system
5. **Inventory Management** - Real-time stock tracking
6. **Order History** - User order tracking
7. **Admin Dashboard** - Manage orders and products

## Troubleshooting

### Database Issues
```bash
# Reset database
rm prisma/zanesville-store.db
npx prisma migrate reset
npm run db:seed
```

### Build Errors
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

### Auth Not Working
- Check `NEXTAUTH_SECRET` is set in `.env.local`
- Verify `NEXTAUTH_URL` matches your domain
- Clear browser cookies

### Stripe Errors
- Verify API keys are correct
- Check keys match (test vs live)
- Ensure `.env.local` is loaded

## Support

For issues or questions:
- Email: info@zanesvillestore.com
- Phone: (740) 555-1234

## Technology Stack

- **Framework**: Next.js 15.2.3 (App Router)
- **Language**: TypeScript 5.2.2
- **Database**: SQLite with Prisma ORM
- **Authentication**: NextAuth.js
- **Payments**: Stripe
- **State**: Redux Toolkit
- **Styling**: Tailwind CSS
- **UI**: React 19, Swiper, React Hot Toast

## License

Proprietary - Zanesville Store © 2024

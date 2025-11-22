# Free eCommerce Template for Next.js - NextMerce

The free Next.js eCommerce template is a lite version of the NextMerce Next.js eCommerce boilerplate, designed to streamline the launch and management of your online store.

![NextMerce](https://github.com/user-attachments/assets/57155689-a756-4222-8af7-134e556acae2)


While NextMerce Pro features advanced functionalities, seamless integration, and customizable options, providing all the essential tools needed to build and expand your business, the lite version offers a basic Next.js template specifically crafted for eCommerce websites. Both versions ensure superior performance and flexibility, all powered by Next.js.

### NextMerce Free VS NextMerce Pro

| ✨ Features                         | 🎁 NextMerce Free                 | 🔥 NextMerce Pro                        |
|----------------------------------|--------------------------------|--------------------------------------|
| Next.js Pages                    | Static                         | Dynamic Boilerplate Template         |
| Components                       | Limited                        | All According to Demo                |
| eCommerce Functionality          | Included                       | Included                             |
| Integrations (DB, Auth, etc.)    | Not Included                   | Included                             |
| Community Support                | Included                       | Included                             |
| Premium Email Support            | Not Included                   | Included                             |
| Lifetime Free Updates            | Included                       | Included                             |


#### [🚀 Live Demo](https://demo.nextmerce.com/)

#### [🌐 Visit Website](https://nextmerce.com/)

## Local Product Inventory

This fork ships with the `facebook_inventory_detailed.csv` catalog wired into Prisma. The SQLite database (`prisma/zanesville-store.db`) is generated from that CSV and committed so you can browse the inventory immediately in `npm run dev`.

To rebuild the catalog from the CSV (or a refreshed export):

1. Copy `.env.example` to `.env.local` – the default `DATABASE_URL="file:./zanesville-store.db"` already points at `prisma/zanesville-store.db`.
2. Install dependencies with `npm install`.
3. Run `npm run db:push` to sync the schema (recreates the SQLite file if needed).
4. Run `npm run db:seed` (or `FACEBOOK_INVENTORY_PATH=/path/to/facebook_inventory_detailed.csv npm run db:seed`) to import the CSV rows.

The product API (`/api/products`) and every UI grid now renders straight from Prisma, so updating the CSV + re-seeding automatically refreshes the storefront.

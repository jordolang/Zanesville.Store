# Product Seeding Guide

## Overview
This store now uses an enhanced seeding process that combines inventory data from your CSV with rich product details scraped from Amazon JSON files.

## What's Included

### Data Sources
1. **CSV Inventory** (`Zanesville-store-lists/facebook_inventory_detailed.csv`)
   - Product titles, SKUs, pricing, categories
   - Primary source of truth for inventory and pricing

2. **Amazon Product JSON** (`public/images/products/*.json`)
   - 242 scraped Amazon product files
   - Rich data: multiple images, descriptions, ratings, reviews, features, brand info

## Running the Enhanced Seed

### Quick Start
```bash
# Run the enhanced seed (recommended)
npm run db:seed:enhanced
```

### What It Does
The enhanced seed script:
1. Loads all 242 Amazon JSON files
2. Loads your CSV inventory
3. **Intelligently matches** products using fuzzy title matching
4. Merges data from both sources:
   - ✅ **Multiple images** from Amazon (avg 6 images vs 1 placeholder)
   - ✅ **Ratings & review counts** from Amazon
   - ✅ **Detailed descriptions** from Amazon
   - ✅ **Product features** bullet points
   - ✅ **Brand information**
   - ✅ **Accurate pricing** from your CSV

### Match Results
Latest seed results:
- **370 products** imported
- **295 products (79.7%)** matched with Amazon data
- **75 products** use CSV data only (no match found)

## Database Schema

### New Product Fields
- `rating` - Star rating from Amazon (e.g., 4.5)
- `reviews` - Number of reviews
- `brand` - Product brand name
- `asin` - Amazon ASIN (for reference)
- `features` - JSON array of product feature bullet points
- `thumbnailUrls` - JSON array of thumbnail images (first 4 images)
- `previewUrls` - JSON array of all images for gallery

## Adding New Products

### Option 1: Add to CSV and Re-seed
1. Add new products to your CSV file
2. If you have Amazon JSON files for them, name them by ASIN (e.g., `B07ABC1234.json`)
3. Place JSON files in `public/images/products/`
4. Run: `npm run db:seed:enhanced`

### Option 2: Add Amazon Product JSON
1. Scrape Amazon product data into JSON format (see example files)
2. Name file by ASIN: `B0XXXXXXXXX.json`
3. Place in `public/images/products/`
4. Ensure product exists in CSV with similar title
5. Re-run seed to auto-match

## JSON File Format
```json
{
  "product": {
    "name": "Product Title",
    "brand": "Brand Name",
    "price": "19.99",
    "rating": "4.5",
    "reviews_count": "1234",
    "description": "Long description...",
    "features": [
      "Feature 1",
      "Feature 2"
    ],
    "images": [
      "https://m.media-amazon.com/images/I/...",
      "https://m.media-amazon.com/images/I/..."
    ]
  }
}
```

## Matching Logic

The script uses intelligent fuzzy matching:
- Normalizes titles (lowercase, removes special chars)
- Full string similarity comparison (65%+ threshold)
- Keyword matching for partial matches
- Ignores common stop words (the, a, and, etc.)

### Tips for Better Matching
- Keep CSV titles close to Amazon product names
- Include key product identifiers in title
- Brand names help with matching

## Troubleshooting

### No Images Showing
1. Check `next.config.js` has Amazon image domain whitelisted
2. Verify images exist in database: 
   ```bash
   echo "SELECT thumbnailUrls FROM Product LIMIT 1;" | sqlite3 prisma/zanesville-store.db
   ```

### Low Match Rate
- Review unmatched products in seed output
- Manually update CSV titles to be closer to Amazon names
- Check if JSON files exist for your products

### Reset and Re-seed
```bash
# Reset database and run enhanced seed
npx prisma migrate reset --force
npm run db:seed:enhanced
```

## Legacy Seed
The original seed script is still available:
```bash
npm run db:seed
```
However, it only uses CSV data and produces placeholder images.

## Statistics
Check your product data:
```sql
-- View products with ratings
SELECT id, title, rating, reviews FROM Product WHERE rating IS NOT NULL LIMIT 10;

-- Count images per product
SELECT 
  COUNT(*) as total_products,
  AVG(json_array_length(thumbnailUrls)) as avg_thumbnails,
  AVG(json_array_length(previewUrls)) as avg_previews
FROM Product;
```

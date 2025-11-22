# Item Extraction Summary

## Overview
Successfully extracted item data from `auction-items_enriched.csv` and created individual JSON files using ASIN numbers as filenames (where available).

## Extraction Results
- **Total items processed**: 362
- **Items with ASIN**: 167
- **Items without ASIN**: 195
- **Files created**: 331 individual JSON files

## File Naming Strategy
- **Items with ASIN**: Named using ASIN (e.g., `B09VBZPZHJ.json`)
- **Items without ASIN**: Named using item number (e.g., `item_75.json`)

## File Structure
Each JSON file contains:
- `asin`: Amazon Standard Identification Number
- `item_number`: Original auction item number
- `product_name`: Product name from auction
- `description`: Full description including advisement text
- `quantity`: Item quantity
- `bid_amount`: Bid amount
- `premium`: Premium amount
- `fee`: Fee amount
- `tax`: Tax amount
- `total_paid`: Total paid amount
- `category`: Item category
- `marketplace_price`: Marketplace price
- `invoice_file`: Source invoice file
- `image_url`: Product image URL
- `match_confidence`: ASIN match confidence level
- `extraction_date`: Original extraction timestamp
- `extracted_at`: Processing timestamp
- `filename_based_on`: Indicates whether filename uses ASIN or item number

## Output Directory
All files are stored in the `extracted_items/` directory.

## Examples
- **ASIN-based file**: `B09VBZPZHJ.json` (VEVOR Commercial Indoor Air Curtain)
- **Item-based file**: `item_75.json` (Beauty Accessories without ASIN)

## Benefits
1. **Easy lookup**: Files with ASINs can be directly accessed by ASIN
2. **Fallback naming**: Items without ASINs still get unique filenames
3. **Complete data**: All original CSV data preserved in JSON format
4. **Metadata**: Additional processing information included
5. **Advisement included**: All descriptions contain the required advisement text

## Script Location
The extraction script is saved as `extract_items_by_asin.py` and can be run again if needed.

#!/usr/bin/env python3
"""
Script to extract item data from auction-items_enriched.csv and create individual files 
using ASIN numbers as filenames instead of product names.
"""

import csv
import os
import json
import re
from datetime import datetime

def sanitize_filename(filename):
    """Sanitize filename by removing invalid characters."""
    # Remove invalid characters for filenames
    sanitized = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Replace spaces with underscores
    sanitized = sanitized.replace(' ', '_')
    return sanitized

def create_item_file(item_data, output_dir):
    """Create individual item file using ASIN as filename."""
    asin = item_data.get('asin', '').strip()
    item_number = item_data.get('item_number', '').strip()
    
    # Use ASIN as filename, fallback to item number if ASIN is empty
    if asin:
        filename = f"{asin}.json"
    else:
        filename = f"item_{item_number}.json"
    
    filepath = os.path.join(output_dir, filename)
    
    # Create the item data structure
    item_info = {
        'asin': asin,
        'item_number': item_number,
        'product_name': item_data.get('product_name', ''),
        'description': item_data.get('description', ''),
        'quantity': item_data.get('quantity', ''),
        'bid_amount': item_data.get('bid_amount', ''),
        'premium': item_data.get('premium', ''),
        'fee': item_data.get('fee', ''),
        'tax': item_data.get('tax', ''),
        'total_paid': item_data.get('total_paid', ''),
        'category': item_data.get('category', ''),
        'marketplace_price': item_data.get('marketplace_price', ''),
        'invoice_file': item_data.get('invoice_file', ''),
        'image_url': item_data.get('image_url', ''),
        'match_confidence': item_data.get('match_confidence', ''),
        'extraction_date': item_data.get('extraction_date', ''),
        'extracted_at': datetime.now().isoformat(),
        'filename_based_on': 'asin' if asin else 'item_number'
    }
    
    # Write to JSON file
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(item_info, f, indent=2, ensure_ascii=False)
    
    return filepath

def main():
    """Main function to process the CSV and create individual item files."""
    input_file = 'auction-items_enriched.csv'
    output_dir = 'extracted_items'
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # CSV column mapping based on the header
    columns = [
        'item_number', 'product_name', 'description', 'quantity', 'bid_amount',
        'premium', 'fee', 'tax', 'total_paid', 'category', 'marketplace_price',
        'invoice_file', 'asin', 'image_url', 'match_confidence', 'extraction_date'
    ]
    
    processed_count = 0
    asin_count = 0
    no_asin_count = 0
    
    print(f"Processing {input_file}...")
    print(f"Output directory: {output_dir}")
    
    try:
        with open(input_file, 'r', encoding='utf-8') as file:
            reader = csv.reader(file)
            
            # Skip header row
            next(reader)
            
            for row in reader:
                if len(row) >= 16:  # Ensure we have all columns
                    # Create item data dictionary
                    item_data = {col: row[i] for i, col in enumerate(columns)}
                    
                    # Create individual file
                    filepath = create_item_file(item_data, output_dir)
                    processed_count += 1
                    
                    # Count items with/without ASIN
                    if item_data.get('asin', '').strip():
                        asin_count += 1
                    else:
                        no_asin_count += 1
                    
                    if processed_count % 50 == 0:
                        print(f"Processed {processed_count} items...")
                
    except FileNotFoundError:
        print(f"Error: Could not find {input_file}")
        return
    except Exception as e:
        print(f"Error processing file: {e}")
        return
    
    print(f"\n=== Extraction Complete ===")
    print(f"Total items processed: {processed_count}")
    print(f"Items with ASIN: {asin_count}")
    print(f"Items without ASIN: {no_asin_count}")
    print(f"Files created in: {output_dir}")
    
    # List some example files
    if processed_count > 0:
        print(f"\nExample files created:")
        example_files = os.listdir(output_dir)[:5]
        for filename in example_files:
            print(f"  - {filename}")
        if len(example_files) >= 5:
            print(f"  ... and {processed_count - 5} more files")

if __name__ == "__main__":
    main()

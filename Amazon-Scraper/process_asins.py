#!/usr/bin/env python3
"""
Process ASINs from a file and save each product's data into a separate file
named after the product's title in the 'products' directory.
"""

import os
import json
import time
import re
from typing import List, Dict, Tuple
from oxylabs_amazon_scraper import OxylabsAmazonScraper
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


def clean_asin(asin: str) -> str:
    """Clean and validate ASIN format"""
    # Remove whitespace and carriage returns
    asin = asin.strip().replace('\r', '').replace('\n', '')
    
    # ASIN should be 10 characters starting with 'B'
    if len(asin) == 10 and asin.startswith('B'):
        return asin
    
    # Try to fix common issues
    if asin.startswith('BO') and len(asin) == 10:
        # Some ASINs in the file have 'BO' instead of 'B0'
        return 'B0' + asin[2:]
    
    return asin


def read_asins_from_file(asins_file: str) -> List[str]:
    """Read and clean ASINs from file"""
    try:
        with open(asins_file, "r", encoding='utf-8') as file:
            lines = file.readlines()
    except FileNotFoundError:
        print(f"❌ Error: File '{asins_file}' not found")
        return []
    
    asins = []
    for line_num, line in enumerate(lines, 1):
        # Extract ASIN from line (skip line numbers)
        parts = line.strip().split()
        if len(parts) >= 2:
            asin = clean_asin(parts[1])  # Second part should be ASIN
        elif len(parts) == 1 and not parts[0].isdigit():
            asin = clean_asin(parts[0])  # Might be just ASIN
        else:
            continue
        
        # Validate ASIN format
        if len(asin) == 10 and asin.startswith('B'):
            asins.append(asin)
        else:
            print(f"⚠️  Skipping invalid ASIN on line {line_num}: '{asin}'")
    
    return asins


def process_asins(asins_file: str, output_dir: str, delay: float = 1.0) -> Dict[str, int]:
    """Process ASINs from a file and save product data individually"""
    # Ensure the output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"📁 Created directory: {output_dir}")

    # Initialize scraper
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("❌ Error: Please set OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables")
        print("Example:")
        print("  export OXYLABS_USERNAME='your_username'")
        print("  export OXYLABS_PASSWORD='your_password'")
        return {"success": 0, "failed": 0, "skipped": 0}

    scraper = OxylabsAmazonScraper(username, password)

    # Read ASINs from file
    asins = read_asins_from_file(asins_file)
    if not asins:
        print("❌ No valid ASINs found in file")
        return {"success": 0, "failed": 0, "skipped": 0}
    
    print(f"📋 Found {len(asins)} valid ASINs to process")
    print(f"⏱️  Rate limiting: {delay} seconds between requests")
    print("=" * 60)

    # Track results
    results = {"success": 0, "failed": 0, "skipped": 0}
    failed_asins = []
    
    # Process each ASIN
    for i, asin in enumerate(asins, 1):
        print(f"🔍 [{i}/{len(asins)}] Processing ASIN: {asin}")

        try:
            # Check if file already exists
            asin_filename = f"{asin}.json"
            asin_exists = os.path.exists(os.path.join(output_dir, asin_filename))
            
            if asin_exists:
                print(f"⏭️  Skipping {asin} (already exists)")
                results["skipped"] += 1
                continue

            # Build product URL
            product_url = f"https://www.amazon.com/dp/{asin}"

            # Scrape product data
            result = scraper.scrape_product(product_url)

            if result['metadata']['extraction_successful']:
                product = result['product']
                
                # Use ASIN-only filename format
                filename = f"{asin}.json"
                filepath = os.path.join(output_dir, filename)

                # Save product data
                with open(filepath, 'w', encoding='utf-8') as outfile:
                    json.dump(result, outfile, indent=2, ensure_ascii=False)

                print(f"✅ Saved product data to {asin}.json")
                print(f"   💰 Price: ${product['price']} | ⭐ Rating: {product['rating']}/5")
                results["success"] += 1
            else:
                print(f"❌ Failed to scrape ASIN {asin}: {result['metadata']['error_message']}")
                failed_asins.append({"asin": asin, "error": result['metadata']['error_message']})
                results["failed"] += 1

        except Exception as e:
            print(f"❌ Exception for ASIN {asin}: {str(e)}")
            failed_asins.append({"asin": asin, "error": str(e)})
            results["failed"] += 1

        # Rate limiting
        if i < len(asins):  # Don't sleep after last item
            time.sleep(delay)

    # Save failed ASINs report
    if failed_asins:
        failed_report_path = os.path.join(output_dir, "failed_asins_report.json")
        with open(failed_report_path, 'w', encoding='utf-8') as f:
            json.dump(failed_asins, f, indent=2)
        print(f"📄 Failed ASINs report saved to: {failed_report_path}")

    print("\n" + "=" * 60)
    print("📊 Processing Summary:")
    print(f"  ✅ Successfully processed: {results['success']} ASINs")
    print(f"  ❌ Failed: {results['failed']} ASINs")
    print(f"  ⏭️  Skipped: {results['skipped']} ASINs")
    print(f"  📁 Output directory: {output_dir}")
    print("\n🎉 Processing completed.")
    
    return results


def main():
    """Main function"""
    print("Amazon ASIN Processor")
    print("=" * 50)
    asins_file = "ASINs.txt"
    output_dir = "products"
    process_asins(asins_file, output_dir)


if __name__ == "__main__":
    main()

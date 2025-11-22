#!/usr/bin/env python3
"""
Test script to process a single ASIN to verify the system works
"""

import os
import json
from dotenv import load_dotenv
from oxylabs_amazon_scraper import OxylabsAmazonScraper

# Load environment variables from .env file
load_dotenv()

def test_single_asin():
    """Test processing a single ASIN"""
    print("🧪 Testing Single ASIN Processing")
    print("=" * 40)
    
    # Check credentials
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("❌ Error: Please set OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables")
        print("Example:")
        print("  export OXYLABS_USERNAME='your_username'")
        print("  export OXYLABS_PASSWORD='your_password'")
        return False
    
    # Use the sample ASIN from the README examples
    test_asin = "B07FZ8S74R"  # Amazon Echo Dot (3rd Gen)
    output_dir = "products"
    
    print(f"🔍 Testing with ASIN: {test_asin}")
    print(f"📁 Output directory: {output_dir}")
    
    # Initialize scraper
    scraper = OxylabsAmazonScraper(username, password)
    
    try:
        # Build product URL
        product_url = f"https://www.amazon.com/dp/{test_asin}"
        
        # Scrape product data
        result = scraper.scrape_product(product_url)
        
        if result['metadata']['extraction_successful']:
            product = result['product']
            
            # Use ASIN-only filename format for consistency
            filename = f"{test_asin}.json"
            filepath = os.path.join(output_dir, filename)
            
            # Save product data
            with open(filepath, 'w', encoding='utf-8') as outfile:
                json.dump(result, outfile, indent=2, ensure_ascii=False)
            
            print(f"✅ Successfully processed test ASIN!")
            print(f"   📦 Product: {product['name']}")
            print(f"   🏷️  Brand: {product['brand']}")
            print(f"   💰 Price: ${product['price']}")
            print(f"   ⭐ Rating: {product['rating']}/5")
            print(f"   📝 Reviews: {product['reviews_count']}")
            print(f"   📋 Availability: {product['availability']}")
            print(f"   💾 Saved to: {filename}")
            
            return True
        else:
            print(f"❌ Failed to scrape ASIN {test_asin}: {result['metadata']['error_message']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_single_asin()
    if success:
        print("\n🎉 Single ASIN test completed successfully!")
        print("   You can now run the full processing with: python process_asins.py")
    else:
        print("\n⚠️  Single ASIN test failed. Please check your credentials and try again.")

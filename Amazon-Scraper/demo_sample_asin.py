#!/usr/bin/env python3
"""
Quick Demo: Test Amazon Scraper with Sample ASIN B07FZ8S74R
This script demonstrates the basic usage of the Amazon scraper with the sample ASIN.
"""

import os
import json
from oxylabs_amazon_scraper import OxylabsAmazonScraper


def demo_sample_asin():
    """Demonstrate scraping the sample ASIN B07FZ8S74R"""
    print("🚀 Amazon Scraper Demo - Sample ASIN B07FZ8S74R")
    print("=" * 50)
    
    # Get credentials from environment variables
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("❌ Error: Please set OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables")
        print("Example:")
        print("  export OXYLABS_USERNAME='your_username'")
        print("  export OXYLABS_PASSWORD='your_password'")
        return False
    
    # Initialize scraper
    scraper = OxylabsAmazonScraper(username, password)
    
    # Test the sample ASIN from the curl example
    sample_asin = "B07FZ8S74R"
    sample_url = f"https://www.amazon.com/dp/{sample_asin}"
    
    print(f"🔍 Scraping Sample ASIN: {sample_asin}")
    print(f"📎 URL: {sample_url}")
    print()
    
    try:
        # Scrape the product
        result = scraper.scrape_product(sample_url)
        
        if result['metadata']['extraction_successful']:
            product = result['product']
            
            print("✅ Successfully scraped product!")
            print("-" * 30)
            print(f"📦 Product Name: {product['name']}")
            print(f"🏷️  Brand: {product['brand']}")
            print(f"💰 Price: ${product['price']}")
            print(f"⭐ Rating: {product['rating']}/5")
            print(f"📝 Reviews: {product['reviews_count']}")
            print(f"📋 Availability: {product['availability']}")
            print(f"🔗 URL: {product['url']}")
            print()
            
            # Show description if available
            if product['description']:
                print("📄 Description:")
                print(f"  {product['description'][:200]}...")
                print()
            
            # Show key features if available
            if product['features'] and len(product['features']) > 0:
                print("🎯 Key Features:")
                for i, feature in enumerate(product['features'][:5], 1):
                    print(f"  {i}. {feature}")
                print()
            
            # Show specifications if available
            if product['specifications']:
                print("📊 Specifications:")
                for key, value in list(product['specifications'].items())[:5]:
                    print(f"  {key}: {value}")
                print()
            
            # Show extraction metadata
            print("🔍 Extraction Details:")
            print(f"  Fields extracted: {result['metadata']['fields_extracted']}/6")
            print(f"  Scraped at: {product['scraped_at']}")
            print()
            
            # Save to file
            filename = f"{sample_asin}.json"
            scraper.save_to_json(result, filename)
            print(f"💾 Data saved to: {filename}")
            
            # Show formatted JSON snippet
            print("\n📋 JSON Structure Preview:")
            print(json.dumps({
                "product": {
                    "name": product['name'],
                    "brand": product['brand'],
                    "price": product['price'],
                    "rating": product['rating'],
                    "reviews_count": product['reviews_count'],
                    "availability": product['availability']
                },
                "metadata": {
                    "extraction_successful": result['metadata']['extraction_successful'],
                    "fields_extracted": result['metadata']['fields_extracted']
                }
            }, indent=2))
            
        else:
            print("❌ Failed to scrape product")
            print(f"Error: {result['metadata']['error_message']}")
            return False
            
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return False
    
    print("\n🎉 Demo completed successfully!")
    return True


def demo_error_handling():
    """Demonstrate error handling with invalid ASINs"""
    print("\n🧪 Error Handling Demo")
    print("=" * 30)
    
    # Get credentials
    username = os.getenv("OXYLABS_USERNAME", "test_user")
    password = os.getenv("OXYLABS_PASSWORD", "test_pass")
    
    scraper = OxylabsAmazonScraper(username, password)
    
    # Test invalid ASINs
    invalid_asins = [
        "INVALID123",    # Invalid format
        "B123",          # Too short
        "123456789",     # No B prefix
    ]
    
    print("Testing invalid ASINs:")
    for asin in invalid_asins:
        print(f"\n🔍 Testing invalid ASIN: {asin}")
        try:
            url = f"https://www.amazon.com/dp/{asin}"
            result = scraper.scrape_product(url)
            
            if result['metadata']['extraction_successful']:
                print(f"  ❌ Unexpected success for invalid ASIN")
            else:
                print(f"  ✅ Correctly failed: {result['metadata']['error_message']}")
                
        except Exception as e:
            print(f"  ✅ Correctly caught exception: {str(e)}")


def demo_search_results():
    """Demonstrate search results functionality"""
    print("\n🔍 Search Results Demo")
    print("=" * 30)
    
    # Get credentials
    username = os.getenv("OXYLABS_USERNAME", "test_user")
    password = os.getenv("OXYLABS_PASSWORD", "test_pass")
    
    scraper = OxylabsAmazonScraper(username, password)
    
    # Search for Echo Dot products
    search_query = "echo dot"
    print(f"Searching for: '{search_query}'")
    
    try:
        results = scraper.scrape_search_results(search_query, pages=1)
        
        if results:
            print(f"✅ Found {len(results)} products")
            
            # Show top 3 results
            print("\n🔝 Top 3 Results:")
            for i, product in enumerate(results[:3], 1):
                print(f"  {i}. {product['title'][:50]}...")
                print(f"     Price: {product['price']} | Rating: {product['rating']}")
                print(f"     URL: {product['url']}")
                print()
            
            # Save search results
            scraper.save_to_json(results, "search_results_echo_dot.json")
            print("💾 Search results saved to: search_results_echo_dot.json")
            
        else:
            print("❌ No search results found")
            
    except Exception as e:
        print(f"❌ Search failed: {str(e)}")


def main():
    """Main function to run all demos"""
    print("Amazon Scraper - Quick Demo")
    print("=" * 50)
    
    # Run sample ASIN demo
    success = demo_sample_asin()
    
    if success:
        # Run additional demos
        demo_error_handling()
        demo_search_results()
    else:
        print("\n⚠️  Sample ASIN demo failed. Check your credentials and try again.")
        print("Set environment variables:")
        print("  export OXYLABS_USERNAME='your_username'")
        print("  export OXYLABS_PASSWORD='your_password'")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test Examples for Amazon Scraper
Tests with sample ASIN B07FZ8S74R and various edge cases
"""

import json
import time
import os
from oxylabs_amazon_scraper import OxylabsAmazonScraper
from typing import Dict, List, Any


class ScraperTester:
    """Test class for Amazon scraper with various scenarios"""
    
    def __init__(self, username: str = None, password: str = None):
        """Initialize with credentials from environment or parameters"""
        self.username = username or os.getenv("OXYLABS_USERNAME", "test_user")
        self.password = password or os.getenv("OXYLABS_PASSWORD", "test_pass")
        self.scraper = OxylabsAmazonScraper(self.username, self.password)
    
    def test_sample_asin_b07fz8s74r(self):
        """Test with the sample ASIN B07FZ8S74R (Amazon Echo Dot 3rd Gen)"""
        print("=" * 60)
        print("Testing Sample ASIN: B07FZ8S74R (Amazon Echo Dot 3rd Gen)")
        print("=" * 60)
        
        # Test the specific sample ASIN
        echo_dot_url = "https://www.amazon.com/dp/B07FZ8S74R"
        
        print(f"Scraping URL: {echo_dot_url}")
        result = self.scraper.scrape_product(echo_dot_url)
        
        if result['metadata']['extraction_successful']:
            product = result['product']
            print(f"✅ Successfully scraped product!")
            print(f"  📦 Product: {product['name']}")
            print(f"  🏷️  Brand: {product['brand']}")
            print(f"  💰 Price: ${product['price']}")
            print(f"  ⭐ Rating: {product['rating']}/5 ({product['reviews_count']} reviews)")
            print(f"  📋 Availability: {product['availability']}")
            print(f"  🔗 URL: {product['url']}")
            
            # Show key features if available
            if product['features']:
                print(f"  🎯 Key Features:")
                for i, feature in enumerate(product['features'][:5], 1):
                    print(f"    {i}. {feature}")
            
            # Show specifications if available
            if product['specifications']:
                print(f"  📊 Specifications:")
                for key, value in list(product['specifications'].items())[:5]:
                    print(f"    {key}: {value}")
            
            # Save result
            self.scraper.save_to_json(result, "B07FZ8S74R.json")
            print(f"  💾 Saved to: B07FZ8S74R.json")
            
        else:
            print(f"❌ Failed to scrape: {result['metadata']['error_message']}")
        
        print(f"  🔢 Fields extracted: {result['metadata']['fields_extracted']}/6")
        print()
        
        return result
    
    def test_different_categories(self):
        """Test scraping products from different categories"""
        print("=" * 60)
        print("Testing Different Product Categories")
        print("=" * 60)
        
        # Products from different categories
        test_products = [
            {
                "url": "https://www.amazon.com/dp/B07FZ8S74R",
                "category": "Electronics",
                "name": "Amazon Echo Dot (3rd Gen)",
                "expected_fields": ["name", "brand", "price", "rating", "reviews_count"]
            },
            {
                "url": "https://www.amazon.com/dp/B0863TXGM3",
                "category": "Books",
                "name": "Example Programming Book",
                "expected_fields": ["name", "brand", "price", "description"]
            },
            {
                "url": "https://www.amazon.com/dp/B08HJGVYWZ",
                "category": "Home & Kitchen",
                "name": "Kitchen Appliance",
                "expected_fields": ["name", "brand", "price", "specifications"]
            },
            {
                "url": "https://www.amazon.com/dp/B085WJBZPX",
                "category": "Health & Personal Care",
                "name": "Health Product",
                "expected_fields": ["name", "brand", "price", "availability"]
            },
            {
                "url": "https://www.amazon.com/dp/B08T5NWXKP",
                "category": "Fashion",
                "name": "Clothing Item",
                "expected_fields": ["name", "brand", "price", "specifications"]
            }
        ]
        
        results = []
        for item in test_products:
            print(f"🔍 Testing {item['category']} category...")
            print(f"  URL: {item['url']}")
            
            try:
                result = self.scraper.scrape_product(item['url'])
                
                if result['metadata']['extraction_successful']:
                    product = result['product']
                    success_info = {
                        "category": item['category'],
                        "name": product['name'],
                        "brand": product['brand'],
                        "price": product['price'],
                        "rating": product['rating'],
                        "reviews_count": product['reviews_count'],
                        "availability": product['availability'],
                        "fields_extracted": result['metadata']['fields_extracted']
                    }
                    results.append(success_info)
                    
                    print(f"  ✅ Success: {product['name']}")
                    print(f"  💰 Price: ${product['price']}")
                    print(f"  ⭐ Rating: {product['rating']}/5")
                    print(f"  📋 Availability: {product['availability']}")
                    print(f"  🔢 Fields extracted: {result['metadata']['fields_extracted']}/6")
                    
                else:
                    print(f"  ❌ Failed: {result['metadata']['error_message']}")
                    results.append({
                        "category": item['category'],
                        "error": result['metadata']['error_message']
                    })
                
            except Exception as e:
                print(f"  ❌ Exception: {str(e)}")
                results.append({
                    "category": item['category'],
                    "error": str(e)
                })
            
            print()
            time.sleep(1)  # Rate limiting
        
        # Save category test results
        self.scraper.save_to_json(results, "category_test_results.json")
        print(f"💾 Category test results saved to: category_test_results.json")
        print()
        
        return results
    
    def test_edge_cases(self):
        """Test various edge cases"""
        print("=" * 60)
        print("Testing Edge Cases")
        print("=" * 60)
        
        edge_cases = [
            {
                "name": "Invalid ASIN Format",
                "url": "https://www.amazon.com/dp/INVALID123",
                "expected_error": "Invalid ASIN"
            },
            {
                "name": "Short ASIN",
                "url": "https://www.amazon.com/dp/B123",
                "expected_error": "Invalid ASIN"
            },
            {
                "name": "No B Prefix",
                "url": "https://www.amazon.com/dp/123456789A",
                "expected_error": "Invalid ASIN"
            },
            {
                "name": "Non-existent Product",
                "url": "https://www.amazon.com/dp/B99999999Z",
                "expected_error": "Product not found"
            },
            {
                "name": "Potentially Out of Stock",
                "url": "https://www.amazon.com/dp/B08DISCONTINUED",
                "expected_error": "Out of stock or discontinued"
            }
        ]
        
        results = []
        for case in edge_cases:
            print(f"🧪 Testing: {case['name']}")
            print(f"  URL: {case['url']}")
            
            try:
                result = self.scraper.scrape_product(case['url'])
                
                if result['metadata']['extraction_successful']:
                    product = result['product']
                    print(f"  ✅ Unexpected success: {product['name']}")
                    print(f"     Availability: {product['availability']}")
                    results.append({
                        "case": case['name'],
                        "status": "success",
                        "product_name": product['name'],
                        "availability": product['availability']
                    })
                else:
                    print(f"  ❌ Expected failure: {result['metadata']['error_message']}")
                    results.append({
                        "case": case['name'],
                        "status": "failed",
                        "error": result['metadata']['error_message']
                    })
                
            except Exception as e:
                print(f"  ❌ Exception (expected): {str(e)}")
                results.append({
                    "case": case['name'],
                    "status": "exception",
                    "error": str(e)
                })
            
            print()
            time.sleep(1)  # Rate limiting
        
        # Save edge case results
        self.scraper.save_to_json(results, "edge_case_results.json")
        print(f"💾 Edge case results saved to: edge_case_results.json")
        print()
        
        return results
    
    def test_out_of_stock_scenarios(self):
        """Test handling of out-of-stock products"""
        print("=" * 60)
        print("Testing Out-of-Stock Scenarios")
        print("=" * 60)
        
        # Test with a variety of URLs that might be out of stock
        out_of_stock_candidates = [
            "https://www.amazon.com/dp/B08EXAMPLE1",
            "https://www.amazon.com/dp/B08EXAMPLE2",
            "https://www.amazon.com/dp/B08EXAMPLE3",
        ]
        
        results = []
        for url in out_of_stock_candidates:
            print(f"🔍 Testing potential out-of-stock product: {url}")
            
            try:
                result = self.scraper.scrape_product(url)
                
                if result['metadata']['extraction_successful']:
                    product = result['product']
                    availability = product['availability'].lower()
                    
                    if any(phrase in availability for phrase in ['out of stock', 'unavailable', 'discontinued']):
                        print(f"  📦 Found out-of-stock product: {product['name']}")
                        print(f"  📋 Status: {product['availability']}")
                        print(f"  💰 Price: ${product['price']}")
                        print(f"  ⭐ Rating: {product['rating']}/5")
                        
                        results.append({
                            "url": url,
                            "name": product['name'],
                            "availability": product['availability'],
                            "price": product['price'],
                            "rating": product['rating'],
                            "reviews_count": product['reviews_count']
                        })
                    else:
                        print(f"  ✅ Product is available: {product['availability']}")
                        results.append({
                            "url": url,
                            "name": product['name'],
                            "availability": product['availability'],
                            "status": "available"
                        })
                else:
                    print(f"  ❌ Failed to scrape: {result['metadata']['error_message']}")
                    results.append({
                        "url": url,
                        "error": result['metadata']['error_message']
                    })
                
            except Exception as e:
                print(f"  ❌ Exception: {str(e)}")
                results.append({
                    "url": url,
                    "error": str(e)
                })
            
            print()
            time.sleep(1)  # Rate limiting
        
        # Save out-of-stock test results
        self.scraper.save_to_json(results, "out_of_stock_test_results.json")
        print(f"💾 Out-of-stock test results saved to: out_of_stock_test_results.json")
        print()
        
        return results
    
    def test_no_reviews_scenarios(self):
        """Test handling of products with no reviews"""
        print("=" * 60)
        print("Testing No Reviews Scenarios")
        print("=" * 60)
        
        # Test with recently launched or niche products that might have no reviews
        no_reviews_candidates = [
            "https://www.amazon.com/dp/B08NEWITEM1",
            "https://www.amazon.com/dp/B08NEWITEM2",
            "https://www.amazon.com/dp/B08NEWITEM3",
        ]
        
        results = []
        for url in no_reviews_candidates:
            print(f"🔍 Testing potential no-reviews product: {url}")
            
            try:
                result = self.scraper.scrape_product(url)
                
                if result['metadata']['extraction_successful']:
                    product = result['product']
                    reviews_count = product['reviews_count']
                    
                    if reviews_count == '0' or not reviews_count:
                        print(f"  📦 Found no-reviews product: {product['name']}")
                        print(f"  📝 Reviews: {reviews_count or 'None'}")
                        print(f"  ⭐ Rating: {product['rating'] or 'Not rated'}")
                        print(f"  💰 Price: ${product['price']}")
                        print(f"  📋 Availability: {product['availability']}")
                        
                        results.append({
                            "url": url,
                            "name": product['name'],
                            "reviews_count": reviews_count,
                            "rating": product['rating'],
                            "price": product['price'],
                            "availability": product['availability'],
                            "status": "no_reviews"
                        })
                    else:
                        print(f"  ✅ Product has reviews: {reviews_count}")
                        results.append({
                            "url": url,
                            "name": product['name'],
                            "reviews_count": reviews_count,
                            "rating": product['rating'],
                            "status": "has_reviews"
                        })
                else:
                    print(f"  ❌ Failed to scrape: {result['metadata']['error_message']}")
                    results.append({
                        "url": url,
                        "error": result['metadata']['error_message']
                    })
                
            except Exception as e:
                print(f"  ❌ Exception: {str(e)}")
                results.append({
                    "url": url,
                    "error": str(e)
                })
            
            print()
            time.sleep(1)  # Rate limiting
        
        # Save no-reviews test results
        self.scraper.save_to_json(results, "no_reviews_test_results.json")
        print(f"💾 No-reviews test results saved to: no_reviews_test_results.json")
        print()
        
        return results
    
    def test_search_results_various_categories(self):
        """Test search results across different categories"""
        print("=" * 60)
        print("Testing Search Results - Various Categories")
        print("=" * 60)
        
        search_queries = [
            {"query": "echo dot", "category": "Electronics", "expected_min": 10},
            {"query": "programming books", "category": "Books", "expected_min": 5},
            {"query": "kitchen appliances", "category": "Home & Kitchen", "expected_min": 8},
            {"query": "running shoes", "category": "Sports & Outdoors", "expected_min": 10},
            {"query": "smartphone cases", "category": "Electronics", "expected_min": 15},
        ]
        
        all_results = {}
        for search_item in search_queries:
            query = search_item["query"]
            category = search_item["category"]
            expected_min = search_item["expected_min"]
            
            print(f"🔍 Searching '{query}' in {category} category...")
            
            try:
                results = self.scraper.scrape_search_results(query, pages=1)
                
                if results and len(results) >= expected_min:
                    print(f"  ✅ Found {len(results)} products (expected min: {expected_min})")
                    
                    # Show top 3 results
                    for i, product in enumerate(results[:3], 1):
                        print(f"    {i}. {product['title'][:50]}... - {product['price']}")
                    
                    all_results[query] = {
                        "category": category,
                        "results_count": len(results),
                        "products": results,
                        "status": "success"
                    }
                    
                elif results:
                    print(f"  ⚠️  Found {len(results)} products (expected min: {expected_min})")
                    all_results[query] = {
                        "category": category,
                        "results_count": len(results),
                        "products": results,
                        "status": "partial_success"
                    }
                    
                else:
                    print(f"  ❌ No results found for '{query}'")
                    all_results[query] = {
                        "category": category,
                        "results_count": 0,
                        "status": "no_results"
                    }
                
            except Exception as e:
                print(f"  ❌ Exception: {str(e)}")
                all_results[query] = {
                    "category": category,
                    "error": str(e),
                    "status": "error"
                }
            
            print()
            time.sleep(1)  # Rate limiting
        
        # Save search results
        self.scraper.save_to_json(all_results, "search_results_test.json")
        print(f"💾 Search results saved to: search_results_test.json")
        print()
        
        return all_results
    
    def run_all_tests(self):
        """Run all test scenarios"""
        print("🚀 Starting Comprehensive Amazon Scraper Tests")
        print("=" * 60)
        
        start_time = time.time()
        
        # Run all tests
        test_results = {
            "sample_asin": self.test_sample_asin_b07fz8s74r(),
            "categories": self.test_different_categories(),
            "edge_cases": self.test_edge_cases(),
            "out_of_stock": self.test_out_of_stock_scenarios(),
            "no_reviews": self.test_no_reviews_scenarios(),
            "search_results": self.test_search_results_various_categories(),
        }
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Summary
        print("=" * 60)
        print("📊 Test Summary")
        print("=" * 60)
        print(f"⏱️  Total duration: {duration:.2f} seconds")
        print(f"🧪 Tests completed: {len(test_results)}")
        
        # Save comprehensive results
        comprehensive_results = {
            "metadata": {
                "test_duration": duration,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_tests": len(test_results)
            },
            "results": test_results
        }
        
        self.scraper.save_to_json(comprehensive_results, "comprehensive_test_results.json")
        print(f"💾 Comprehensive results saved to: comprehensive_test_results.json")
        
        print("\n✅ All tests completed successfully!")
        return comprehensive_results


def main():
    """Main function to run the tests"""
    print("Amazon Scraper - Comprehensive Test Suite")
    print("=" * 60)
    
    # Check for credentials
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("⚠️  WARNING: No Oxylabs credentials found!")
        print("Set OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables")
        print("Tests will run with mock credentials (may fail)")
        print()
    
    # Initialize tester
    tester = ScraperTester(username, password)
    
    # Run all tests
    try:
        results = tester.run_all_tests()
        print(f"\n🎉 Test suite completed successfully!")
        return results
    except Exception as e:
        print(f"\n❌ Test suite failed: {str(e)}")
        return None


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Test script to verify ASIN parsing from ASINs.txt file
"""

from process_asins import read_asins_from_file, clean_asin

def test_asin_parsing():
    """Test ASIN parsing from the file"""
    print("🧪 Testing ASIN Parsing")
    print("=" * 40)
    
    # Read ASINs from file
    asins = read_asins_from_file("ASINs.txt")
    
    print(f"📋 Found {len(asins)} valid ASINs")
    print("\n🔍 First 10 ASINs:")
    for i, asin in enumerate(asins[:10], 1):
        print(f"  {i:2d}. {asin}")
    
    if len(asins) > 10:
        print(f"  ... and {len(asins) - 10} more ASINs")
    
    # Test individual ASIN cleaning
    print("\n🧹 Testing ASIN Cleaning:")
    test_cases = [
        "B07YQLF9XW  ",  # With trailing spaces
        "BOC97TNMK4  ",   # 'BO' instead of 'B0'
        "B0798GZ2MN",     # Normal case
        "INVALID123",     # Invalid case
        "B123",           # Too short
    ]
    
    for test_asin in test_cases:
        cleaned = clean_asin(test_asin)
        valid = len(cleaned) == 10 and cleaned.startswith('B')
        status = "✅ Valid" if valid else "❌ Invalid"
        print(f"  '{test_asin}' -> '{cleaned}' {status}")
    
    print(f"\n📊 Summary: {len(asins)} valid ASINs ready for processing")

if __name__ == "__main__":
    test_asin_parsing()

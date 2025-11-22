#!/usr/bin/env python3
"""
Convenience script to run the ASIN processor with different options
"""

import os
import argparse
from process_asins import process_asins

def main():
    """Main function with command line options"""
    parser = argparse.ArgumentParser(
        description="Process Amazon ASINs from a file and save product data",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_processor.py                           # Process all ASINs with default settings
  python run_processor.py --delay 2.0              # Use 2 second delay between requests
  python run_processor.py --input my_asins.txt     # Use custom input file
  python run_processor.py --output my_products     # Use custom output directory
  python run_processor.py --test                   # Run in test mode (first 5 ASINs only)
        """
    )
    
    parser.add_argument(
        "--input", "-i",
        default="ASINs.txt",
        help="Input file containing ASINs (default: ASINs.txt)"
    )
    
    parser.add_argument(
        "--output", "-o",
        default="products",
        help="Output directory for product data (default: products)"
    )
    
    parser.add_argument(
        "--delay", "-d",
        type=float,
        default=1.0,
        help="Delay between requests in seconds (default: 1.0)"
    )
    
    parser.add_argument(
        "--test", "-t",
        action="store_true",
        help="Test mode: process only first 5 ASINs"
    )
    
    parser.add_argument(
        "--resume", "-r",
        action="store_true",
        help="Resume processing (skip already processed ASINs)"
    )
    
    args = parser.parse_args()
    
    # Check for credentials
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("❌ Error: Please set OXYLABS_USERNAME and OXYLABS_PASSWORD environment variables")
        print("Example:")
        print("  export OXYLABS_USERNAME='your_username'")
        print("  export OXYLABS_PASSWORD='your_password'")
        return
    
    print("🚀 Amazon ASIN Processor")
    print("=" * 50)
    print(f"📄 Input file: {args.input}")
    print(f"📁 Output directory: {args.output}")
    print(f"⏱️  Delay between requests: {args.delay} seconds")
    
    if args.test:
        print("🧪 Test mode: Processing only first 5 ASINs")
        # Create a test version of the process_asins function
        from process_asins import read_asins_from_file
        asins = read_asins_from_file(args.input)
        test_asins = asins[:5]
        
        # Create temporary file with test ASINs
        test_file = "test_asins.txt"
        with open(test_file, 'w') as f:
            for i, asin in enumerate(test_asins, 1):
                f.write(f"{i} {asin}\n")
        
        try:
            results = process_asins(test_file, args.output, args.delay)
        finally:
            # Clean up test file
            if os.path.exists(test_file):
                os.remove(test_file)
    else:
        results = process_asins(args.input, args.output, args.delay)
    
    print(f"\n✅ Processing completed!")
    print(f"   Successfully processed: {results['success']} ASINs")
    print(f"   Failed: {results['failed']} ASINs")
    print(f"   Skipped: {results['skipped']} ASINs")

if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Check the current status of ASIN processing
"""

import os
import json
import re
from process_asins import read_asins_from_file

def check_processing_status():
    """Check the current processing status"""
    print("📊 Amazon ASIN Processing Status")
    print("=" * 50)
    
    # Read ASINs from file
    asins_file = "ASINs.txt"
    if not os.path.exists(asins_file):
        print(f"❌ {asins_file} not found")
        return
    
    asins = read_asins_from_file(asins_file)
    total_asins = len(asins)
    
    # Check output directory
    output_dir = "products"
    if not os.path.exists(output_dir):
        print(f"📁 Output directory '{output_dir}' does not exist")
        print(f"📋 Total ASINs to process: {total_asins}")
        print(f"✅ Processed: 0")
        print(f"⏳ Remaining: {total_asins}")
        return
    
    # Count processed files in ASIN-only format
    processed_files = [f for f in os.listdir(output_dir) if re.match(r"^B[0-9A-Z]{9}\.json$", f)]
    processed_count = len(processed_files)
    
    # Check for failed ASINs report
    failed_report = os.path.join(output_dir, "failed_asins_report.json")
    failed_count = 0
    if os.path.exists(failed_report):
        with open(failed_report, 'r') as f:
            failed_data = json.load(f)
            failed_count = len(failed_data)
    
    remaining_count = total_asins - processed_count - failed_count
    
    print(f"📋 Total ASINs: {total_asins}")
    print(f"✅ Successfully processed: {processed_count}")
    print(f"❌ Failed: {failed_count}")
    print(f"⏳ Remaining: {remaining_count}")
    
    if processed_count > 0:
        print(f"📈 Progress: {processed_count/total_asins*100:.1f}%")
    
    # Show some sample processed files
    if processed_files:
        print(f"\n📄 Sample processed files:")
        for i, filename in enumerate(processed_files[:5], 1):
            print(f"  {i}. {filename}")
        if len(processed_files) > 5:
            print(f"  ... and {len(processed_files) - 5} more files")
    
    # Show failed ASINs if any
    if failed_count > 0:
        print(f"\n❌ Failed ASINs:")
        with open(failed_report, 'r') as f:
            failed_data = json.load(f)
            for item in failed_data[:5]:
                print(f"  - {item['asin']}: {item['error']}")
        if failed_count > 5:
            print(f"  ... and {failed_count - 5} more failed ASINs")
    
    print(f"\n📁 Files are saved in: {output_dir}/")
    
    if remaining_count > 0:
        print(f"\n🚀 To continue processing, run:")
        print(f"  python process_asins.py")
        print(f"  python run_processor.py --test  # Test with 5 ASINs")

if __name__ == "__main__":
    check_processing_status()

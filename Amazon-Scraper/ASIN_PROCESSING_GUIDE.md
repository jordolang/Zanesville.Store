# ASIN Processing Guide

## Overview

This guide explains how to process ASINs from the `ASINs.txt` file and save each product's data to individual JSON files in the `products` folder.

## Current Status

- **Total ASINs to process**: 106 (4 invalid ASINs were skipped)
- **Currently processed**: 0
- **Output directory**: `products/`

## Quick Start

1. **Set up credentials** (required):
   ```bash
   export OXYLABS_USERNAME='your_username'
   export OXYLABS_PASSWORD='your_password'
   ```

2. **Test with a few ASINs first**:
   ```bash
   python run_processor.py --test
   ```

3. **Process all ASINs**:
   ```bash
   python process_asins.py
   ```

## Available Scripts

### 1. `process_asins.py` - Main Processing Script
Basic script to process all ASINs from `ASINs.txt`:
```bash
python process_asins.py
```

### 2. `run_processor.py` - Advanced Options
Script with additional options:
```bash
# Test mode (first 5 ASINs only)
python run_processor.py --test

# Custom delay between requests
python run_processor.py --delay 2.0

# Custom input file
python run_processor.py --input my_asins.txt

# Custom output directory
python run_processor.py --output my_products

# Combined options
python run_processor.py --test --delay 2.0 --output test_products
```

### 3. `check_status.py` - Check Progress
Monitor processing progress:
```bash
python check_status.py
```

### 4. `test_single_asin.py` - Test Single ASIN
Test the system with a single ASIN:
```bash
python test_single_asin.py
```

### 5. `test_asin_parsing.py` - Validate ASINs
Check ASIN parsing from the file:
```bash
python test_asin_parsing.py
```

## Output Structure

Each product will be saved as a separate JSON file:

```
products/
├── B07FZ8S74R.json
├── B08N5WRWNW.json
├── B09W26JCGH.json
├── ... (one file per product)
└── failed_asins_report.json  (if any ASINs fail)
```

## File Naming Convention

Files are named using the format:
```
{ASIN}.json
```

- Files are named using the ASIN only for consistency
- ASINs ensure uniqueness across all products
- Simplified naming convention for easier management

## Features

### ✅ **Resume Capability**
- The processor automatically skips already processed ASINs
- You can safely interrupt and restart the process

### ✅ **Error Handling**
- Failed ASINs are logged in `failed_asins_report.json`
- Invalid ASINs are automatically skipped
- Network errors are handled gracefully

### ✅ **Rate Limiting**
- Built-in 1-second delay between requests (configurable)
- Respects server resources

### ✅ **Progress Tracking**
- Shows progress during processing
- Displays product details as they're processed

## Sample Output

Each JSON file contains complete product data:

```json
{
  "product": {
    "name": "Amazon Echo Dot (3rd Gen)",
    "brand": "Amazon",
    "price": "49.99",
    "rating": "4.5",
    "reviews_count": "234567",
    "description": "Smart speaker with Alexa...",
    "features": ["Voice control", "Music streaming", "Smart home hub"],
    "images": ["https://example.com/image1.jpg"],
    "specifications": {
      "Connectivity": "Wi-Fi, Bluetooth",
      "Voice Assistant": "Alexa"
    },
    "availability": "In Stock",
    "url": "https://www.amazon.com/dp/B07FZ8S74R",
    "scraped_at": "2024-01-01 12:00:00"
  },
  "metadata": {
    "extraction_successful": true,
    "error_message": null,
    "fields_extracted": 6
  }
}
```

## Troubleshooting

### Missing Credentials
If you see credential errors:
```bash
export OXYLABS_USERNAME='your_username'
export OXYLABS_PASSWORD='your_password'
```

### Network Issues
- The processor has built-in retry logic
- You can increase the delay: `--delay 2.0`
- Use test mode first: `--test`

### Invalid ASINs
- Invalid ASINs are automatically skipped
- Check `test_asin_parsing.py` output for details

### Resume Processing
- The processor automatically skips existing files
- Check progress with `check_status.py`
- Delete specific files to re-process them

## Estimated Processing Time

- **106 ASINs** with 1-second delay = ~2 minutes
- **106 ASINs** with 2-second delay = ~4 minutes
- Add time for actual API requests (~1-3 seconds each)

**Total estimated time**: 5-15 minutes for all 106 ASINs

## Next Steps

1. **Test first**: `python run_processor.py --test`
2. **Check results**: `python check_status.py`
3. **Process all**: `python process_asins.py`
4. **Monitor progress**: `python check_status.py`

## Support

If you encounter issues:
1. Check your Oxylabs credentials
2. Test with a single ASIN: `python test_single_asin.py`
3. Validate ASINs: `python test_asin_parsing.py`
4. Check the failed ASINs report in `products/failed_asins_report.json`

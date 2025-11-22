# ASIN Extractor

A Node.js/TypeScript tool that automatically extracts Amazon ASINs and image URLs from product names in CSV files. Perfect for enriching auction or inventory data with Amazon product information.

## Features

- 🔍 **Smart Product Search**: Searches Amazon using product names from CSV files
- 🏷️ **ASIN Extraction**: Automatically extracts Amazon Standard Identification Numbers (ASINs)
- 🖼️ **Image URL Retrieval**: Gets main product image URLs for visual identification
- 📊 **CSV Processing**: Reads and writes CSV files, preserving original data
- 🎯 **Confidence Scoring**: Rates match quality (high/medium/low) based on title similarity
- ⚡ **Rate Limiting**: Includes delays and retry logic to avoid being blocked
- 🛡️ **Error Handling**: Robust error handling with retries and graceful degradation
- 📝 **Detailed Logging**: Verbose logging option for debugging and monitoring

## Installation

1. Navigate to the asin-extractor directory:
```bash
cd asin-extractor
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

## Quick Start

1. **Basic extraction** - Process your CSV file:
```bash
npm run extract -- extract -i ../auction-items.csv
```

2. **Update existing file** instead of creating a new one:
```bash
npm run extract -- extract -i ../auction-items.csv --update-existing
```

3. **Custom output file**:
```bash
npm run extract -- extract -i ../auction-items.csv -o enriched-auction-items.csv
```

4. **Dry run** to see what would be processed:
```bash
npm run extract -- extract -i ../auction-items.csv --dry-run
```

## Usage Examples

### Basic Commands

```bash
# Extract ASINs and save to new file
npm run extract -- extract -i auction-items.csv

# Update the original file with ASIN data
npm run extract -- extract -i auction-items.csv --update-existing

# Validate CSV format before processing
npm run extract -- validate -i auction-items.csv

# Show help and examples
npm run extract -- help
```

### Advanced Options

```bash
# Faster processing with shorter delays (be careful of rate limits)
npm run extract -- extract -i auction-items.csv --delay 1000

# More retries for flaky connections
npm run extract -- extract -i auction-items.csv --max-retries 5

# Verbose logging for debugging
npm run extract -- extract -i auction-items.csv --verbose

# Custom timeout for slow connections
npm run extract -- extract -i auction-items.csv --timeout 15000
```

## CSV Format

### Input Requirements

Your CSV file should have at least these columns:
- **Product Name** (required): The main product name to search for

Optional columns that help with matching:
- **Description**: Additional product details
- **Category**: Product category information

### Output Columns

The tool will add these new columns to your CSV:
- **asin**: Amazon Standard Identification Number
- **image_url**: Main product image URL
- **match_confidence**: Confidence level (high/medium/low)
- **extraction_date**: When the data was extracted

### Example

Input CSV:
```csv
Item Number,Product Name,Description,Category
1,"Apple AirPods Pro","Wireless earbuds with noise cancellation","Electronics"
2,"Samsung Galaxy S23","Latest smartphone","Electronics"
```

Output CSV:
```csv
Item Number,Product Name,Description,Category,asin,image_url,match_confidence,extraction_date
1,"Apple AirPods Pro","Wireless earbuds with noise cancellation","Electronics","B0BDHWDR12","https://m.media-amazon.com/images/I/61f1YfTkTmL._AC_SX679_.jpg","high","2024-01-15T10:30:00.000Z"
2,"Samsung Galaxy S23","Latest smartphone","Electronics","B0BLP4GY2P","https://m.media-amazon.com/images/I/71gm8v4uPBL._AC_SX679_.jpg","high","2024-01-15T10:30:05.000Z"
```

## Configuration

### Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--delay <ms>` | Delay between requests | 2000ms |
| `--max-retries <count>` | Maximum retries per search | 3 |
| `--timeout <ms>` | Request timeout | 10000ms |
| `--dry-run` | Preview without making requests | false |
| `--verbose` | Enable detailed logging | false |
| `--update-existing` | Update original file | false |

### Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
REQUEST_DELAY=2000
MAX_RETRIES=3
REQUEST_TIMEOUT=10000
VERBOSE=false
USER_AGENT="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
```

## How It Works

1. **CSV Parsing**: Reads your CSV file and extracts product names
2. **Query Cleaning**: Cleans product names by removing MSRP, item numbers, etc.
3. **Amazon Search**: Searches Amazon using the cleaned product names
4. **Result Parsing**: Extracts ASINs, titles, images, and other data from search results
5. **Confidence Scoring**: Rates how well the found product matches the original query
6. **CSV Output**: Adds new columns to your data and saves the enriched CSV

## Best Practices

### Rate Limiting
- Use default delays (2000ms) to avoid being blocked
- Don't set delays below 1000ms unless necessary
- Monitor for HTTP 429 (Too Many Requests) errors

### Product Name Quality
- More specific product names yield better results
- Include brand names when possible
- Remove unnecessary prefixes like "Item #123:"

### Batch Processing
- Process large files in chunks if needed
- Use `--dry-run` first to estimate processing time
- Consider running during off-peak hours for large datasets

## Troubleshooting

### Common Issues

**No results found:**
- Check that product names are specific enough
- Verify the product exists on Amazon
- Try adding brand names or more details

**Rate limiting errors:**
- Increase the delay between requests (`--delay 3000`)
- Reduce concurrent processing
- Wait and try again later

**Connection timeouts:**
- Increase timeout value (`--timeout 15000`)
- Check your internet connection
- Try fewer retries initially

**CSV parsing errors:**
- Ensure CSV has proper headers
- Check for special characters or encoding issues
- Use the validate command first

### Debug Mode

Enable verbose logging to see detailed information:

```bash
npm run extract -- extract -i auction-items.csv --verbose
```

This will show:
- Search URLs being used
- HTTP response codes
- Parsing results
- Confidence calculations

## Integration

### With Existing Python Scraper

This tool is designed to work alongside your existing Python scraper:

1. Use ASIN Extractor to find ASINs from product names
2. Use the Python scraper to get detailed product information
3. Combine both datasets for complete product data

### Workflow Example

```bash
# Step 1: Extract ASINs from product names
npm run extract -- extract -i auction-items.csv -o items-with-asins.csv

# Step 2: Use Python scraper for detailed data (your existing tool)
python process_asins.py --input items-with-asins.csv

# Step 3: Combine datasets as needed
```

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Clean build artifacts
npm run clean
```

### Project Structure

```
asin-extractor/
├── src/
│   ├── config/          # Configuration management
│   ├── csv/             # CSV processing utilities
│   ├── extractor/       # Main ASIN extraction logic
│   └── index.ts         # CLI interface
├── dist/                # Compiled JavaScript
└── package.json
```

## License

This tool is part of the Amazon-Scraper project and follows the same licensing terms.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Run with `--verbose` for detailed logs
3. Use `--dry-run` to test without making requests
4. Review the CSV validation output
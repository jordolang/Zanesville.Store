# Amazon Scraper CLI Documentation

The Amazon Product Scraper now includes a comprehensive command line interface (CLI) that allows you to scrape Amazon products using various input methods.

## Installation

First, install the required dependencies:

```bash
pip install requests
```

## Usage

### Basic Syntax

```bash
python oxylabs_amazon_scraper.py [OPTIONS] [ASIN]
```

### Authentication

You can provide Oxylabs credentials in two ways:

1. **Command line arguments:**
   ```bash
   python oxylabs_amazon_scraper.py --username YOUR_USERNAME --password YOUR_PASSWORD
   ```

2. **Environment variables:**
   ```bash
   export OXYLABS_USERNAME="your_username"
   export OXYLABS_PASSWORD="your_password"
   python oxylabs_amazon_scraper.py
   ```

### Input Methods

#### 1. ASIN (Amazon Standard Identification Number)
Scrape a product by providing its ASIN:

```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --username USER --password PASS
```

#### 2. Full Amazon URL
Scrape a product by providing the complete Amazon URL:

```bash
python oxylabs_amazon_scraper.py --url "https://www.amazon.com/dp/B08N5WRWNW" --username USER --password PASS
```

#### 3. Search Query
Search for products and scrape the results:

```bash
python oxylabs_amazon_scraper.py --search "wireless headphones" --pages 2 --username USER --password PASS
```

### Command Line Options

| Option | Short | Description | Default |
|--------|-------|-------------|---------|
| `--output` | `-o` | Output filename to save results (JSON format) | None |
| `--country` | `-c` | Country code for geo-targeting | `US` |
| `--format` | `-f` | Output format (`json` or `pretty`) | `json` |
| `--pages` | `-p` | Number of pages to scrape for search results | `1` |
| `--username` | `-u` | Oxylabs username | None |
| `--password` | `-w` | Oxylabs password | None |
| `--verbose` | `-v` | Enable verbose logging | False |
| `--timeout` | | Request timeout in seconds | `180` |
| `--help` | `-h` | Show help message and exit | |

### Supported Countries

- `US` - United States (default)
- `UK` - United Kingdom
- `DE` - Germany
- `FR` - France
- `IT` - Italy
- `ES` - Spain
- `CA` - Canada
- `JP` - Japan
- `AU` - Australia
- `IN` - India

### Output Formats

#### JSON Format (default)
Returns structured JSON data suitable for further processing:

```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --format json
```

#### Pretty Format
Returns human-readable formatted output:

```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --format pretty
```

### Examples

#### 1. Basic product scraping with ASIN
```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --username USER --password PASS
```

#### 2. Save results to file
```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --output B08N5WRWNW.json --username USER --password PASS
```

#### 3. Scrape UK Amazon product
```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --country UK --username USER --password PASS
```

#### 4. Search for products with pretty output
```bash
python oxylabs_amazon_scraper.py --search "wireless headphones" --format pretty --username USER --password PASS
```

#### 5. Scrape multiple pages of search results
```bash
python oxylabs_amazon_scraper.py --search "gaming laptop" --pages 3 --output search_results.json --username USER --password PASS
```

#### 6. Scrape with custom timeout and verbose logging
```bash
python oxylabs_amazon_scraper.py B08N5WRWNW --timeout 300 --verbose --username USER --password PASS
```

#### 7. Using environment variables for credentials
```bash
export OXYLABS_USERNAME="your_username"
export OXYLABS_PASSWORD="your_password"
python oxylabs_amazon_scraper.py --url "https://www.amazon.co.uk/dp/B08N5WRWNW" --country UK --output uk_product.json
```

### Error Handling

The CLI provides comprehensive error handling:

- **Missing credentials:** Clear error message with instructions
- **Invalid ASIN/URL:** Validation and error reporting
- **API errors:** Detailed error messages with status codes
- **Network issues:** Timeout and connection error handling
- **File writing errors:** Error messages for output file issues

### Help

View the complete help message:

```bash
python oxylabs_amazon_scraper.py --help
```

## Integration with Scripts

The CLI can be easily integrated into shell scripts or automated workflows:

```bash
#!/bin/bash

# Set credentials
export OXYLABS_USERNAME="your_username"
export OXYLABS_PASSWORD="your_password"

# Scrape multiple products
for asin in B08N5WRWNW B07XJ8C8F5 B08N5WRWNW; do
    echo "Scraping $asin..."
    python oxylabs_amazon_scraper.py "$asin" --output "$asin.json"
done

# Search and save results
python oxylabs_amazon_scraper.py --search "wireless headphones" --pages 2 --output headphones_search.json
```

## Return Codes

- `0`: Success
- `1`: General error (API error, no results, etc.)
- `2`: Command line argument error

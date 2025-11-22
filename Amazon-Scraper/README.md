# Amazon Scraper using Oxylabs

A Python-based Amazon product scraper that uses Oxylabs residential proxies to avoid IP blocking and rate limiting. This tool can scrape individual product pages and search results from Amazon.

## Features

- **Proxy Integration**: Uses Oxylabs residential proxies for reliable scraping
- **Product Scraping**: Extract detailed product information including:
  - Title, price, availability
  - Ratings and review counts
  - Product descriptions and specifications
  - Product images
- **Search Results**: Scrape multiple pages of Amazon search results
- **Geo-targeting**: Support for different countries/regions
- **Data Export**: Save scraped data to JSON files
- **Error Handling**: Comprehensive logging and error management
- **Rate Limiting**: Built-in delays to respect Amazon's servers

## Prerequisites

- Python 3.8 or higher
- Oxylabs account with residential proxy access
- Valid Oxylabs username and password

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/Amazon-Scraper.git
   cd Amazon-Scraper
   ```

2. Install required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up your Oxylabs credentials:
   - Edit the `oxylabs_amazon_scraper.py` file
   - Replace `your_oxylabs_username` and `your_oxylabs_password` with your actual credentials
   - Or use environment variables (recommended for security)

## Usage

### Basic Usage

```python
from oxylabs_amazon_scraper import OxylabsAmazonScraper

# Initialize the scraper
scraper = OxylabsAmazonScraper("your_username", "your_password")

# Scrape a single product
product_url = "https://www.amazon.com/dp/YOUR_PRODUCT_ID"
product_data = scraper.scrape_product(product_url)

# Scrape search results
search_results = scraper.scrape_search_results("wireless headphones", pages=2)

# Save data to JSON
scraper.save_to_json(product_data, "product.json")
scraper.save_to_json(search_results, "search_results.json")
```

### Example Usage with Real Products

#### 1. Scraping Electronics (Sample ASIN: B07FZ8S74R)

```python
from oxylabs_amazon_scraper import OxylabsAmazonScraper
import json

# Initialize scraper with your credentials
scraper = OxylabsAmazonScraper("your_username", "your_password")

# Scrape Amazon Echo Dot (3rd Gen) - Electronics Category
echo_dot_url = "https://www.amazon.com/dp/B07FZ8S74R"
echo_dot_data = scraper.scrape_product(echo_dot_url)

# Print formatted results
if echo_dot_data['metadata']['extraction_successful']:
    product = echo_dot_data['product']
    print(f"Product: {product['name']}")
    print(f"Brand: {product['brand']}")
    print(f"Price: ${product['price']}")
    print(f"Rating: {product['rating']}/5 ({product['reviews_count']} reviews)")
    print(f"Availability: {product['availability']}")
    print(f"\nKey Features:")
    for feature in product['features']:
        print(f"  • {feature}")
else:
    print(f"Error: {echo_dot_data['metadata']['error_message']}")

# Save to file
scraper.save_to_json(echo_dot_data, "B07FZ8S74R.json")
```

#### 2. Scraping Books Category

```python
# Scrape a popular book
book_url = "https://www.amazon.com/dp/B08HJGVYWZ"  # Example book ASIN
book_data = scraper.scrape_product(book_url)

if book_data['metadata']['extraction_successful']:
    product = book_data['product']
    print(f"Title: {product['name']}")
    print(f"Author: {product['brand']}")
    print(f"Price: ${product['price']}")
    print(f"Rating: {product['rating']}/5")
    print(f"Format: {product['specifications'].get('Format', 'N/A')}")
    print(f"Pages: {product['specifications'].get('Pages', 'N/A')}")
```

#### 3. Scraping Home & Garden Category

```python
# Scrape a home improvement product
home_product_url = "https://www.amazon.com/dp/B085WJBZPX"  # Example home product
home_data = scraper.scrape_product(home_product_url)

if home_data['metadata']['extraction_successful']:
    product = home_data['product']
    print(f"Product: {product['name']}")
    print(f"Brand: {product['brand']}")
    print(f"Price: ${product['price']}")
    print(f"Dimensions: {product['specifications'].get('Dimensions', 'N/A')}")
    print(f"Weight: {product['specifications'].get('Weight', 'N/A')}")
```

#### 4. Scraping Fashion & Clothing Category

```python
# Scrape a clothing item
clothing_url = "https://www.amazon.com/dp/B08T5NWXKP"  # Example clothing ASIN
clothing_data = scraper.scrape_product(clothing_url)

if clothing_data['metadata']['extraction_successful']:
    product = clothing_data['product']
    print(f"Item: {product['name']}")
    print(f"Brand: {product['brand']}")
    print(f"Price: ${product['price']}")
    print(f"Available Sizes: {product['specifications'].get('Sizes', 'N/A')}")
    print(f"Material: {product['specifications'].get('Material', 'N/A')}")
```

### Edge Cases and Error Handling

#### 1. Out of Stock Products

```python
# Handle out of stock products
out_of_stock_url = "https://www.amazon.com/dp/B08EXAMPLE"
result = scraper.scrape_product(out_of_stock_url)

if result['metadata']['extraction_successful']:
    product = result['product']
    if product['availability'].lower() in ['out of stock', 'unavailable', 'currently unavailable']:
        print(f"Product '{product['name']}' is out of stock")
        print(f"You can still view details: {product['description']}")
    else:
        print(f"Product is available: {product['availability']}")
else:
    print(f"Error scraping product: {result['metadata']['error_message']}")
```

#### 2. Products with No Reviews

```python
# Handle products with no reviews
no_reviews_url = "https://www.amazon.com/dp/B08NEWITEM"
result = scraper.scrape_product(no_reviews_url)

if result['metadata']['extraction_successful']:
    product = result['product']
    if product['reviews_count'] == '0' or not product['reviews_count']:
        print(f"Product '{product['name']}' has no reviews yet")
        print(f"Rating: Not yet rated")
    else:
        print(f"Product has {product['reviews_count']} reviews")
        print(f"Average rating: {product['rating']}/5")
```

#### 3. Invalid ASIN Handling

```python
# Handle invalid ASINs
invalid_asins = [
    "https://www.amazon.com/dp/INVALID123",
    "https://www.amazon.com/dp/B123",  # Too short
    "https://www.amazon.com/dp/123456789",  # No B prefix
]

for url in invalid_asins:
    try:
        result = scraper.scrape_product(url)
        if not result['metadata']['extraction_successful']:
            print(f"Failed to scrape {url}: {result['metadata']['error_message']}")
    except Exception as e:
        print(f"Error processing {url}: {str(e)}")
```

#### 4. Network Error Handling

```python
# Handle network errors with retry logic
from requests.exceptions import RequestException

def safe_scrape_product(scraper, url, max_retries=3):
    """Safely scrape a product with retry logic"""
    for attempt in range(max_retries):
        try:
            result = scraper.scrape_product(url)
            if result['metadata']['extraction_successful']:
                return result
            else:
                print(f"Attempt {attempt + 1} failed: {result['metadata']['error_message']}")
        except RequestException as e:
            print(f"Network error on attempt {attempt + 1}: {str(e)}")
            if attempt < max_retries - 1:
                time.sleep(2 ** attempt)  # Exponential backoff
    
    return None

# Usage
result = safe_scrape_product(scraper, "https://www.amazon.com/dp/B07FZ8S74R")
if result:
    print("Successfully scraped product")
else:
    print("Failed to scrape product after retries")
```

### Batch Processing Multiple Products

```python
# Scrape multiple products from different categories
products_to_scrape = [
    {"url": "https://www.amazon.com/dp/B07FZ8S74R", "category": "Electronics"},
    {"url": "https://www.amazon.com/dp/B08HJGVYWZ", "category": "Books"},
    {"url": "https://www.amazon.com/dp/B085WJBZPX", "category": "Home & Garden"},
    {"url": "https://www.amazon.com/dp/B08T5NWXKP", "category": "Fashion"},
]

results = []
for item in products_to_scrape:
    print(f"Scraping {item['category']} product...")
    result = scraper.scrape_product(item['url'])
    
    if result['metadata']['extraction_successful']:
        product = result['product']
        results.append({
            "category": item['category'],
            "name": product['name'],
            "brand": product['brand'],
            "price": product['price'],
            "rating": product['rating'],
            "reviews_count": product['reviews_count'],
            "availability": product['availability'],
            "url": item['url']
        })
        print(f"✅ Successfully scraped: {product['name']}")
    else:
        print(f"❌ Failed to scrape: {result['metadata']['error_message']}")
    
    # Be respectful to the server
    time.sleep(1)

# Save batch results
scraper.save_to_json(results, "batch_scraping_results.json")
print(f"\nBatch scraping completed. {len(results)} products scraped successfully.")
```

### Search Results with Category Filtering

```python
# Search for products in specific categories
search_queries = [
    "wireless headphones",
    "programming books",
    "kitchen appliances",
    "running shoes",
    "smartphone accessories"
]

all_search_results = {}
for query in search_queries:
    print(f"Searching for: {query}")
    results = scraper.scrape_search_results(query, pages=2)
    
    if results:
        all_search_results[query] = results
        print(f"Found {len(results)} products for '{query}'")
        
        # Show top 3 results
        for i, product in enumerate(results[:3], 1):
            print(f"  {i}. {product['title']} - {product['price']}")
    else:
        print(f"No results found for '{query}'")
    
    time.sleep(1)  # Rate limiting

# Save all search results
scraper.save_to_json(all_search_results, "category_search_results.json")
```

### Batch Processing ASINs from File

Process multiple ASINs from a text file and save each product to its own JSON file:

```bash
# Basic usage - process all ASINs in ASINs.txt
python process_asins.py

# Or use the convenience script with options
python run_processor.py --test                    # Test with first 5 ASINs
python run_processor.py --delay 2.0               # 2 second delay between requests
python run_processor.py --input my_asins.txt      # Custom input file
python run_processor.py --output my_products       # Custom output directory
```

#### ASIN File Format

Create a text file with ASINs, one per line:

```
1 B07FZ8S74R
2 B08N5WRWNW
3 B09W26JCGH
4 B0836DNZZN
```

The processor will:
- Read ASINs from the file
- Scrape each product individually
- Save each product to a separate JSON file named using the ASIN
- ASIN-only filename format ensures uniqueness and consistency
- Skip already processed ASINs (resume capability)
- Generate a failed ASINs report for debugging

#### Output Structure

Each product will be saved as:
```
products/
├── B07FZ8S74R.json
├── B08N5WRWNW.json
├── B09W26JCGH.json
└── failed_asins_report.json
```

### Command Line Usage

```bash
python oxylabs_amazon_scraper.py
```

### Environment Variables (Recommended)

For security, use environment variables for your credentials:

```bash
export OXYLABS_USERNAME="your_username"
export OXYLABS_PASSWORD="your_password"
```

Then modify the script to use:
```python
import os
USERNAME = os.getenv("OXYLABS_USERNAME")
PASSWORD = os.getenv("OXYLABS_PASSWORD")
```

## API Reference

### OxylabsAmazonScraper Class

#### `__init__(username, password)`
Initialize the scraper with Oxylabs credentials.

#### `scrape_product(product_url, country="US")`
Scrape a single Amazon product page.
- **product_url**: Full Amazon product URL
- **country**: Country code for geo-targeting (default: "US")
- **Returns**: Dictionary with product information

#### `scrape_search_results(search_query, country="US", pages=1)`
Scrape Amazon search results.
- **search_query**: Search term
- **country**: Country code for geo-targeting
- **pages**: Number of pages to scrape
- **Returns**: List of product dictionaries

#### `save_to_json(data, filename)`
Save scraped data to a JSON file.
- **data**: Data to save (dict or list)
- **filename**: Output filename

## Data Structure

### Product Data
```json
{
  "title": "Product Title",
  "price": "$29.99",
  "availability": "In Stock",
  "rating": "4.5",
  "reviews_count": "1,234",
  "description": "Product description...",
  "images": ["image_url1", "image_url2"],
  "specifications": {
    "Brand": "Brand Name",
    "Model": "Model Number"
  },
  "url": "https://www.amazon.com/dp/...",
  "scraped_at": "2023-12-01 10:30:00"
}
```

### Search Results Data
```json
[
  {
    "title": "Product Title",
    "price": "$29.99",
    "rating": "4.5",
    "reviews_count": "1,234",
    "url": "https://www.amazon.com/dp/...",
    "image": "image_url",
    "scraped_at": "2023-12-01 10:30:00"
  }
]
```

## Configuration

### Supported Countries
- US (United States)
- UK (United Kingdom)
- DE (Germany)
- FR (France)
- IT (Italy)
- ES (Spain)
- CA (Canada)
- JP (Japan)
- And more...

### Rate Limiting
The scraper includes built-in delays between requests to be respectful to Amazon's servers. You can modify the delay in the `scrape_search_results` method.

## Error Handling

The scraper includes comprehensive error handling:
- API request failures
- Missing data in responses
- File I/O errors
- Network timeouts

All errors are logged using Python's logging module.

## Legal Considerations

- **Terms of Service**: Always respect Amazon's Terms of Service
- **Rate Limiting**: Don't make excessive requests
- **Data Usage**: Use scraped data responsibly
- **Commercial Use**: Check Oxylabs and Amazon policies for commercial usage

## Limitations

- Requires active Oxylabs subscription
- Subject to Amazon's anti-scraping measures
- API rate limits may apply
- Some product information may not be available for all products

## Troubleshooting

### Common Issues

1. **Authentication Error**: Verify your Oxylabs credentials
2. **No Results**: Check if the URL is valid and accessible
3. **Timeout Errors**: Increase the timeout value in `_make_request`
4. **Rate Limiting**: Reduce request frequency

### Debug Mode

Enable debug logging:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Disclaimer

This tool is for educational and research purposes only. Users are responsible for complying with Amazon's Terms of Service and applicable laws. The authors are not responsible for any misuse of this tool.

## Support

For issues and questions:
- Open an issue on GitHub
- Check the documentation
- Contact Oxylabs support for proxy-related issues

## Changelog

### Version 1.0.0
- Initial release
- Basic product scraping functionality
- Search results scraping
- JSON export capability
- Oxylabs integration

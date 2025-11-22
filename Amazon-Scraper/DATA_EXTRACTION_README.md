# Data Extraction and Formatting Function

## Overview

The `extract_and_format_product_data` function is a comprehensive solution for parsing complex Oxylabs API responses and extracting Amazon product information. It handles missing fields gracefully, formats bullet points for descriptions, and returns a clean JSON structure.

## Features

- **Robust Response Parsing**: Handles complex nested Oxylabs API response structures
- **Multiple Field Extraction**: Extracts name, brand, price, rating, reviews count, description, bullet points, images, specifications, and availability
- **Graceful Error Handling**: Continues processing even when fields are missing or malformed
- **Price Formatting**: Converts various price formats to standardized decimal representation
- **Bullet Point Formatting**: Converts bullet points to readable format with proper unicode bullets
- **Clean JSON Structure**: Returns well-organized JSON with product data and metadata

## Function Signature

```python
def extract_and_format_product_data(self, oxylabs_response: Dict[str, Any]) -> Dict[str, Any]:
```

## Input Format

Expected Oxylabs API response structure:
```json
{
  "results": [
    {
      "content": {
        "title": "Product Name",
        "brand": "Brand Name",
        "price": "$99.99",
        "rating": "4.5 out of 5 stars",
        "reviews_count": "1,234 ratings",
        "description": "Product description",
        "bullet_points": ["Feature 1", "Feature 2"],
        "images": ["url1.jpg", "url2.jpg"],
        "specifications": {"Key": "Value"},
        "availability": "In Stock",
        "url": "https://amazon.com/product"
      }
    }
  ]
}
```

## Output Format

Returns a clean JSON structure:
```json
{
  "product": {
    "name": "Product Name",
    "brand": "Brand Name",
    "price": "99.99",
    "rating": "4.5",
    "reviews_count": "1234",
    "description": "Product description",
    "bullet_points": "• Feature 1\n• Feature 2",
    "features": ["Feature 1", "Feature 2"],
    "images": ["url1.jpg", "url2.jpg"],
    "specifications": {"Key": "Value"},
    "availability": "In Stock",
    "url": "https://amazon.com/product",
    "scraped_at": "2025-07-09 15:53:01"
  },
  "metadata": {
    "extraction_successful": true,
    "error_message": null,
    "fields_extracted": 6
  }
}
```

## Field Extraction Details

### Name/Title
- **Primary keys**: `title`, `name`, `product_title`
- **Fallback**: "Unknown"

### Brand
- **Primary keys**: `brand`, `manufacturer`, `brand_name`
- **Fallback**: "Unknown"

### Price
- **Primary keys**: `price`, `current_price`, `sale_price`, `price_current`, `price_range`
- **Processing**: Removes currency symbols, converts to decimal
- **Fallback**: "0.00"

### Rating
- **Primary keys**: `rating`, `average_rating`, `stars`, `rating_average`
- **Processing**: Extracts numeric value from text (e.g., "4.5 out of 5 stars" → "4.5")
- **Fallback**: "0"

### Reviews Count
- **Primary keys**: `reviews_count`, `review_count`, `total_reviews`, `number_of_reviews`
- **Processing**: Extracts numeric value, removes commas
- **Fallback**: "0"

### Description
- **Primary keys**: `description`, `product_description`, `about`
- **Fallback**: Empty string

### Bullet Points
- **Primary keys**: `bullet_points`, `features`, `key_features`, `highlights`, `product_features`
- **Processing**: Converts to bulleted text format with unicode bullets
- **Fallback**: Empty list/string

### Images
- **Primary keys**: `images`, `image_urls`, `product_images`, `photos`
- **Fallback**: Empty list

### Specifications
- **Primary keys**: `specifications`, `specs`, `technical_details`, `product_details`, `attributes`
- **Processing**: Converts lists to dictionaries when possible
- **Fallback**: Empty object

### Availability
- **Primary keys**: `availability`, `stock_status`, `in_stock`
- **Fallback**: Empty string

## Error Handling

The function handles various error scenarios:

1. **API Errors**: Returns error information in metadata
2. **Missing Results**: Gracefully handles empty results
3. **Missing Content**: Handles responses without content
4. **Malformed Data**: Continues processing with default values
5. **Price Parsing Errors**: Returns original value if conversion fails

## Usage Example

```python
# Initialize scraper
scraper = OxylabsAmazonScraper(username, password)

# Get raw response from Oxylabs
response = scraper._make_request(product_url)

# Extract and format data
formatted_data = scraper.extract_and_format_product_data(response)

# Access extracted data
product_name = formatted_data['product']['name']
price = formatted_data['product']['price']
extraction_success = formatted_data['metadata']['extraction_successful']
```

## Testing

Run the test file to see the function in action:

```bash
python3 test_data_extraction.py
```

The test demonstrates:
- Complete data extraction from a full response
- Handling of missing fields
- Error response processing

## Integration

The function is integrated into the main scraper class and is automatically used when calling `scrape_product()`. The original basic extraction logic has been replaced with this comprehensive solution.

## Key Benefits

1. **Robustness**: Handles various response formats and missing data
2. **Flexibility**: Supports multiple field name variations
3. **Consistency**: Returns standardized output format
4. **Maintainability**: Well-structured with helper methods
5. **Debugging**: Provides metadata about extraction success
6. **Performance**: Efficient parsing with minimal overhead

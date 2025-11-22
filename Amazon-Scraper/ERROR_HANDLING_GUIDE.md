# Error Handling Guide

This guide explains the comprehensive error handling system implemented in the Amazon scraper.

## Overview

The scraper includes robust error handling for all common failure scenarios:

- **Invalid ASINs**: Validates ASIN format and extracts from URLs
- **API Connection Failures**: Handles network issues, timeouts, and server errors
- **Rate Limiting**: Implements exponential backoff for rate limit responses
- **Missing or Malformed Data**: Gracefully handles incomplete API responses
- **Invalid Credentials**: Validates and provides clear error messages for authentication issues

## Custom Exception Classes

### Base Exception
```python
class ScraperError(Exception):
    """Base exception for scraper errors"""
    pass
```

### Specific Exceptions

#### InvalidASINError
Raised when ASIN format is invalid or cannot be extracted from URL.

**Examples:**
- `B123` (too short)
- `INVALID123` (invalid format)
- `123456789` (missing B prefix)

#### APIConnectionError
Raised when API connection fails after retries.

**Common causes:**
- Network connectivity issues
- Server downtime
- DNS resolution problems

#### RateLimitError
Raised when rate limit is exceeded after retries with exponential backoff.

**Behavior:**
- Automatically retries with increasing delays
- Gives up after max retries exceeded

#### InvalidCredentialsError
Raised when API credentials are invalid or malformed.

**Validation checks:**
- Credentials not empty
- Minimum length requirements
- Authentication failure responses (HTTP 401)

#### DataExtractionError
Raised when data extraction or parsing fails.

**Common causes:**
- Invalid JSON responses
- Unexpected response structure
- Missing required fields

#### ValidationError
Raised when response structure or data validation fails.

**Validation checks:**
- Response structure validation
- Data type validation
- Range validation for ratings and prices

## Error Handling Features

### 1. ASIN Validation

The scraper validates ASIN format and extracts ASINs from various URL formats:

```python
def _validate_asin(self, asin: str) -> bool:
    """Validate ASIN format (B + 9 alphanumeric characters)"""
    return bool(ASIN_REGEX.match(asin))

def _extract_asin_from_url(self, url: str) -> str:
    """Extract ASIN from Amazon URL with multiple pattern support"""
    # Supports patterns like:
    # - /dp/{ASIN}
    # - /product/{ASIN}
    # - /gp/product/{ASIN}
    # - asin={ASIN}
```

**Valid ASIN format:** `B` followed by 9 alphanumeric characters (e.g., `B08N5WRWNW`)

### 2. Retry Mechanism

Implements intelligent retry logic with exponential backoff:

```python
# Configuration
MAX_RETRIES = 3
RETRY_DELAY = 1
RETRY_BACKOFF = 2

# Retry logic
for attempt in range(MAX_RETRIES):
    try:
        # Make request
        response = self.session.post(...)
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:  # Rate limit
            sleep_time = RETRY_DELAY * (RETRY_BACKOFF ** attempt) * 2
            time.sleep(sleep_time)
        elif e.response.status_code >= 500:  # Server error
            sleep_time = RETRY_DELAY * (RETRY_BACKOFF ** attempt)
            time.sleep(sleep_time)
        else:
            raise  # Don't retry client errors
```

### 3. Rate Limiting Handling

Special handling for rate limit responses (HTTP 429):

- **Exponential backoff**: Delays increase exponentially (2s, 4s, 8s, ...)
- **Separate handling**: Rate limits get longer delays than other errors
- **Max retries**: Gives up after configured number of attempts

### 4. Data Validation

Comprehensive validation of extracted data:

```python
def _validate_extracted_data(self, product_data: Dict[str, Any]) -> None:
    """Validate extracted product data"""
    # Check required fields
    required_fields = ["name", "brand", "price", "rating", "reviews_count", "description"]
    
    # Validate price format
    if product_data["price"] and not re.match(r'^\d+(\.\d{1,2})?$', product_data["price"]):
        logger.warning(f"Price format may be invalid: {product_data['price']}")
    
    # Validate rating range (0-5)
    if product_data["rating"]:
        rating_val = float(product_data["rating"])
        if not (0 <= rating_val <= 5):
            logger.warning(f"Rating value out of range: {rating_val}")
    
    # Validate reviews count (non-negative)
    if product_data["reviews_count"]:
        reviews_val = int(product_data["reviews_count"].replace(',', ''))
        if reviews_val < 0:
            logger.warning(f"Invalid reviews count: {reviews_val}")
```

### 5. Response Structure Validation

Validates API response structure before processing:

```python
def _validate_response_structure(self, response: Dict[str, Any]) -> None:
    """Validate the structure of the API response"""
    # Check basic structure
    if not isinstance(response, dict):
        raise ValidationError("Response must be a dictionary")
    
    # Handle API errors
    if "error" in response:
        error_type = response.get("error", "unknown")
        error_message = response.get("message", "Unknown error")
        # Map to specific exceptions
        
    # Validate results
    if "results" not in response:
        raise ValidationError("No 'results' field found in API response")
    
    # Validate content
    if "content" not in response["results"][0]:
        raise ValidationError("No 'content' field found in first result")
```

### 6. Graceful Degradation

The scraper continues to work even when some data is missing or malformed:

```python
# Extract each field with individual error handling
try:
    product_data["name"] = self._safe_extract_text(content, ["title", "name", "product_title"])
except Exception as e:
    logger.warning(f"Error extracting name: {e}")

try:
    product_data["price"] = self._extract_and_format_price(content)
except Exception as e:
    logger.warning(f"Error extracting price: {e}")

# ... similar pattern for all fields
```

## Error Response Format

All errors are returned in a consistent format:

```json
{
  "product": {
    "name": "Unknown",
    "brand": "Unknown",
    "price": "0.00",
    "rating": "0",
    "reviews_count": "0",
    "description": "",
    "bullet_points": "",
    "features": [],
    "images": [],
    "specifications": {},
    "availability": "",
    "url": "",
    "scraped_at": "2024-01-01 12:00:00"
  },
  "metadata": {
    "extraction_successful": false,
    "error_message": "Detailed error description",
    "fields_extracted": 0
  }
}
```

## Testing Error Handling

The `test_error_handling.py` file contains comprehensive tests for all error scenarios:

```bash
# Run error handling tests
python test_error_handling.py

# Run specific test categories
python -m unittest test_error_handling.TestErrorHandling.test_invalid_asin_format
python -m unittest test_error_handling.TestErrorHandling.test_rate_limiting
python -m unittest test_error_handling.TestErrorHandling.test_retry_mechanism_with_temporary_failures
```

## Best Practices

### 1. Always Check for Errors

```python
result = scraper.scrape_product(url)
if not result["metadata"]["extraction_successful"]:
    print(f"Error: {result['metadata']['error_message']}")
    # Handle error appropriately
```

### 2. Handle Specific Exceptions

```python
try:
    result = scraper._make_request_with_retry(url)
except InvalidASINError:
    print("Invalid ASIN provided")
except RateLimitError:
    print("Rate limit exceeded, try again later")
except APIConnectionError:
    print("Connection failed, check network")
```

### 3. Monitor Warnings

Enable verbose logging to see warnings about data quality:

```python
import logging
logging.getLogger('oxylabs_amazon_scraper').setLevel(logging.WARNING)
```

### 4. Configure Retry Settings

Adjust retry settings based on your needs:

```python
# In the scraper file, modify these constants:
MAX_RETRIES = 5  # More retries for better reliability
RETRY_DELAY = 2  # Longer initial delay
RETRY_BACKOFF = 1.5  # Less aggressive backoff
```

## Error Scenarios and Solutions

### Invalid ASIN
**Problem:** URL contains invalid or missing ASIN
**Solution:** Validate URLs before processing, provide clear error messages

### API Connection Issues
**Problem:** Network failures, DNS issues, server downtime
**Solution:** Retry with exponential backoff, fail gracefully after max attempts

### Rate Limiting
**Problem:** Too many requests in short time
**Solution:** Exponential backoff with longer delays, respect rate limits

### Authentication Failures
**Problem:** Invalid credentials, expired tokens
**Solution:** Validate credentials before requests, provide clear error messages

### Data Extraction Issues
**Problem:** Unexpected response format, missing fields
**Solution:** Validate response structure, extract fields individually with error handling

### Malformed Data
**Problem:** Invalid data types, out-of-range values
**Solution:** Validate extracted data, log warnings for invalid formats

## Configuration

You can customize error handling behavior by modifying these constants:

```python
# Error handling constants
MAX_RETRIES = 3          # Maximum retry attempts
RETRY_DELAY = 1          # Initial retry delay (seconds)
RETRY_BACKOFF = 2        # Backoff multiplier
DEFAULT_TIMEOUT = 180    # Request timeout (seconds)

# ASIN validation
ASIN_REGEX = re.compile(r'^B[0-9A-Z]{9}$')  # ASIN format validation
```

## Logging

The scraper provides detailed logging for debugging:

```python
# Enable debug logging
import logging
logging.getLogger('oxylabs_amazon_scraper').setLevel(logging.DEBUG)

# Log levels used:
# DEBUG: Detailed request/response info
# INFO: Normal operation status
# WARNING: Data quality issues, non-critical errors
# ERROR: Serious errors that prevent operation
```

This comprehensive error handling system ensures the scraper is robust and provides meaningful feedback when issues occur.

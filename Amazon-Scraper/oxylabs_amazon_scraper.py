"""
Amazon Product Scraper using Oxylabs Proxy Service

This script scrapes Amazon product information using Oxylabs residential proxies
to avoid IP blocking and rate limiting.
"""

import requests
import json
import sys
import os
import argparse
import time
from urllib.parse import urljoin, urlparse
from typing import Dict, List, Optional, Any
import logging
import re
from decimal import Decimal, InvalidOperation

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# API credentials and endpoint configuration
OXYLABS_API_ENDPOINT = "https://realtime.oxylabs.io/v1/queries"
DEFAULT_TIMEOUT = 180
DEFAULT_COUNTRY = "US"
DEFAULT_GEO_LOCATION = "10001"  # Default zip code for US

# Error handling constants
MAX_RETRIES = 3
RETRY_DELAY = 1
RETRY_BACKOFF = 2

# ASIN validation regex
ASIN_REGEX = re.compile(r'^B[0-9A-Z]{9}$')

# Custom exceptions
class ScraperError(Exception):
    """Base exception for scraper errors"""
    pass

class InvalidASINError(ScraperError):
    """Raised when ASIN format is invalid"""
    pass

class APIConnectionError(ScraperError):
    """Raised when API connection fails"""
    pass

class RateLimitError(ScraperError):
    """Raised when rate limit is exceeded"""
    pass

class InvalidCredentialsError(ScraperError):
    """Raised when API credentials are invalid"""
    pass

class DataExtractionError(ScraperError):
    """Raised when data extraction fails"""
    pass

class ValidationError(ScraperError):
    """Raised when data validation fails"""
    pass

# Request configuration
REQUEST_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Oxylabs-Amazon-Scraper/1.0'
}


class OxylabsAmazonScraper:
    """
    Amazon scraper using Oxylabs proxy service
    """
    
    def __init__(self, username: str, password: str):
        """
        Initialize the scraper with Oxylabs credentials
        
        Args:
            username (str): Oxylabs username
            password (str): Oxylabs password
        """
        self.username = username
        self.password = password
        self.session = requests.Session()
        self.session.headers.update(REQUEST_HEADERS)
        self.base_url = OXYLABS_API_ENDPOINT
        self.timeout = DEFAULT_TIMEOUT
        
    def _validate_asin(self, asin: str) -> bool:
        """
        Validate ASIN format
        
        Args:
            asin (str): Amazon ASIN to validate
            
        Returns:
            bool: True if valid, False otherwise
        """
        return bool(ASIN_REGEX.match(asin))
    
    def _extract_asin_from_url(self, url: str) -> str:
        """
        Extract ASIN from Amazon URL
        
        Args:
            url (str): Amazon product URL
            
        Returns:
            str: Extracted ASIN
            
        Raises:
            InvalidASINError: If ASIN cannot be extracted or is invalid
        """
        # Try to extract ASIN from various URL formats  
        asin_patterns = [
            r'/dp/(B[0-9A-Z]{9})',
            r'/product/(B[0-9A-Z]{9})',
            r'/gp/product/(B[0-9A-Z]{9})',
            r'asin=(B[0-9A-Z]{9})'
        ]
        
        for pattern in asin_patterns:
            match = re.search(pattern, url)
            if match:
                asin = match.group(1)
                if self._validate_asin(asin):
                    return asin
        
        raise InvalidASINError(f"Invalid or missing ASIN in URL: {url}")
    
    def _validate_credentials(self) -> None:
        """
        Validate API credentials
        
        Raises:
            InvalidCredentialsError: If credentials are invalid
        """
        if not self.username or not self.password:
            raise InvalidCredentialsError("Username and password are required")
        
        if len(self.username) < 3 or len(self.password) < 3:
            raise InvalidCredentialsError("Invalid credential format")
    
    def _make_request_with_retry(self, url: str, geo_location: str = DEFAULT_GEO_LOCATION) -> Dict:
        """
        Make request with retry logic for transient errors
        
        Args:
            url (str): Amazon URL to scrape
            geo_location (str): Zip code for geo-targeting
            
        Returns:
            Dict: Response from Oxylabs API
            
        Raises:
            InvalidASINError: If ASIN is invalid
            InvalidCredentialsError: If credentials are invalid
            RateLimitError: If rate limit is exceeded
            APIConnectionError: If connection fails after retries
        """
        # Validate credentials first
        self._validate_credentials()
        
        # Extract and validate ASIN
        asin = self._extract_asin_from_url(url)
        
        payload = {
            "source": "amazon",
            "url": url,
            "geo_location": geo_location,
            "parse": True
        }
        
        last_exception = None
        
        for attempt in range(MAX_RETRIES):
            try:
                logger.info(f"Making request to Oxylabs API for URL: {url} (attempt {attempt + 1}/{MAX_RETRIES})")
                response = self.session.post(
                    self.base_url,
                    json=payload,
                    auth=(self.username, self.password),
                    timeout=self.timeout
                )
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Request successful. Status: {response.status_code}")
                return result
                
            except requests.exceptions.Timeout as e:
                last_exception = e
                logger.warning(f"Request timeout after {self.timeout} seconds (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (RETRY_BACKOFF ** attempt))
                    continue
                
            except requests.exceptions.HTTPError as e:
                if response.status_code == 401:
                    raise InvalidCredentialsError("Invalid API credentials")
                elif response.status_code == 429:
                    logger.warning(f"Rate limit exceeded (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                    if attempt < MAX_RETRIES - 1:
                        # Exponential backoff for rate limiting
                        sleep_time = RETRY_DELAY * (RETRY_BACKOFF ** attempt) * 2
                        logger.info(f"Sleeping for {sleep_time} seconds due to rate limit")
                        time.sleep(sleep_time)
                        continue
                    else:
                        raise RateLimitError("Rate limit exceeded after retries")
                elif response.status_code >= 500:
                    # Server errors - retry
                    last_exception = e
                    logger.warning(f"Server error {response.status_code} (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                    if attempt < MAX_RETRIES - 1:
                        time.sleep(RETRY_DELAY * (RETRY_BACKOFF ** attempt))
                        continue
                else:
                    # Client errors - don't retry
                    raise APIConnectionError(f"HTTP error {response.status_code}: {e}")
                
            except requests.exceptions.ConnectionError as e:
                last_exception = e
                logger.warning(f"Connection error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (RETRY_BACKOFF ** attempt))
                    continue
                
            except requests.exceptions.RequestException as e:
                last_exception = e
                logger.warning(f"Request failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (RETRY_BACKOFF ** attempt))
                    continue
                
            except json.JSONDecodeError as e:
                # JSON errors usually don't benefit from retries
                raise DataExtractionError(f"Invalid JSON response: {e}")
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Unexpected error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                if attempt < MAX_RETRIES - 1:
                    time.sleep(RETRY_DELAY * (RETRY_BACKOFF ** attempt))
                    continue
        
        # If we get here, all retries failed
        raise APIConnectionError(f"Request failed after {MAX_RETRIES} attempts. Last error: {last_exception}")
    
    def _make_request(self, url: str, geo_location: str = DEFAULT_GEO_LOCATION) -> Dict:
        """
        Make a request through Oxylabs proxy service with comprehensive error handling
        
        Args:
            url (str): Amazon URL to scrape
            geo_location (str): Zip code for geo-targeting
            
        Returns:
            Dict: Response from Oxylabs API with error handling
        """
        try:
            return self._make_request_with_retry(url, geo_location)
        except InvalidASINError as e:
            logger.error(f"Invalid ASIN: {e}")
            return {"error": "invalid_asin", "message": str(e)}
        except InvalidCredentialsError as e:
            logger.error(f"Invalid credentials: {e}")
            return {"error": "invalid_credentials", "message": str(e)}
        except RateLimitError as e:
            logger.error(f"Rate limit exceeded: {e}")
            return {"error": "rate_limit", "message": str(e)}
        except APIConnectionError as e:
            logger.error(f"API connection error: {e}")
            return {"error": "connection_error", "message": str(e)}
        except DataExtractionError as e:
            logger.error(f"Data extraction error: {e}")
            return {"error": "data_extraction_error", "message": str(e)}
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {"error": "unexpected_error", "message": str(e)}
    
    def scrape_product(self, product_url: str, geo_location: str = DEFAULT_GEO_LOCATION) -> Dict:
        """
        Scrape a single Amazon product
        
        Args:
            product_url (str): Amazon product URL
            geo_location (str): Zip code for geo-targeting (default: 10001)
            
        Returns:
            Dict: Product information
        """
        logger.info(f"Scraping product: {product_url}")
        
        response = self._make_request(product_url, geo_location)
        
        # Use the comprehensive extraction function
        product_data = self.extract_and_format_product_data(response)
        
        # Add the original URL to the product data
        if "product" in product_data:
            product_data["product"]["url"] = product_url
        
        return product_data

    def _format_product_data(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Format product data into clean JSON structure, handling missing fields gracefully.

        Args:
            product_data (Dict[str, Any]): Extracted product information.

        Returns:
            Dict[str, Any]: Product information formatted into JSON.
        """
        # Format bullet points for description
        description = product_data.get("description", "")
        product_data["description"] = "\n- " + "\n- ".join(description.split('\n')) if description else ""

        # Attempt to convert price to a decimal value
        price_str = product_data.get("price", "")
        try:
            product_data["price"] = str(Decimal(price_str.replace("$", "").replace(",", "").strip()))
        except (InvalidOperation, ValueError):
            product_data["price"] = ""

        # Handle missing fields by setting them to default values
        product_data.setdefault("title", "Unknown")
        product_data.setdefault("brand", "Unknown")
        product_data.setdefault("rating", "0")
        product_data.setdefault("reviews_count", "0")

        # Example additional JSON structure formatting
        product_data = {
            "product": {
                "name": product_data["title"],
                "brand": product_data["brand"],
                "price": product_data["price"],
                "rating": product_data.get("rating", ""),
                "reviews_count": product_data.get("reviews_count", ""),
                "description": product_data["description"],
                "url": product_data.get("url", ""),
                "images": product_data.get("images", []),
                "specifications": product_data.get("specifications", {}),
                "scraped_at": product_data.get("scraped_at", "")
            }
        }

        return product_data
    
    def _validate_response_structure(self, response: Dict[str, Any]) -> None:
        """
        Validate the structure of the API response
        
        Args:
            response (Dict[str, Any]): Response from Oxylabs API
            
        Raises:
            ValidationError: If response structure is invalid
        """
        if not isinstance(response, dict):
            raise ValidationError("Response must be a dictionary")
        
        if "error" in response:
            error_type = response.get("error", "unknown")
            error_message = response.get("message", "Unknown error")
            
            if error_type == "invalid_asin":
                raise InvalidASINError(error_message)
            elif error_type == "invalid_credentials":
                raise InvalidCredentialsError(error_message)
            elif error_type == "rate_limit":
                raise RateLimitError(error_message)
            elif error_type == "connection_error":
                raise APIConnectionError(error_message)
            else:
                raise DataExtractionError(f"API returned error: {error_message}")
        
        if "results" not in response:
            raise ValidationError("No 'results' field found in API response")
        
        if not isinstance(response["results"], list) or len(response["results"]) == 0:
            raise ValidationError("Results field must be a non-empty list")
        
        result = response["results"][0]
        if "content" not in result:
            raise ValidationError("No 'content' field found in first result")
        
        if not isinstance(result["content"], dict):
            raise ValidationError("Content field must be a dictionary")
    
    def _validate_extracted_data(self, product_data: Dict[str, Any]) -> None:
        """
        Validate extracted product data
        
        Args:
            product_data (Dict[str, Any]): Extracted product data
            
        Raises:
            ValidationError: If data is invalid
        """
        required_fields = ["name", "brand", "price", "rating", "reviews_count", "description"]
        
        for field in required_fields:
            if field not in product_data:
                raise ValidationError(f"Missing required field: {field}")
        
        # Validate price format if present
        if product_data["price"] and not re.match(r'^\d+(\.\d{1,2})?$', product_data["price"]):
            logger.warning(f"Price format may be invalid: {product_data['price']}")
        
        # Validate rating if present
        if product_data["rating"]:
            try:
                rating_val = float(product_data["rating"])
                if not (0 <= rating_val <= 5):
                    logger.warning(f"Rating value out of range: {rating_val}")
            except ValueError:
                logger.warning(f"Invalid rating format: {product_data['rating']}")
        
        # Validate reviews count if present
        if product_data["reviews_count"]:
            try:
                reviews_val = int(product_data["reviews_count"].replace(',', ''))
                if reviews_val < 0:
                    logger.warning(f"Invalid reviews count: {reviews_val}")
            except ValueError:
                logger.warning(f"Invalid reviews count format: {product_data['reviews_count']}")
    
    def extract_and_format_product_data(self, oxylabs_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse complex Oxylabs API response and extract product fields with comprehensive error handling.
        
        Args:
            oxylabs_response (Dict[str, Any]): Raw response from Oxylabs API
            
        Returns:
            Dict[str, Any]: Clean JSON structure with extracted product data
        """
        # Initialize empty product data structure
        product_data = {
            "name": "",
            "brand": "",
            "price": "",
            "rating": "",
            "reviews_count": "",
            "description": "",
            "bullet_points": [],
            "images": [],
            "specifications": {},
            "availability": "",
            "url": "",
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S"),
            "error": None
        }
        
        try:
            # Validate response structure
            self._validate_response_structure(oxylabs_response)
            
            result = oxylabs_response["results"][0]
            content = result["content"]
            
            # Extract product data with error handling for each field
            try:
                product_data["name"] = self._safe_extract_text(content, ["title", "name", "product_title"])
            except Exception as e:
                logger.warning(f"Error extracting name: {e}")
            
            try:
                product_data["brand"] = self._safe_extract_text(content, ["brand", "manufacturer", "brand_name"])
            except Exception as e:
                logger.warning(f"Error extracting brand: {e}")
            
            try:
                product_data["price"] = self._extract_and_format_price(content)
            except Exception as e:
                logger.warning(f"Error extracting price: {e}")
            
            try:
                product_data["rating"] = self._extract_rating(content)
            except Exception as e:
                logger.warning(f"Error extracting rating: {e}")
            
            try:
                product_data["reviews_count"] = self._extract_reviews_count(content)
            except Exception as e:
                logger.warning(f"Error extracting reviews count: {e}")
            
            try:
                product_data["description"] = self._safe_extract_text(content, ["description", "product_description", "about"])
            except Exception as e:
                logger.warning(f"Error extracting description: {e}")
            
            try:
                product_data["bullet_points"] = self._extract_bullet_points(content)
            except Exception as e:
                logger.warning(f"Error extracting bullet points: {e}")
            
            try:
                product_data["images"] = self._extract_images(content)
            except Exception as e:
                logger.warning(f"Error extracting images: {e}")
            
            try:
                product_data["specifications"] = self._extract_specifications(content)
            except Exception as e:
                logger.warning(f"Error extracting specifications: {e}")
            
            try:
                product_data["availability"] = self._safe_extract_text(content, ["availability", "stock_status", "in_stock"])
            except Exception as e:
                logger.warning(f"Error extracting availability: {e}")
            
            try:
                product_data["url"] = self._safe_extract_text(content, ["url", "product_url", "link"])
            except Exception as e:
                logger.warning(f"Error extracting URL: {e}")
            
            # Validate extracted data
            self._validate_extracted_data(product_data)
            
        except (InvalidASINError, InvalidCredentialsError, RateLimitError, APIConnectionError) as e:
            # Handle these specific errors by setting error in product data
            logger.error(f"API error: {e}")
            product_data["error"] = str(e)
        except ValidationError as e:
            logger.error(f"Validation error: {e}")
            product_data["error"] = f"Validation error: {str(e)}"
        except DataExtractionError as e:
            logger.error(f"Data extraction error: {e}")
            product_data["error"] = f"Data extraction error: {str(e)}"
        except Exception as e:
            logger.error(f"Unexpected error extracting product data: {str(e)}")
            product_data["error"] = f"Unexpected extraction error: {str(e)}"
        
        return self._create_clean_json_structure(product_data)
    
    def _safe_extract_text(self, content: Dict[str, Any], keys: List[str]) -> str:
        """
        Safely extract text from content using multiple possible keys.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            keys (List[str]): List of possible keys to check
            
        Returns:
            str: Extracted text or empty string if not found
        """
        for key in keys:
            if key in content and content[key]:
                value = content[key]
                if isinstance(value, str):
                    return value.strip()
                elif isinstance(value, (list, dict)):
                    return str(value)
        return ""
    
    def _extract_and_format_price(self, content: Dict[str, Any]) -> str:
        """
        Extract and format price from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            str: Formatted price or empty string
        """
        price_keys = ["price", "current_price", "sale_price", "price_current", "price_range"]
        
        for key in price_keys:
            if key in content and content[key]:
                price_value = content[key]
                
                # Handle different price formats
                if isinstance(price_value, str):
                    # Clean price string and extract numeric value
                    clean_price = re.sub(r'[^\d.,]', '', price_value)
                    try:
                        # Convert to decimal for accurate representation
                        decimal_price = Decimal(clean_price.replace(',', ''))
                        return str(decimal_price)
                    except (InvalidOperation, ValueError):
                        return price_value.strip()
                elif isinstance(price_value, (int, float)):
                    return str(Decimal(str(price_value)))
                elif isinstance(price_value, dict):
                    # Handle price objects with multiple fields
                    if "value" in price_value:
                        return str(price_value["value"])
                    elif "amount" in price_value:
                        return str(price_value["amount"])
        
        return ""
    
    def _extract_rating(self, content: Dict[str, Any]) -> str:
        """
        Extract rating from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            str: Rating value or empty string
        """
        rating_keys = ["rating", "average_rating", "stars", "rating_average"]
        
        for key in rating_keys:
            if key in content and content[key] is not None:
                rating_value = content[key]
                
                if isinstance(rating_value, str):
                    # Extract numeric rating from string
                    rating_match = re.search(r'(\d+(?:\.\d+)?)', rating_value)
                    if rating_match:
                        return rating_match.group(1)
                    return rating_value.strip()
                elif isinstance(rating_value, (int, float)):
                    return str(rating_value)
                elif isinstance(rating_value, dict) and "value" in rating_value:
                    return str(rating_value["value"])
        
        return ""
    
    def _extract_reviews_count(self, content: Dict[str, Any]) -> str:
        """
        Extract reviews count from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            str: Reviews count or empty string
        """
        review_keys = ["reviews_count", "review_count", "total_reviews", "number_of_reviews"]
        
        for key in review_keys:
            if key in content and content[key] is not None:
                review_value = content[key]
                
                if isinstance(review_value, str):
                    # Extract numeric count from string
                    count_match = re.search(r'([\d,]+)', review_value)
                    if count_match:
                        return count_match.group(1).replace(',', '')
                    return review_value.strip()
                elif isinstance(review_value, (int, float)):
                    return str(int(review_value))
        
        return ""
    
    def _extract_bullet_points(self, content: Dict[str, Any]) -> List[str]:
        """
        Extract and format bullet points from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            List[str]: List of bullet points
        """
        bullet_keys = ["bullet_points", "features", "key_features", "highlights", "product_features"]
        
        for key in bullet_keys:
            if key in content and content[key]:
                bullet_value = content[key]
                
                if isinstance(bullet_value, list):
                    return [str(item).strip() for item in bullet_value if item]
                elif isinstance(bullet_value, str):
                    # Split by common delimiters and clean
                    points = re.split(r'[\n•▪▫◦‣⁃]', bullet_value)
                    return [point.strip() for point in points if point.strip()]
        
        return []
    
    def _extract_images(self, content: Dict[str, Any]) -> List[str]:
        """
        Extract images from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            List[str]: List of image URLs
        """
        image_keys = ["images", "image_urls", "product_images", "photos"]
        
        for key in image_keys:
            if key in content and content[key]:
                image_value = content[key]
                
                if isinstance(image_value, list):
                    return [str(img) for img in image_value if img]
                elif isinstance(image_value, str):
                    return [image_value]
        
        return []
    
    def _extract_specifications(self, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract specifications from content.
        
        Args:
            content (Dict[str, Any]): Content dictionary
            
        Returns:
            Dict[str, Any]: Specifications dictionary
        """
        spec_keys = ["specifications", "specs", "technical_details", "product_details", "attributes"]
        
        for key in spec_keys:
            if key in content and content[key]:
                spec_value = content[key]
                
                if isinstance(spec_value, dict):
                    return spec_value
                elif isinstance(spec_value, list):
                    # Convert list to dict if possible
                    spec_dict = {}
                    for item in spec_value:
                        if isinstance(item, dict):
                            spec_dict.update(item)
                        elif isinstance(item, str) and ':' in item:
                            key_val = item.split(':', 1)
                            if len(key_val) == 2:
                                spec_dict[key_val[0].strip()] = key_val[1].strip()
                    return spec_dict
        
        return {}
    
    def _create_clean_json_structure(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a clean JSON structure from extracted product data.
        
        Args:
            product_data (Dict[str, Any]): Extracted product data
            
        Returns:
            Dict[str, Any]: Clean JSON structure
        """
        # Format bullet points as a readable string
        bullet_points_text = ""
        if product_data["bullet_points"]:
            bullet_points_text = "\n".join([f"• {point}" for point in product_data["bullet_points"]])
        
        clean_structure = {
            "product": {
                "name": product_data["name"] or "Unknown",
                "brand": product_data["brand"] or "Unknown",
                "price": product_data["price"] or "0.00",
                "rating": product_data["rating"] or "0",
                "reviews_count": product_data["reviews_count"] or "0",
                "description": product_data["description"],
                "bullet_points": bullet_points_text,
                "features": product_data["bullet_points"],
                "images": product_data["images"],
                "specifications": product_data["specifications"],
                "availability": product_data["availability"],
                "url": product_data["url"],
                "scraped_at": product_data["scraped_at"]
            },
            "metadata": {
                "extraction_successful": product_data["error"] is None,
                "error_message": product_data["error"],
                "fields_extracted": sum(1 for key in ["name", "brand", "price", "rating", "reviews_count", "description"] 
                                      if product_data[key])
            }
        }
        
        return clean_structure
    
    def scrape_search_results(self, search_query: str, geo_location: str = DEFAULT_GEO_LOCATION, pages: int = 1) -> List[Dict]:
        """
        Scrape Amazon search results
        
        Args:
            search_query (str): Search query
            geo_location (str): Zip code for geo-targeting
            pages (int): Number of pages to scrape
            
        Returns:
            List[Dict]: List of product information
        """
        all_products = []
        
        for page in range(1, pages + 1):
            search_url = f"https://www.amazon.com/s?k={search_query}&page={page}"
            logger.info(f"Scraping search results page {page}: {search_url}")
            
            response = self._make_request(search_url, geo_location)
            
            # Handle error responses from API
            if "error" in response:
                logger.error(f"API error on page {page}: {response.get('message', 'Unknown error')}")
                continue
            
            if not response or "results" not in response:
                logger.error(f"No results received for page {page}")
                continue
            
            result = response["results"][0]
            
            if "content" not in result:
                logger.error(f"No content in API response for page {page}")
                continue
            
            content = result["content"]
            products = content.get("products", [])
            
            for product in products:
                product_data = {
                    "title": product.get("title", ""),
                    "price": product.get("price", ""),
                    "rating": product.get("rating", ""),
                    "reviews_count": product.get("reviews_count", ""),
                    "url": product.get("url", ""),
                    "image": product.get("image", ""),
                    "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                all_products.append(product_data)
            
            # Add delay between requests to be respectful
            time.sleep(1)
        
        return all_products
    
    def save_to_json(self, data: Dict | List[Dict], filename: str) -> None:
        """
        Save data to JSON file
        
        Args:
            data: Data to save
            filename (str): Output filename
        """
        try:
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {filename}")
        except Exception as e:
            logger.error(f"Error saving data: {e}")


def build_amazon_url(asin: str, country: str = "US") -> str:
    """
    Build Amazon product URL from ASIN
    
    Args:
        asin (str): Amazon ASIN (product identifier)
        country (str): Country code for Amazon domain
    
    Returns:
        str: Complete Amazon product URL
    """
    domain_map = {
        "US": "amazon.com",
        "UK": "amazon.co.uk",
        "DE": "amazon.de",
        "FR": "amazon.fr",
        "IT": "amazon.it",
        "ES": "amazon.es",
        "CA": "amazon.ca",
        "JP": "amazon.co.jp",
        "AU": "amazon.com.au",
        "IN": "amazon.in"
    }
    
    domain = domain_map.get(country.upper(), "amazon.com")
    return f"https://www.{domain}/dp/{asin}"

def parse_arguments():
    """
    Parse command line arguments
    
    Returns:
        argparse.Namespace: Parsed command line arguments
    """
    parser = argparse.ArgumentParser(
        description="Amazon Product Scraper using Oxylabs Proxy Service",
        epilog="""
        Examples:
          %(prog)s B08N5WRWNW --output product.json
          %(prog)s --url https://www.amazon.com/dp/B08N5WRWNW
          %(prog)s --search "wireless headphones" --pages 2
          %(prog)s B08N5WRWNW --country UK --format pretty
        """,
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # Main input group - either ASIN, URL, or search
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "asin",
        nargs="?",
        help="Amazon ASIN (product identifier) - e.g., B08N5WRWNW"
    )
    input_group.add_argument(
        "--url",
        help="Full Amazon product URL"
    )
    input_group.add_argument(
        "--search",
        help="Search query for Amazon products"
    )
    
    # Optional parameters
    parser.add_argument(
        "--output", "-o",
        help="Output filename to save results (JSON format)"
    )
    parser.add_argument(
        "--country", "-c",
        default="US",
        choices=["US", "UK", "DE", "FR", "IT", "ES", "CA", "JP", "AU", "IN"],
        help="Country code for geo-targeting (default: US)"
    )
    parser.add_argument(
        "--format", "-f",
        choices=["json", "pretty"],
        default="json",
        help="Output format (default: json)"
    )
    parser.add_argument(
        "--pages", "-p",
        type=int,
        default=1,
        help="Number of pages to scrape for search results (default: 1)"
    )
    parser.add_argument(
        "--username", "-u",
        help="Oxylabs username (can also use OXYLABS_USERNAME env variable)"
    )
    parser.add_argument(
        "--password", "-w",
        help="Oxylabs password (can also use OXYLABS_PASSWORD env variable)"
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=DEFAULT_TIMEOUT,
        help=f"Request timeout in seconds (default: {DEFAULT_TIMEOUT})"
    )
    
    return parser.parse_args()

def get_credentials(args):
    """
    Get Oxylabs credentials from arguments or environment variables
    
    Args:
        args: Parsed command line arguments
    
    Returns:
        tuple: (username, password)
    
    Raises:
        SystemExit: If credentials are not provided
    """
    username = args.username or os.getenv("OXYLABS_USERNAME")
    password = args.password or os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        logger.error("Oxylabs credentials not provided!")
        logger.error("Please provide credentials via:")
        logger.error("  - Command line: --username USER --password PASS")
        logger.error("  - Environment variables: OXYLABS_USERNAME and OXYLABS_PASSWORD")
        sys.exit(1)
    
    return username, password

def format_output(data, format_type="json"):
    """
    Format output data according to specified format
    
    Args:
        data: Data to format
        format_type (str): Output format type
    
    Returns:
        str: Formatted output
    """
    if format_type == "pretty":
        if isinstance(data, dict) and "product" in data:
            product = data["product"]
            output = []
            output.append(f"Product: {product.get('name', 'N/A')}")
            output.append(f"Brand: {product.get('brand', 'N/A')}")
            output.append(f"Price: {product.get('price', 'N/A')}")
            output.append(f"Rating: {product.get('rating', 'N/A')}")
            output.append(f"Reviews: {product.get('reviews_count', 'N/A')}")
            output.append(f"URL: {product.get('url', 'N/A')}")
            output.append(f"Availability: {product.get('availability', 'N/A')}")
            
            if product.get('description'):
                output.append(f"Description: {product['description'][:200]}...")
            
            if product.get('bullet_points'):
                output.append("\nKey Features:")
                output.append(product['bullet_points'])
            
            output.append(f"\nExtraction successful: {data['metadata']['extraction_successful']}")
            if data['metadata']['error_message']:
                output.append(f"Error: {data['metadata']['error_message']}")
            
            return "\n".join(output)
        elif isinstance(data, list):
            output = []
            for i, item in enumerate(data, 1):
                output.append(f"{i}. {item.get('title', 'N/A')} - {item.get('price', 'N/A')}")
            return "\n".join(output)
    
    return json.dumps(data, indent=2, ensure_ascii=False)

def main():
    """
    Main function with command line interface
    """
    args = parse_arguments()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Get credentials
    username, password = get_credentials(args)
    
    # Initialize scraper
    scraper = OxylabsAmazonScraper(username, password)
    
    # Update timeout if specified
    if args.timeout != DEFAULT_TIMEOUT:
        # Update the timeout for this session
        scraper.timeout = args.timeout
    
    try:
        if args.asin:
            # Scrape single product by ASIN
            logger.info(f"Scraping product with ASIN: {args.asin}")
            product_url = build_amazon_url(args.asin, args.country)
            product_data = scraper.scrape_product(product_url, "10001")
            
            if product_data and "product" in product_data:
                # Save to file if specified
                if args.output:
                    scraper.save_to_json(product_data, args.output)
                    logger.info(f"Product data saved to {args.output}")
                
                # Print formatted output
                print(format_output(product_data, args.format))
            else:
                logger.error("Failed to scrape product data")
                sys.exit(1)
        
        elif args.url:
            # Scrape single product by URL
            logger.info(f"Scraping product from URL: {args.url}")
            product_data = scraper.scrape_product(args.url, "10001")
            
            if product_data and "product" in product_data:
                # Save to file if specified
                if args.output:
                    scraper.save_to_json(product_data, args.output)
                    logger.info(f"Product data saved to {args.output}")
                
                # Print formatted output
                print(format_output(product_data, args.format))
            else:
                logger.error("Failed to scrape product data")
                sys.exit(1)
        
        elif args.search:
            # Scrape search results
            logger.info(f"Searching for: {args.search} (pages: {args.pages})")
            search_results = scraper.scrape_search_results(args.search, "10001", args.pages)
            
            if search_results:
                # Save to file if specified
                if args.output:
                    scraper.save_to_json(search_results, args.output)
                    logger.info(f"Search results saved to {args.output}")
                
                # Print formatted output
                print(format_output(search_results, args.format))
                print(f"\nFound {len(search_results)} products for '{args.search}'")
            else:
                logger.error("No search results found")
                sys.exit(1)
    
    except KeyboardInterrupt:
        logger.info("\nOperation cancelled by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


def demo_data_extraction():
    """
    Demonstrate the data extraction function with a mock Oxylabs response
    """
    # Mock Oxylabs API response structure
    mock_response = {
        "results": [
            {
                "content": {
                    "title": "Apple AirPods Pro (2nd Generation)",
                    "brand": "Apple",
                    "price": "$199.99",
                    "rating": "4.5 out of 5 stars",
                    "reviews_count": "25,847 ratings",
                    "description": "Experience next-level sound with personalized Spatial Audio.",
                    "bullet_points": [
                        "Personalized Spatial Audio with dynamic head tracking",
                        "Active Noise Cancellation blocks outside noise",
                        "Up to 6 hours of listening time with ANC enabled",
                        "Sweat and water resistant (IPX4)"
                    ],
                    "images": [
                        "https://example.com/image1.jpg",
                        "https://example.com/image2.jpg"
                    ],
                    "specifications": {
                        "Connectivity": "Bluetooth 5.3",
                        "Battery Life": "Up to 6 hours",
                        "Water Resistance": "IPX4"
                    },
                    "availability": "In Stock",
                    "url": "https://www.amazon.com/dp/B0BDHWDR12"
                }
            }
        ]
    }
    
    scraper = OxylabsAmazonScraper("", "")
    extracted_data = scraper.extract_and_format_product_data(mock_response)
    
    print("\n=== Data Extraction Demo ===")
    print(json.dumps(extracted_data, indent=2))
    
    return extracted_data


if __name__ == "__main__":
    main()

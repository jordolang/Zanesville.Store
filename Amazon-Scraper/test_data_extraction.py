#!/usr/bin/env python3
"""
Test the data extraction and formatting functionality
"""

import json
import time
import re
from decimal import Decimal, InvalidOperation
from typing import Dict, List, Any


class DataExtractor:
    """
    Simplified version of the data extraction functionality for testing
    """
    
    def extract_and_format_product_data(self, oxylabs_response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse complex Oxylabs API response and extract product fields with graceful handling.
        
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
            # Handle error responses
            if "error" in oxylabs_response:
                product_data["error"] = oxylabs_response["error"]
                return product_data
            
            # Check if results exist
            if "results" not in oxylabs_response or not oxylabs_response["results"]:
                product_data["error"] = "No results found in API response"
                return product_data
            
            result = oxylabs_response["results"][0]
            
            # Check if content exists
            if "content" not in result:
                product_data["error"] = "No content found in API response"
                return product_data
            
            content = result["content"]
            
            # Extract product name/title
            product_data["name"] = self._safe_extract_text(content, ["title", "name", "product_title"])
            
            # Extract brand
            product_data["brand"] = self._safe_extract_text(content, ["brand", "manufacturer", "brand_name"])
            
            # Extract and format price
            product_data["price"] = self._extract_and_format_price(content)
            
            # Extract rating
            product_data["rating"] = self._extract_rating(content)
            
            # Extract reviews count
            product_data["reviews_count"] = self._extract_reviews_count(content)
            
            # Extract and format description
            product_data["description"] = self._safe_extract_text(content, ["description", "product_description", "about"])
            
            # Extract and format bullet points
            product_data["bullet_points"] = self._extract_bullet_points(content)
            
            # Extract images
            product_data["images"] = self._extract_images(content)
            
            # Extract specifications
            product_data["specifications"] = self._extract_specifications(content)
            
            # Extract availability
            product_data["availability"] = self._safe_extract_text(content, ["availability", "stock_status", "in_stock"])
            
            # Extract URL
            product_data["url"] = self._safe_extract_text(content, ["url", "product_url", "link"])
            
        except Exception as e:
            print(f"Error extracting product data: {str(e)}")
            product_data["error"] = f"Extraction error: {str(e)}"
        
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
    
    extractor = DataExtractor()
    extracted_data = extractor.extract_and_format_product_data(mock_response)
    
    print("\n=== Data Extraction Demo ===")
    print(json.dumps(extracted_data, indent=2))
    
    return extracted_data


def test_missing_fields():
    """
    Test handling of missing fields in the response
    """
    # Mock response with missing fields
    incomplete_response = {
        "results": [
            {
                "content": {
                    "title": "Incomplete Product",
                    "price": "$29.99"
                    # Missing brand, rating, reviews_count, etc.
                }
            }
        ]
    }
    
    extractor = DataExtractor()
    extracted_data = extractor.extract_and_format_product_data(incomplete_response)
    
    print("\n=== Missing Fields Test ===")
    print(json.dumps(extracted_data, indent=2))
    
    return extracted_data


def test_error_handling():
    """
    Test error handling for malformed responses
    """
    # Test with error response
    error_response = {
        "error": "timeout",
        "message": "Request timed out"
    }
    
    extractor = DataExtractor()
    extracted_data = extractor.extract_and_format_product_data(error_response)
    
    print("\n=== Error Handling Test ===")
    print(json.dumps(extracted_data, indent=2))
    
    return extracted_data


if __name__ == "__main__":
    print("Testing Data Extraction and Formatting Functions")
    print("=" * 50)
    
    # Run all tests
    demo_data_extraction()
    test_missing_fields()
    test_error_handling()
    
    print("\n" + "=" * 50)
    print("All tests completed!")

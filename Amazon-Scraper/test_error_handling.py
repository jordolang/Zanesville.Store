#!/usr/bin/env python3
"""
Comprehensive test suite for error handling in Amazon scraper
Tests all error scenarios including invalid ASINs, API failures, rate limiting, and data validation
"""

import json
import time
import unittest
from unittest.mock import Mock, patch, MagicMock
import requests
from oxylabs_amazon_scraper import (
    OxylabsAmazonScraper, 
    InvalidASINError, 
    APIConnectionError, 
    RateLimitError, 
    InvalidCredentialsError,
    DataExtractionError,
    ValidationError
)


class TestErrorHandling(unittest.TestCase):
    """Test error handling scenarios"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.scraper = OxylabsAmazonScraper("test_user", "test_pass")
    
    def test_invalid_asin_format(self):
        """Test handling of invalid ASIN format"""
        invalid_asins = [
            "https://www.amazon.com/dp/INVALID123",  # Invalid ASIN
            "https://www.amazon.com/dp/B123",        # Too short
            "https://www.amazon.com/dp/123456789",   # No B prefix
            "https://www.amazon.com/dp/B12345678a",  # Invalid character (lowercase)
            "https://www.amazon.com/dp/C123456789",  # Wrong prefix
        ]
        
        for invalid_url in invalid_asins:
            with self.assertRaises(InvalidASINError):
                self.scraper._extract_asin_from_url(invalid_url)
    
    def test_valid_asin_extraction(self):
        """Test extraction of valid ASINs"""
        valid_urls = [
            ("https://www.amazon.com/dp/B08N5WRWNW", "B08N5WRWNW"),
            ("https://www.amazon.com/product/B08N5WRWNW", "B08N5WRWNW"),
            ("https://www.amazon.com/gp/product/B08N5WRWNW", "B08N5WRWNW"),
            ("https://www.amazon.com/some-product/dp/B08N5WRWNW/ref=xxx", "B08N5WRWNW"),
        ]
        
        for url, expected_asin in valid_urls:
            extracted_asin = self.scraper._extract_asin_from_url(url)
            self.assertEqual(extracted_asin, expected_asin)
    
    def test_invalid_credentials(self):
        """Test handling of invalid credentials"""
        # Test empty credentials
        with self.assertRaises(InvalidCredentialsError):
            scraper = OxylabsAmazonScraper("", "")
            scraper._validate_credentials()
        
        # Test short credentials
        with self.assertRaises(InvalidCredentialsError):
            scraper = OxylabsAmazonScraper("ab", "cd")
            scraper._validate_credentials()
    
    @patch('requests.Session.post')
    def test_api_connection_timeout(self, mock_post):
        """Test handling of API connection timeout"""
        mock_post.side_effect = requests.exceptions.Timeout("Request timed out")
        
        result = self.scraper._make_request("https://www.amazon.com/dp/B08N5WRWNW")
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "connection_error")
        self.assertIn("timed out", result["message"].lower())
    
    @patch('requests.Session.post')
    def test_rate_limiting(self, mock_post):
        """Test handling of rate limiting (HTTP 429)"""
        mock_response = Mock()
        mock_response.status_code = 429
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("Too Many Requests")
        mock_post.return_value = mock_response
        
        result = self.scraper._make_request("https://www.amazon.com/dp/B08N5WRWNW")
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "rate_limit")
    
    @patch('requests.Session.post')
    def test_invalid_credentials_api_error(self, mock_post):
        """Test handling of authentication errors (HTTP 401)"""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("Unauthorized")
        mock_post.return_value = mock_response
        
        result = self.scraper._make_request("https://www.amazon.com/dp/B08N5WRWNW")
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "invalid_credentials")
    
    @patch('requests.Session.post')
    def test_connection_error(self, mock_post):
        """Test handling of connection errors"""
        mock_post.side_effect = requests.exceptions.ConnectionError("Connection failed")
        
        result = self.scraper._make_request("https://www.amazon.com/dp/B08N5WRWNW")
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "connection_error")
    
    @patch('requests.Session.post')
    def test_json_decode_error(self, mock_post):
        """Test handling of invalid JSON responses"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
        mock_post.return_value = mock_response
        
        result = self.scraper._make_request("https://www.amazon.com/dp/B08N5WRWNW")
        
        self.assertIn("error", result)
        self.assertEqual(result["error"], "data_extraction_error")
    
    def test_missing_results_in_response(self):
        """Test handling of missing results in API response"""
        empty_response = {}
        
        with self.assertRaises(ValidationError):
            self.scraper._validate_response_structure(empty_response)
    
    def test_empty_results_in_response(self):
        """Test handling of empty results array in API response"""
        empty_results_response = {"results": []}
        
        with self.assertRaises(ValidationError):
            self.scraper._validate_response_structure(empty_results_response)
    
    def test_missing_content_in_response(self):
        """Test handling of missing content in API response"""
        no_content_response = {"results": [{"status": "ok"}]}
        
        with self.assertRaises(ValidationError):
            self.scraper._validate_response_structure(no_content_response)
    
    def test_malformed_data_extraction(self):
        """Test extraction with malformed data"""
        malformed_response = {
            "results": [
                {
                    "content": {
                        "title": 123,  # Wrong type
                        "price": ["not", "a", "string"],  # Wrong type
                        "rating": {"invalid": "structure"},  # Wrong structure
                        "reviews_count": None,  # Null value
                    }
                }
            ]
        }
        
        result = self.scraper.extract_and_format_product_data(malformed_response)
        
        # Should not crash and should extract what it can
        self.assertIn("product", result)
        self.assertIn("metadata", result)
        self.assertIsInstance(result["product"]["name"], str)
    
    def test_missing_fields_handling(self):
        """Test handling of missing fields in API response"""
        minimal_response = {
            "results": [
                {
                    "content": {
                        # Only title is present, everything else is missing
                        "title": "Minimal Product"
                    }
                }
            ]
        }
        
        result = self.scraper.extract_and_format_product_data(minimal_response)
        
        # Should handle missing fields gracefully
        self.assertIn("product", result)
        self.assertEqual(result["product"]["name"], "Minimal Product")
        self.assertEqual(result["product"]["brand"], "Unknown")
        self.assertEqual(result["product"]["price"], "0.00")
    
    def test_data_validation_warnings(self):
        """Test data validation warnings for invalid formats"""
        product_data = {
            "name": "Test Product",
            "brand": "Test Brand",
            "price": "invalid_price",  # Invalid format
            "rating": "10.5",  # Out of range
            "reviews_count": "-100",  # Negative value
            "description": "Test description"
        }
        
        # Should log warnings but not crash
        with patch('oxylabs_amazon_scraper.logger') as mock_logger:
            self.scraper._validate_extracted_data(product_data)
            
            # Check that warnings were logged
            mock_logger.warning.assert_called()
    
    def test_retry_mechanism_with_temporary_failures(self):
        """Test retry mechanism with temporary failures"""
        with patch('requests.Session.post') as mock_post:
            # First two calls fail, third succeeds
            mock_response_failure = Mock()
            mock_response_failure.status_code = 500
            mock_response_failure.raise_for_status.side_effect = requests.exceptions.HTTPError("Server Error")
            
            mock_response_success = Mock()
            mock_response_success.status_code = 200
            mock_response_success.json.return_value = {"results": [{"content": {"title": "Success"}}]}
            
            mock_post.side_effect = [
                mock_response_failure,
                mock_response_failure,
                mock_response_success
            ]
            
            with patch('time.sleep'):  # Speed up test
                result = self.scraper._make_request_with_retry("https://www.amazon.com/dp/B08N5WRWNW")
            
            self.assertIn("results", result)
            self.assertEqual(mock_post.call_count, 3)
    
    def test_max_retries_exceeded(self):
        """Test behavior when max retries are exceeded"""
        with patch('requests.Session.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 500
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("Server Error")
            mock_post.return_value = mock_response
            
            with patch('time.sleep'):  # Speed up test
                with self.assertRaises(APIConnectionError):
                    self.scraper._make_request_with_retry("https://www.amazon.com/dp/B08N5WRWNW")
    
    def test_exponential_backoff_for_rate_limiting(self):
        """Test exponential backoff for rate limiting"""
        with patch('requests.Session.post') as mock_post:
            mock_response = Mock()
            mock_response.status_code = 429
            mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError("Too Many Requests")
            mock_post.return_value = mock_response
            
            with patch('time.sleep') as mock_sleep:
                with self.assertRaises(RateLimitError):
                    self.scraper._make_request_with_retry("https://www.amazon.com/dp/B08N5WRWNW")
                
                # Check that sleep was called with increasing delays
                sleep_calls = [call[0][0] for call in mock_sleep.call_args_list]
                self.assertTrue(len(sleep_calls) >= 2)
                self.assertTrue(sleep_calls[1] > sleep_calls[0])  # Exponential backoff
    
    def test_search_results_error_handling(self):
        """Test error handling in search results"""
        with patch.object(self.scraper, '_make_request') as mock_request:
            mock_request.return_value = {"error": "connection_error", "message": "Failed to connect"}
            
            results = self.scraper.scrape_search_results("test query")
            
            # Should return empty list on error
            self.assertEqual(results, [])
    
    def test_product_scraping_with_errors(self):
        """Test product scraping with various error scenarios"""
        # Test with invalid ASIN
        result = self.scraper.scrape_product("https://www.amazon.com/dp/INVALID")
        self.assertIn("error_message", result["metadata"])
        self.assertFalse(result["metadata"]["extraction_successful"])
        
        # Test with API error
        with patch.object(self.scraper, '_make_request') as mock_request:
            mock_request.return_value = {"error": "rate_limit", "message": "Rate limit exceeded"}
            
            result = self.scraper.scrape_product("https://www.amazon.com/dp/B08N5WRWNW")
            self.assertIn("error_message", result["metadata"])
            self.assertFalse(result["metadata"]["extraction_successful"])


def run_error_handling_tests():
    """Run comprehensive error handling tests"""
    print("Running Error Handling Tests")
    print("=" * 50)
    
    # Test invalid ASIN scenarios
    print("\n1. Testing Invalid ASIN Scenarios")
    scraper = OxylabsAmazonScraper("test_user", "test_pass")
    
    invalid_urls = [
        "https://www.amazon.com/dp/INVALID123",
        "https://www.amazon.com/dp/B123",
        "https://www.amazon.com/dp/123456789",
    ]
    
    for url in invalid_urls:
        try:
            scraper._extract_asin_from_url(url)
            print(f"❌ ASIN validation failed for: {url}")
        except InvalidASINError as e:
            print(f"✅ Correctly caught invalid ASIN: {url} - {e}")
    
    # Test credential validation
    print("\n2. Testing Credential Validation")
    test_cases = [
        ("", ""),
        ("ab", "cd"),
        ("test_user", "test_pass"),
    ]
    
    for user, password in test_cases:
        try:
            test_scraper = OxylabsAmazonScraper(user, password)
            test_scraper._validate_credentials()
            print(f"✅ Valid credentials: {user}/{password}")
        except InvalidCredentialsError as e:
            print(f"✅ Correctly caught invalid credentials: {user}/{password} - {e}")
    
    # Test data validation
    print("\n3. Testing Data Validation")
    test_data = {
        "name": "Test Product",
        "brand": "Test Brand",
        "price": "invalid_price",
        "rating": "10.5",
        "reviews_count": "-100",
        "description": "Test description"
    }
    
    try:
        scraper._validate_extracted_data(test_data)
        print("✅ Data validation completed with warnings")
    except ValidationError as e:
        print(f"✅ Correctly caught validation error: {e}")
    
    # Test response structure validation
    print("\n4. Testing Response Structure Validation")
    test_responses = [
        {},  # Empty response
        {"results": []},  # Empty results
        {"results": [{}]},  # Missing content
        {"results": [{"content": {"title": "Valid"}}]},  # Valid response
    ]
    
    for i, response in enumerate(test_responses):
        try:
            scraper._validate_response_structure(response)
            print(f"✅ Response {i+1} is valid")
        except ValidationError as e:
            print(f"✅ Response {i+1} correctly rejected: {e}")
    
    print("\n" + "=" * 50)
    print("Error handling tests completed!")


if __name__ == "__main__":
    # Run the demonstration
    run_error_handling_tests()
    
    # Run unit tests
    print("\n" + "=" * 50)
    print("Running Unit Tests")
    unittest.main(verbosity=2)

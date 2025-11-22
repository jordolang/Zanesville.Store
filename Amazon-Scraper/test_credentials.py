#!/usr/bin/env python3
"""
Simple test script to verify Oxylabs credentials work
"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_credentials():
    """Test Oxylabs credentials with a simple request"""
    print("🔐 Testing Oxylabs Credentials")
    print("=" * 40)
    
    # Get credentials
    username = os.getenv("OXYLABS_USERNAME")
    password = os.getenv("OXYLABS_PASSWORD")
    
    if not username or not password:
        print("❌ Error: Missing credentials")
        return False
    
    print(f"👤 Username: {username}")
    print(f"🔑 Password: {'*' * len(password)}")
    
    # Make a simple test request
    url = "https://realtime.oxylabs.io/v1/queries"
    
    payload = {
        "source": "amazon",
        "url": "https://www.amazon.com/dp/B07FZ8S74R",
        "geo_location": "10001",  # Use zip code instead of country
        "parse": True
    }
    
    headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'Oxylabs-Amazon-Scraper/1.0'
    }
    
    try:
        print("🌐 Making test request to Oxylabs API...")
        response = requests.post(
            url,
            json=payload,
            auth=(username, password),
            headers=headers,
            timeout=30
        )
        
        print(f"📊 Response Status: {response.status_code}")
        print(f"📝 Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Credentials work! API returned 200 OK")
            result = response.json()
            print(f"📦 Results count: {len(result.get('results', []))}")
            return True
        else:
            print(f"❌ API returned error: {response.status_code}")
            print(f"Response text: {response.text}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return False

if __name__ == "__main__":
    success = test_credentials()
    if success:
        print("\n🎉 Credentials test passed!")
    else:
        print("\n⚠️  Credentials test failed!")

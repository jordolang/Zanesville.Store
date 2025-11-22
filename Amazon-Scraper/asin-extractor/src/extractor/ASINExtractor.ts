import axios, { AxiosInstance } from 'axios';
import * as cheerio from 'cheerio';
import { AnyNode } from 'domhandler';
import { Config } from '../config/Config.js';
import { CSVItem } from '../csv/CSVProcessor.js';
import chalk from 'chalk';
import ora from 'ora';

export interface SearchResult {
  asin: string;
  title: string;
  imageUrl: string;
  price: string;
  rating: string;
  url: string;
  confidence: 'high' | 'medium' | 'low';
}

export class ASINExtractor {
  private client: AxiosInstance;
  
  constructor(private config: Config) {
    this.client = axios.create({
      timeout: this.config.timeout,
      headers: {
        'User-Agent': this.config.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Cache-Control': 'max-age=0',
      }
    });
  }

  async processItems(items: CSVItem[]): Promise<CSVItem[]> {
    const enrichedItems: CSVItem[] = [];
    const spinner = ora();
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const productName = this.getCleanProductName(item['Product Name']);
      
      spinner.start(`Processing ${i + 1}/${items.length}: ${productName.substring(0, 50)}...`);
      
      try {
        // Skip if product name is too generic or empty
        if (this.isGenericProduct(productName)) {
          spinner.warn(chalk.yellow(`Skipping generic product: ${productName}`));
          enrichedItems.push({
            ...item,
            asin: '',
            image_url: '',
            match_confidence: 'low',
            extraction_date: new Date().toISOString()
          });
          continue;
        }

        const searchResult = await this.searchAmazonProduct(productName);
        
        if (searchResult) {
          spinner.succeed(chalk.green(`Found ASIN: ${searchResult.asin}`));
          enrichedItems.push({
            ...item,
            asin: searchResult.asin,
            image_url: searchResult.imageUrl,
            match_confidence: searchResult.confidence,
            extraction_date: new Date().toISOString()
          });
        } else {
          spinner.warn(chalk.yellow(`No results found for: ${productName}`));
          enrichedItems.push({
            ...item,
            asin: '',
            image_url: '',
            match_confidence: 'low',
            extraction_date: new Date().toISOString()
          });
        }
        
        // Delay between requests to avoid rate limiting
        if (i < items.length - 1) {
          this.config.log(`Waiting ${this.config.delay}ms before next request...`);
          await this.delay(this.config.delay);
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        spinner.fail(chalk.red(`Error processing "${productName}": ${errorMessage}`));
        enrichedItems.push({
          ...item,
          asin: '',
          image_url: '',
          match_confidence: 'low',
          extraction_date: new Date().toISOString()
        });
        
        // Continue with other items even if one fails
      }
    }
    
    return enrichedItems;
  }

  private async searchAmazonProduct(productName: string): Promise<SearchResult | null> {
    const maxRetries = this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.config.log(`Search attempt ${attempt}/${maxRetries} for: ${productName}`);
        
        const searchUrl = this.buildSearchUrl(productName);
        this.config.log(`Search URL: ${searchUrl}`);
        
        const response = await this.client.get(searchUrl);
        
        if (response.status !== 200) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const searchResult = this.parseSearchResults(response.data, productName);
        
        if (searchResult) {
          this.config.log(`Successfully found ASIN: ${searchResult.asin}`);
          return searchResult;
        } else {
          this.config.log(`No valid results found in search page`, 'warn');
        }
        
        // If no results found but request was successful, don't retry
        return null;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.config.log(`Attempt ${attempt} failed: ${errorMessage}`, 'warn');
        
        if (attempt < maxRetries) {
          const delayMs = this.config.delay * attempt; // Exponential backoff
          this.config.log(`Retrying in ${delayMs}ms...`);
          await this.delay(delayMs);
        }
      }
    }
    
    this.config.log(`All ${maxRetries} attempts failed for: ${productName}`, 'error');
    if (lastError) {
      this.config.log(`Last error: ${lastError.message}`, 'error');
    }
    
    return null;
  }

  private buildSearchUrl(productName: string): string {
    const encodedQuery = encodeURIComponent(productName);
    return `https://www.amazon.com/s?k=${encodedQuery}&ref=sr_pg_1`;
  }

  private parseSearchResults(html: string, originalQuery: string): SearchResult | null {
    const $ = cheerio.load(html);
    
    // Try multiple selectors for search results
    const resultSelectors = [
      '[data-component-type="s-search-result"]',
      '.s-result-item',
      '[data-asin]'
    ];
    
    let results: cheerio.Cheerio<AnyNode> | null = null;
    
    for (const selector of resultSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        results = elements;
        break;
      }
    }
    
    if (!results || results.length === 0) {
      this.config.log('No search results found in page', 'warn');
      return null;
    }
    
    this.config.log(`Found ${results.length} search results`);
    
    // Process each result
    for (let i = 0; i < Math.min(results.length, 10); i++) { // Check first 10 results
      const element = results.eq(i);
      const result = this.extractProductInfo(element, $, originalQuery);
      
      if (result && this.isValidResult(result, originalQuery)) {
        return result;
      }
    }
    
    return null;
  }

  private extractProductInfo(element: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI, originalQuery: string): SearchResult | null {
    try {
      // Extract ASIN
      const asin = element.attr('data-asin') || '';
      if (!asin || !this.isValidASIN(asin)) {
        return null;
      }
      
      // Extract title
      const titleSelectors = [
        'h2 a span',
        '.a-size-medium.a-color-base',
        '[data-cy="title-recipe-title"]',
        'h2 span'
      ];
      
      let title = '';
      for (const selector of titleSelectors) {
        const titleElement = element.find(selector).first();
        if (titleElement.length > 0) {
          title = titleElement.text().trim();
          break;
        }
      }
      
      if (!title) {
        this.config.log(`No title found for ASIN: ${asin}`, 'warn');
        return null;
      }
      
      // Extract image URL
      const imageSelectors = [
        'img.s-image',
        '.a-dynamic-image',
        'img[data-image-latency]'
      ];
      
      let imageUrl = '';
      for (const selector of imageSelectors) {
        const imgElement = element.find(selector).first();
        if (imgElement.length > 0) {
          imageUrl = imgElement.attr('src') || imgElement.attr('data-src') || '';
          if (imageUrl) break;
        }
      }
      
      // Extract price
      const priceSelectors = [
        '.a-price-whole',
        '.a-price .a-offscreen',
        '.a-price-range .a-offscreen'
      ];
      
      let price = '';
      for (const selector of priceSelectors) {
        const priceElement = element.find(selector).first();
        if (priceElement.length > 0) {
          price = priceElement.text().trim();
          break;
        }
      }
      
      // Extract rating
      const ratingSelectors = [
        '.a-icon-alt',
        '[aria-label*="out of 5 stars"]'
      ];
      
      let rating = '';
      for (const selector of ratingSelectors) {
        const ratingElement = element.find(selector).first();
        if (ratingElement.length > 0) {
          const ratingText = ratingElement.attr('aria-label') || ratingElement.text();
          const ratingMatch = ratingText.match(/(\d+(?:\.\d+)?)\s*out\s*of\s*5/i);
          if (ratingMatch) {
            rating = ratingMatch[1];
            break;
          }
        }
      }
      
      // Build URL
      const url = `https://www.amazon.com/dp/${asin}`;
      
      // Determine confidence based on title similarity
      const confidence = this.calculateConfidence(title, originalQuery);
      
      return {
        asin,
        title,
        imageUrl,
        price,
        rating,
        url,
        confidence
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.log(`Error extracting product info: ${errorMessage}`, 'warn');
      return null;
    }
  }

  private isValidASIN(asin: string): boolean {
    // Amazon ASINs are 10 characters, usually starting with B
    const asinRegex = /^[A-Z0-9]{10}$/;
    return asinRegex.test(asin);
  }

  private isValidResult(result: SearchResult, originalQuery: string): boolean {
    // Must have ASIN and title
    if (!result.asin || !result.title) {
      return false;
    }
    
    // Title should not be too short
    if (result.title.length < 10) {
      return false;
    }
    
    // Should have some similarity to original query
    const similarity = this.calculateSimilarity(result.title.toLowerCase(), originalQuery.toLowerCase());
    return similarity > 0.1; // At least 10% similarity
  }

  private calculateConfidence(title: string, originalQuery: string): 'high' | 'medium' | 'low' {
    const similarity = this.calculateSimilarity(title.toLowerCase(), originalQuery.toLowerCase());
    
    if (similarity > 0.6) return 'high';
    if (similarity > 0.3) return 'medium';
    return 'low';
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple word overlap similarity
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private getCleanProductName(productName: string): string {
    return productName
      .replace(/[""]/g, '"') // Normalize quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^(item\s*#?\d+:?\s*)/i, '') // Remove item numbers
      .replace(/\s*-?\s*msrp\s*\$?[\d.,]+/i, '') // Remove MSRP
      .replace(/\s*-?\s*sub\s*total\s*$/i, '') // Remove "Sub Total"
      .replace(/\s*-?\s*mystery\s*(item|clothing\s*item|pallet)?\s*$/i, '') // Remove "Mystery Item"
      .trim();
  }

  private isGenericProduct(productName: string): boolean {
    const genericTerms = [
      'mystery item',
      'mystery pallet',
      'mystery clothing item',
      'unknown',
      'sub total',
      'pallet',
      'multiple mystery items'
    ];
    
    const lowerName = productName.toLowerCase();
    return genericTerms.some(term => lowerName.includes(term)) || productName.length < 5;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
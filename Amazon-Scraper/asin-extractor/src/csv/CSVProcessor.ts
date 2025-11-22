import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import fs from 'fs-extra';
import { Config } from '../config/Config.js';

export interface CSVItem {
  [key: string]: string | undefined;
  'Product Name': string;
  Description?: string;
  Category?: string;
  asin?: string;
  image_url?: string;
  match_confidence?: string;
  extraction_date?: string;
}

export class CSVProcessor {
  constructor(private config: Config) {}

  async loadCSV(filePath: string): Promise<CSVItem[]> {
    this.config.log(`Loading CSV from: ${filePath}`);
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      
      return new Promise((resolve, reject) => {
        const items: CSVItem[] = [];
        
        parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          bom: true, // Handle BOM in CSV files
        })
        .on('data', (row) => {
          // Ensure Product Name exists and is not empty
          if (row['Product Name'] && row['Product Name'].trim()) {
            items.push(row);
          } else {
            this.config.log(`Skipping row with missing Product Name: ${JSON.stringify(row)}`, 'warn');
          }
        })
        .on('error', (error) => {
          this.config.log(`CSV parsing error: ${error.message}`, 'error');
          reject(error);
        })
        .on('end', () => {
          this.config.log(`Successfully loaded ${items.length} items from CSV`);
          resolve(items);
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.log(`Failed to read CSV file: ${errorMessage}`, 'error');
      throw error;
    }
  }

  async saveCSV(items: CSVItem[], filePath: string): Promise<void> {
    this.config.log(`Saving ${items.length} items to: ${filePath}`);
    
    try {
      return new Promise((resolve, reject) => {
        stringify(items, {
          header: true,
          quoted: true,
        }, (error, output) => {
          if (error) {
            this.config.log(`CSV stringifying error: ${error.message}`, 'error');
            reject(error);
          } else {
            fs.writeFile(filePath, output, 'utf-8')
              .then(() => {
                this.config.log(`Successfully saved CSV to: ${filePath}`);
                resolve();
              })
              .catch((writeError) => {
                this.config.log(`Failed to write CSV file: ${writeError.message}`, 'error');
                reject(writeError);
              });
          }
        });
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.config.log(`Failed to save CSV file: ${errorMessage}`, 'error');
      throw error;
    }
  }

  /**
   * Prepare items for processing by ensuring required fields exist
   */
  prepareItems(items: CSVItem[]): CSVItem[] {
    return items.map(item => ({
      ...item,
      asin: item.asin || '',
      image_url: item.image_url || '',
      match_confidence: item.match_confidence || '',
      extraction_date: item.extraction_date || ''
    }));
  }

  /**
   * Get a clean product name for searching
   */
  getSearchableProductName(item: CSVItem): string {
    let productName = item['Product Name'] || '';
    
    // Clean up the product name for better search results
    productName = productName
      .replace(/[""]/g, '"') // Normalize quotes
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // Remove common prefixes/suffixes that might interfere with search
    productName = productName
      .replace(/^(item\s*#?\d+:?\s*)/i, '') // Remove "Item 123:" prefixes
      .replace(/\s*-\s*sub\s*total\s*$/i, '') // Remove "Sub Total" suffixes
      .replace(/\s*msrp\s*\$?[\d.,]+/i, '') // Remove MSRP information
      .trim();
    
    return productName;
  }

  /**
   * Check if an item already has ASIN data
   */
  hasASINData(item: CSVItem): boolean {
    return !!(item.asin && item.asin.trim() && item.asin !== '');
  }

  /**
   * Get items that need processing (don't have ASIN data)
   */
  getItemsToProcess(items: CSVItem[]): CSVItem[] {
    return items.filter(item => !this.hasASINData(item));
  }
}
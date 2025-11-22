import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { ASINExtractor } from './extractor/ASINExtractor.js';
import { CSVProcessor } from './csv/CSVProcessor.js';
import { Config } from './config/Config.js';
import fs from 'fs-extra';
import path from 'path';

const program = new Command();

program
  .name('asin-extractor')
  .description('Extract ASINs and image URLs from Amazon for CSV product lists')
  .version('1.0.0');

program
  .command('extract')
  .description('Extract ASINs and image URLs from CSV file')
  .requiredOption('-i, --input <file>', 'Input CSV file path')
  .option('-o, --output <file>', 'Output CSV file path (defaults to input file with "_enriched" suffix)')
  .option('--update-existing', 'Update the existing CSV file instead of creating a new one')
  .option('--delay <ms>', 'Delay between requests in milliseconds', '2000')
  .option('--max-retries <count>', 'Maximum number of retries per search', '3')
  .option('--timeout <ms>', 'Request timeout in milliseconds', '10000')
  .option('--dry-run', 'Show what would be processed without making actual requests')
  .option('--verbose', 'Enable verbose logging')
  .action(async (options) => {
    const spinner = ora('Initializing ASIN Extractor...').start();
    
    try {
      // Validate input file
      if (!await fs.pathExists(options.input)) {
        spinner.fail(chalk.red(`Input file not found: ${options.input}`));
        process.exit(1);
      }

      // Initialize configuration
      const config = new Config({
        delay: parseInt(options.delay),
        maxRetries: parseInt(options.maxRetries),
        timeout: parseInt(options.timeout),
        verbose: options.verbose || false,
        dryRun: options.dryRun || false
      });

      // Determine output file
      let outputFile = options.output;
      if (!outputFile) {
        const inputDir = path.dirname(options.input);
        const inputName = path.basename(options.input, '.csv');
        outputFile = path.join(inputDir, `${inputName}_enriched.csv`);
      }

      if (options.updateExisting) {
        outputFile = options.input;
      }

      spinner.text = 'Loading CSV data...';
      
      // Initialize CSV processor
      const csvProcessor = new CSVProcessor(config);
      const items = await csvProcessor.loadCSV(options.input);
      
      spinner.succeed(chalk.green(`Loaded ${items.length} items from CSV`));
      
      if (config.dryRun) {
        console.log(chalk.yellow('\\n=== DRY RUN MODE ==='));
        console.log(`Items to process: ${items.length}`);
        console.log(`Output file: ${outputFile}`);
        console.log('\\nSample items:');
        items.slice(0, 5).forEach((item, index) => {
          console.log(`${index + 1}. ${item['Product Name'] || 'Unknown'}`);
        });
        return;
      }

      // Initialize ASIN extractor
      const extractor = new ASINExtractor(config);
      
      // Process items
      console.log(chalk.blue(`\\nProcessing ${items.length} items...`));
      const enrichedItems = await extractor.processItems(items);
      
      // Save results
      spinner.start('Saving enriched data...');
      await csvProcessor.saveCSV(enrichedItems, outputFile);
      spinner.succeed(chalk.green(`Results saved to: ${outputFile}`));
      
      // Print summary
      const successCount = enrichedItems.filter(item => item.asin).length;
      const withImages = enrichedItems.filter(item => item.image_url).length;
      
      console.log(chalk.blue('\\n=== EXTRACTION SUMMARY ==='));
      console.log(`Total items: ${enrichedItems.length}`);
      console.log(`ASINs found: ${successCount} (${Math.round(successCount/enrichedItems.length*100)}%)`);
      console.log(`Images found: ${withImages} (${Math.round(withImages/enrichedItems.length*100)}%)`);
      
    } catch (error) {
      spinner.fail(chalk.red('Failed to extract ASINs'));
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
      if (options.verbose && error instanceof Error) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate CSV file format')
  .requiredOption('-i, --input <file>', 'Input CSV file path')
  .action(async (options) => {
    const spinner = ora('Validating CSV file...').start();
    
    try {
      if (!await fs.pathExists(options.input)) {
        spinner.fail(chalk.red(`File not found: ${options.input}`));
        process.exit(1);
      }

      const config = new Config({});
      const csvProcessor = new CSVProcessor(config);
      const items = await csvProcessor.loadCSV(options.input);
      
      // Check for required columns
      const sampleItem = items[0];
      const hasProductName = 'Product Name' in sampleItem;
      const hasDescription = 'Description' in sampleItem;
      
      spinner.succeed(chalk.green('CSV file validation complete'));
      
      console.log(chalk.blue('\\n=== CSV VALIDATION RESULTS ==='));
      console.log(`Total rows: ${items.length}`);
      console.log(`Has 'Product Name' column: ${hasProductName ? '✓' : '✗'}`);
      console.log(`Has 'Description' column: ${hasDescription ? '✓' : '✗'}`);
      
      if (items.length > 0) {
        console.log('\\nColumn headers found:');
        Object.keys(sampleItem).forEach(key => {
          console.log(`  - ${key}`);
        });
        
        console.log('\\nSample data:');
        items.slice(0, 3).forEach((item, index) => {
          console.log(`\\n${index + 1}. Product: ${item['Product Name'] || 'N/A'}`);
          console.log(`   Description: ${(item['Description'] || 'N/A').substring(0, 100)}${(item['Description'] || '').length > 100 ? '...' : ''}`);
        });
      }
      
    } catch (error) {
      spinner.fail(chalk.red('CSV validation failed'));
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${errorMessage}`));
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Show detailed help and examples')
  .action(() => {
    console.log(chalk.blue('\\n=== ASIN EXTRACTOR HELP ===\\n'));
    
    console.log(chalk.yellow('DESCRIPTION:'));
    console.log('This tool extracts Amazon ASINs and image URLs by searching for product names from your CSV file.\\n');
    
    console.log(chalk.yellow('BASIC USAGE:'));
    console.log('  npm run extract -- extract -i auction-items.csv');
    console.log('  npm run extract -- extract -i auction-items.csv -o enriched-items.csv');
    console.log('  npm run extract -- extract -i auction-items.csv --update-existing\\n');
    
    console.log(chalk.yellow('OPTIONS:'));
    console.log('  --delay <ms>         Delay between requests (default: 2000ms)');
    console.log('  --max-retries <num>  Maximum retries per item (default: 3)');
    console.log('  --timeout <ms>       Request timeout (default: 10000ms)');
    console.log('  --dry-run            Preview what will be processed');
    console.log('  --verbose            Enable detailed logging');
    console.log('  --update-existing    Update original file instead of creating new one\\n');
    
    console.log(chalk.yellow('EXAMPLES:'));
    console.log('  # Basic extraction with default settings');
    console.log('  npm run extract -- extract -i auction-items.csv\\n');
    
    console.log('  # Faster processing with shorter delays');
    console.log('  npm run extract -- extract -i auction-items.csv --delay 1000\\n');
    
    console.log('  # Update original file with verbose logging');
    console.log('  npm run extract -- extract -i auction-items.csv --update-existing --verbose\\n');
    
    console.log('  # Dry run to see what would be processed');
    console.log('  npm run extract -- extract -i auction-items.csv --dry-run\\n');
    
    console.log(chalk.yellow('CSV FORMAT:'));
    console.log('Your CSV should have at least a "Product Name" column. Optional columns:');
    console.log('  - Description: Additional product details for better matching');
    console.log('  - Category: Product category information');
    console.log('\\nNew columns will be added:');
    console.log('  - asin: Amazon Standard Identification Number');
    console.log('  - image_url: Main product image URL');
    console.log('  - match_confidence: How confident the match is (high/medium/low)');
    console.log('  - extraction_date: When the data was extracted\\n');
  });

// Parse command line arguments
program.parse();

// If no command provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
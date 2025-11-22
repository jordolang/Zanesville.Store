export interface ConfigOptions {
  delay?: number;
  maxRetries?: number;
  timeout?: number;
  verbose?: boolean;
  dryRun?: boolean;
  userAgent?: string;
  maxConcurrency?: number;
}

export class Config {
  public readonly delay: number;
  public readonly maxRetries: number;
  public readonly timeout: number;
  public readonly verbose: boolean;
  public readonly dryRun: boolean;
  public readonly userAgent: string;
  public readonly maxConcurrency: number;

  constructor(options: ConfigOptions = {}) {
    this.delay = options.delay ?? 2000; // Default 2 second delay between requests
    this.maxRetries = options.maxRetries ?? 3;
    this.timeout = options.timeout ?? 10000; // 10 second timeout
    this.verbose = options.verbose ?? false;
    this.dryRun = options.dryRun ?? false;
    this.maxConcurrency = options.maxConcurrency ?? 1; // Process one at a time to avoid rate limiting
    
    // Use a realistic browser user agent
    this.userAgent = options.userAgent ?? 
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.verbose && level === 'info') return;
    
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }
}
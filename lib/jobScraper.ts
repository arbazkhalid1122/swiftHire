import * as cheerio from 'cheerio';
import puppeteer, { Browser } from 'puppeteer';
import connectDB from './mongodb';
import Job from '@/models/Job';
import JobSource from '@/models/JobSource';
import User from '@/models/User';
import { IndeedFeedParser } from './indeedFeedParser';
import { JoobleScraper } from './joobleScraper';
import { GenericRSSParser } from './genericRSSParser';
import { LinkedInScraper } from './linkedinScraper';
import { XMLFeedParser } from './xmlFeedParser';

interface ScrapedJob {
  title: string;
  description: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  externalUrl?: string;
  externalId?: string;
}

export class JobScraper {
  /**
   * Scrape jobs from a given source
   */
  static async scrapeSource(sourceId: string): Promise<{ success: number; errors: number }> {
    await connectDB();
    
    const source = await JobSource.findById(sourceId);
    if (!source || !source.isActive) {
      throw new Error('Source not found or inactive');
    }

    let jobs: ScrapedJob[] = [];

    // Handle different source types
    // Convert any Indeed URL (search page or RSS) to use www.indeed.com for reliability
    let finalUrl = source.url;
    if (source.url.includes('indeed.com')) {
      try {
        const urlObj = new URL(source.url);
        const hostname = urlObj.hostname;
        
        // Check if it's a country-specific domain (not www.indeed.com)
        if (hostname !== 'www.indeed.com' && hostname.includes('indeed.com')) {
          const params = urlObj.searchParams;
          
          // If it's already an RSS feed, just change the domain
          if (source.url.includes('/rss')) {
            const domain = 'www.indeed.com';
            finalUrl = `https://${domain}/rss?${params.toString()}`;
            console.log(`Converted Indeed RSS URL from ${hostname} to www.indeed.com: ${finalUrl}`);
          } 
          // If it's a search page, convert to RSS feed
          else if (source.url.includes('/jobs')) {
            const query = params.get('q') || '';
            const location = params.get('l') || '';
            
            if (query) {
              const rssParams = new URLSearchParams();
              rssParams.set('q', query);
              if (location) rssParams.set('l', location);
              
              const domain = 'www.indeed.com';
              finalUrl = `https://${domain}/rss?${rssParams.toString()}`;
              console.log(`Converted Indeed search URL to RSS feed (using www.indeed.com for reliability): ${finalUrl}`);
            }
          }
        }
      } catch (error) {
        console.warn('Could not convert Indeed URL, using original:', error);
      }
    }
    
    // Handle XML feed type (partnership feeds like Adecco, Randstad)
    if (source.type === 'xml' && (finalUrl.endsWith('.xml') || finalUrl.includes('xml'))) {
      try {
        console.log('Processing XML feed:', finalUrl);
        const xmlJobs = await XMLFeedParser.fetchXMLFeed(
          finalUrl,
          {
            useScrapingBee: source.scrapingConfig?.useScrapingBee || false,
            scrapingBeeOptions: source.scrapingConfig?.scrapingBeeOptions,
          }
        );
        jobs = xmlJobs.map(job => ({
          title: job.title,
          description: job.description,
          location: job.location,
          salary: job.salary,
          jobType: job.jobType || this.determineJobType(job.title + ' ' + job.description),
          externalUrl: job.externalUrl,
          externalId: job.externalId, // Use referencenumber as externalId
        }));
        console.log(`XML parser found ${jobs.length} jobs`);
      } catch (error: any) {
        console.error('XML feed parsing failed:', error);
        throw new Error(`Failed to parse XML feed: ${error.message}`);
      }
    } else if (source.type === 'xml' || finalUrl.includes('.rss') || finalUrl.includes('/rss') || 
        finalUrl.includes('feed') || finalUrl.endsWith('.xml') || 
        finalUrl.includes('indeed.com/rss')) {
      // Handle RSS/XML feeds - use generic parser for all RSS feeds
      try {
        // Try Indeed-specific parser first (has better handling)
        if (finalUrl.includes('indeed.com/rss') || finalUrl.includes('indeed.com')) {
          try {
            const indeedJobs = await IndeedFeedParser.fetchIndeedJobs(
              finalUrl,
              source.scrapingConfig?.useScrapingBee ? source.scrapingConfig.scrapingBeeOptions : undefined,
              source.scrapingConfig?.useScrapingBee || false // Use ScrapingBee only if enabled
            );
            jobs = indeedJobs.map(job => ({
              title: job.title,
              description: job.description,
              location: job.location,
              salary: IndeedFeedParser.parseSalary(job.salary),
              jobType: this.determineJobType(job.title + ' ' + job.description),
              externalUrl: job.externalUrl,
              externalId: job.externalId,
            }));
            console.log(`Indeed parser found ${jobs.length} jobs`);
          } catch (indeedError: any) {
            console.warn('Indeed-specific parser failed, trying generic RSS parser:', indeedError.message);
            // Fallback to generic RSS parser
            const rssJobs = await GenericRSSParser.parseRSSFeed(
              finalUrl,
              true // Use Puppeteer for generic parser too
            );
            jobs = rssJobs.map(job => ({
              title: job.title,
              description: job.description,
              location: job.location,
              salary: job.salary ? this.parseSalary(job.salary) : undefined,
              jobType: this.determineJobType(job.title + ' ' + job.description),
              externalUrl: job.externalUrl,
              externalId: job.externalId,
            }));
            console.log(`Generic RSS parser found ${jobs.length} jobs`);
          }
        } else {
          // Use generic RSS parser for all other RSS feeds
          const rssJobs = await GenericRSSParser.parseRSSFeed(
            finalUrl,
            source.scrapingConfig?.usePuppeteer || false
          );
          jobs = rssJobs.map(job => ({
            title: job.title,
            description: job.description,
            location: job.location,
            salary: job.salary ? this.parseSalary(job.salary) : undefined,
            jobType: this.determineJobType(job.title + ' ' + job.description),
            externalUrl: job.externalUrl,
            externalId: job.externalId,
          }));
        }
      } catch (error: any) {
        console.error('RSS feed parsing failed, trying fallback:', error);
        // Fallback to old method
        jobs = await this.parseRSSFeed(source);
      }
    } else if (source.url.includes('jooble.org') || source.url.includes('jooble.com')) {
      // Handle Jooble scraping
      const joobleJobs = await JoobleScraper.scrapeJoobleJobs(
        source.url,
        source.scrapingConfig?.usePuppeteer !== false, // Default to true for Jooble
        source.scrapingConfig?.useScrapingBee ? source.scrapingConfig.scrapingBeeOptions : undefined
      );
      
      jobs = joobleJobs.map(job => ({
        title: job.title,
        description: job.description,
        location: job.location,
        salary: JoobleScraper.parseSalary(job.salary),
        jobType: this.determineJobType(job.title + ' ' + job.description),
        externalUrl: job.externalUrl,
        externalId: job.externalId,
      }));
    } else if (source.url.includes('linkedin.com/jobs')) {
      // Handle LinkedIn scraping
      const linkedinJobs = await LinkedInScraper.scrapeLinkedInJobs(
        source.url,
        source.scrapingConfig?.useScrapingBee ? source.scrapingConfig.scrapingBeeOptions : undefined
      );
      
      jobs = linkedinJobs.map(job => ({
        title: job.title,
        description: job.description,
        location: job.location,
        salary: job.salary ? this.parseSalary(job.salary) : undefined,
        jobType: this.determineJobType(job.title + ' ' + job.description),
        externalUrl: job.externalUrl,
        externalId: job.externalId,
      }));
    } else {
      // Handle HTML scraping (generic)
      let html: string;
      
      // Fetch HTML content - prioritize ScrapingBee if enabled
      if (source.scrapingConfig?.useScrapingBee) {
        html = await this.fetchWithScrapingBee(source.url, source.scrapingConfig.scrapingBeeOptions);
      } else if (source.scrapingConfig?.usePuppeteer) {
        html = await this.fetchWithPuppeteer(source.url);
      } else {
        html = await this.fetchWithCheerio(source.url);
      }

      // Parse jobs from HTML
      jobs = await this.parseJobs(html, source);
    }

    // Save jobs to database
    let successCount = 0;
    let errorCount = 0;

    // Get or create a system company for scraped jobs
    const systemCompany = await this.getSystemCompany();

    for (const job of jobs) {
      try {
        await this.saveJob(job, source._id.toString(), systemCompany._id.toString());
        successCount++;
      } catch (error: any) {
        console.error(`Error saving job: ${job.title}`, error);
        errorCount++;
      }
    }

    // Update source metadata
    await JobSource.findByIdAndUpdate(sourceId, {
      lastScrapedAt: new Date(),
      lastSuccessAt: successCount > 0 ? new Date() : source.lastSuccessAt,
      lastError: errorCount > 0 ? `Failed to save ${errorCount} jobs` : undefined,
    });

    return { success: successCount, errors: errorCount };
  }

  /**
   * Fetch HTML using ScrapingBee (bypasses Cloudflare, handles proxies)
   */
  private static async fetchWithScrapingBee(
    url: string,
    options?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
    }
  ): Promise<string> {
    const { ScrapingBee } = await import('./scrapingBee');
    
    if (!ScrapingBee.isConfigured()) {
      throw new Error('ScrapingBee is not configured. Please set SCRAPINGBEE_API_KEY in your environment variables.');
    }

    try {
      if (options?.renderJs) {
        // Use JavaScript rendering (for dynamic content)
        return await ScrapingBee.fetchWithJS(url, {
          countryCode: options?.countryCode,
          wait: options?.wait,
        });
      } else {
        // Standard fetch
        return await ScrapingBee.fetch(url, {
          countryCode: options?.countryCode,
          wait: options?.wait,
        });
      }
    } catch (error: any) {
      console.error('ScrapingBee fetch failed, falling back to Puppeteer:', error);
      // Fallback to Puppeteer if ScrapingBee fails
      return await this.fetchWithPuppeteer(url);
    }
  }

  /**
   * Fetch HTML using Cheerio (for static content)
   */
  private static async fetchWithCheerio(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error fetching with Cheerio:', error);
      throw error;
    }
  }

  /**
   * Fetch HTML using Puppeteer (for dynamic content)
   */
  private static async fetchWithPuppeteer(url: string): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode to avoid deprecation warning
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      const html = await page.content();
      await browser.close();
      
      return html;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error fetching with Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Parse jobs from HTML using selectors
   */
  private static async parseJobs(html: string, source: any): Promise<ScrapedJob[]> {
    const $ = cheerio.load(html);
    const jobs: ScrapedJob[] = [];
    const config = source.scrapingConfig || {};

    // Find job items
    const jobItems = config.jobItemSelector 
      ? $(config.jobItemSelector)
      : $('article, .job-item, .job-card, [class*="job"]');

    jobItems.each((index, element) => {
      try {
        const $item = $(element);
        
        // Extract job data using selectors
        const title = this.extractText($item, config.titleSelector || 'h1, h2, h3, .title, [class*="title"]');
        const description = this.extractText($item, config.descriptionSelector || '.description, .summary, p');
        const location = this.extractText($item, config.locationSelector || '.location, [class*="location"]');
        const salaryText = this.extractText($item, config.salarySelector || '.salary, [class*="salary"]');
        const link = this.extractLink($item, config.linkSelector || 'a');

        if (!title || !description) {
          return; // Skip invalid jobs
        }

        // Parse salary
        const salary = this.parseSalary(salaryText);

        // Determine job type from title/description
        const jobType = this.determineJobType(title + ' ' + description);

        jobs.push({
          title: title.trim(),
          description: description.trim(),
          location: location?.trim(),
          salary,
          jobType,
          externalUrl: link ? (link.startsWith('http') ? link : new URL(link, source.url).toString()) : undefined,
          externalId: link ? this.extractIdFromUrl(link) : undefined,
        });
      } catch (error) {
        console.error('Error parsing job item:', error);
      }
    });

    return jobs;
  }

  /**
   * Extract text using selector
   */
  private static extractText($item: cheerio.Cheerio<any>, selector: string): string | undefined {
    const element = $item.find(selector).first();
    return element.text()?.trim() || element.attr('content') || undefined;
  }

  /**
   * Extract link using selector
   */
  private static extractLink($item: cheerio.Cheerio<any>, selector: string): string | undefined {
    const element = $item.find(selector).first();
    return element.attr('href') || undefined;
  }

  /**
   * Parse salary from text
   */
  private static parseSalary(salaryText?: string): { min?: number; max?: number; currency?: string } | undefined {
    if (!salaryText) return undefined;

    // Extract numbers from salary text (e.g., "€30,000 - €50,000" or "30k-50k")
    const numbers = salaryText.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) return undefined;

    const cleanNumbers = numbers.map(n => parseInt(n.replace(/,/g, '')));
    const currency = salaryText.match(/[€$£]/)?.[0] || 'EUR';

    return {
      min: cleanNumbers[0],
      max: cleanNumbers.length > 1 ? cleanNumbers[1] : cleanNumbers[0],
      currency: currency === '€' ? 'EUR' : currency === '$' ? 'USD' : currency === '£' ? 'GBP' : 'EUR',
    };
  }

  /**
   * Determine job type from text
   */
  private static determineJobType(text: string): 'full-time' | 'part-time' | 'contract' | 'internship' {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('part-time') || lowerText.includes('part time')) {
      return 'part-time';
    }
    if (lowerText.includes('contract') || lowerText.includes('freelance')) {
      return 'contract';
    }
    if (lowerText.includes('intern') || lowerText.includes('stage')) {
      return 'internship';
    }
    
    return 'full-time';
  }

  /**
   * Extract ID from URL
   */
  private static extractIdFromUrl(url: string): string | undefined {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p);
      return pathParts[pathParts.length - 1] || urlObj.searchParams.get('id') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Save job to database (with duplicate detection)
   */
  private static async saveJob(job: ScrapedJob, sourceId: string, companyId: string): Promise<void> {
    // Ensure description is not empty (required by Job model)
    const description = job.description?.trim() || this.getDefaultDescription(job);
    
    // Ensure we have an externalId - use URL hash as fallback if missing
    let externalId = job.externalId;
    if (!externalId && job.externalUrl) {
      externalId = this.hashString(job.externalUrl);
    }
    // If still no ID, use title hash as last resort
    if (!externalId) {
      externalId = this.hashString(job.title + sourceId);
    }
    
    // Check for duplicates - use externalId if available, otherwise title + sourceId
    const duplicateQuery: any = {
      'externalSource.sourceId': sourceId,
    };

    if (externalId) {
      duplicateQuery['externalSource.externalId'] = externalId;
    } else {
      // If no externalId, check by title + sourceId
      duplicateQuery.title = job.title;
    }

    const existing = await Job.findOne(duplicateQuery);

    if (existing) {
      // Update existing job
      existing.description = description;
      existing.location = job.location || existing.location;
      existing.salary = job.salary || existing.salary;
      existing.jobType = job.jobType || existing.jobType;
      existing.status = 'active';
      if (job.externalUrl) {
        existing.externalSource = {
          ...existing.externalSource,
          externalUrl: job.externalUrl,
          scrapedAt: new Date(),
        };
      }
      await existing.save();
      return;
    }

    // Create new job
    const newJob = new Job({
      companyId,
      title: job.title,
      description: description,
      location: job.location,
      salary: job.salary,
      jobType: job.jobType || 'full-time',
      status: 'active',
      requirements: {},
      externalSource: {
        sourceId,
        externalId: externalId, // Use the ensured externalId (with fallback)
        externalUrl: job.externalUrl,
        scrapedAt: new Date(),
      },
    });

    await newJob.save();
  }

  /**
   * Generate a simple hash from a string (for use as externalId when not provided)
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive number and return as string with prefix
    return `hash_${Math.abs(hash).toString()}`;
  }

  /**
   * Get default description when description is missing
   */
  private static getDefaultDescription(job: ScrapedJob): string {
    const parts: string[] = [];
    
    if (job.title) {
      parts.push(`We are looking for a ${job.title}.`);
    }
    
    if (job.location) {
      parts.push(`Location: ${job.location}.`);
    }
    
    if (job.salary) {
      const salaryText = job.salary.min && job.salary.max
        ? `${job.salary.currency || 'EUR'} ${job.salary.min} - ${job.salary.max}`
        : job.salary.min
        ? `${job.salary.currency || 'EUR'} ${job.salary.min}+`
        : '';
      if (salaryText) {
        parts.push(`Salary: ${salaryText}.`);
      }
    }
    
    if (job.externalUrl) {
      parts.push(`For more details, visit: ${job.externalUrl}`);
    }
    
    // If we still don't have a description, provide a generic one
    if (parts.length === 0) {
      return `Job posting for ${job.title || 'this position'}. Please visit the original listing for full details.`;
    }
    
    return parts.join(' ') + ' Please visit the original listing for full job description and requirements.';
  }

  /**
   * Parse RSS/XML feed (especially Indeed)
   */
  private static async parseRSSFeed(source: any): Promise<ScrapedJob[]> {
    try {
      // Check if it's an Indeed feed
      if (source.url.includes('indeed.com/rss') || source.url.includes('indeed.com')) {
        const indeedJobs = await IndeedFeedParser.fetchIndeedJobs(source.url);
        
        return indeedJobs.map(job => ({
          title: job.title,
          description: job.description,
          location: job.location,
          salary: IndeedFeedParser.parseSalary(job.salary),
          jobType: this.determineJobType(job.title + ' ' + job.description),
          externalUrl: job.externalUrl,
          externalId: job.externalId,
        }));
      }

      // Generic RSS feed parsing (can be extended for other providers)
      const response = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const $ = cheerio.load(xmlText, { xmlMode: true });
      const jobs: ScrapedJob[] = [];

      $('item').each((index, element) => {
        const $item = $(element);
        const title = $item.find('title').text().trim();
        const description = $item.find('description').text().trim();
        const link = $item.find('link').text().trim();
        const location = $item.find('location, job\\:location').text().trim();

        if (title && description) {
          jobs.push({
            title,
            description,
            location: location || undefined,
            externalUrl: link || undefined,
            externalId: link ? this.extractIdFromUrl(link) : undefined,
            jobType: this.determineJobType(title + ' ' + description),
          });
        }
      });

      return jobs;
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      throw error;
    }
  }

  /**
   * Get or create system company for scraped jobs
   */
  private static async getSystemCompany(): Promise<any> {
    // First, check if there's an existing system company with invalid data
    let company = await User.findOne({ 
      email: 'system@swifthire.com',
    });

    // If company exists but has invalid role, delete it
    if (company && (company.role === 'system' || !company.password)) {
      console.log('Found invalid system company, deleting and recreating...');
      await User.findByIdAndDelete(company._id);
      company = null;
    }

    // If company exists and is valid, return it
    if (company && company.userType === 'company') {
      return company;
    }

    // Create new system company with valid role and password
    // Password is required by schema but won't be used for login
    company = new User({
      name: 'SwiftHire System',
      companyName: 'SwiftHire System',
      email: 'system@swifthire.com',
      password: 'system_account_no_login_' + Math.random().toString(36).slice(2) + Date.now().toString(36),
      userType: 'company',
      isVerified: true,
      role: 'user', // Use 'user' role as 'system' is not a valid enum value
    });
    await company.save();

    return company;
  }
}


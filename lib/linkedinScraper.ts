import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface LinkedInJob {
  title: string;
  description: string;
  location?: string;
  company?: string;
  salary?: string;
  externalUrl?: string;
  externalId?: string;
  publishedDate?: Date;
}

export class LinkedInScraper {
  /**
   * Build LinkedIn job search URL from parameters
   */
  static buildLinkedInURL(params: {
    query?: string;
    location?: string;
    experience?: string;
    jobType?: string;
  }): string {
    const baseURL = 'https://www.linkedin.com/jobs/search';
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.set('keywords', params.query);
    if (params.location) searchParams.set('location', params.location);
    if (params.experience) searchParams.set('f_E', params.experience);
    if (params.jobType) searchParams.set('f_JT', params.jobType);

    return `${baseURL}?${searchParams.toString()}`;
  }

  /**
   * Scrape jobs from LinkedIn search page
   */
  static async scrapeLinkedInJobs(
    searchURL: string,
    scrapingBeeOptions?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
    }
  ): Promise<LinkedInJob[]> {
    try {
      // LinkedIn requires JS rendering due to dynamic content and bot protection
      // Use ScrapingBee if configured (better for bot detection), otherwise Puppeteer
      let html: string;
      
      if (scrapingBeeOptions) {
        html = await this.fetchWithScrapingBee(searchURL, scrapingBeeOptions);
      } else {
        html = await this.fetchWithPuppeteer(searchURL);
      }
      
      return this.parseJobs(html);
    } catch (error) {
      console.error('Error scraping LinkedIn jobs:', error);
      throw error;
    }
  }

  /**
   * Fetch HTML using ScrapingBee (bypasses bot detection)
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
      console.log('Fetching LinkedIn page using ScrapingBee...');
      
      // LinkedIn requires JS rendering due to dynamic content
      const html = await ScrapingBee.fetchWithJS(url, {
        countryCode: options?.countryCode,
        wait: options?.wait || 3000, // Wait 3 seconds for LinkedIn's dynamic content
      });

      return html;
    } catch (error: any) {
      console.error('ScrapingBee fetch failed, falling back to Puppeteer:', error);
      // Fallback to Puppeteer
      return await this.fetchWithPuppeteer(url);
    }
  }

  /**
   * Fetch HTML using Puppeteer (required for LinkedIn)
   */
  private static async fetchWithPuppeteer(url: string): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();

      // Set realistic browser headers and viewport
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Remove webdriver property
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => false,
        });
        
        // Override plugins
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Upgrade-Insecure-Requests': '1',
      });

      console.log('Navigating to LinkedIn...');
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Wait for job listings to load
      console.log('Waiting for job listings...');
      try {
        await page.waitForSelector('.jobs-search__results-list, .scaffold-layout__list, [class*="job-card"], [class*="job-result"]', {
          timeout: 15000,
        });
        console.log('Job listings found');
      } catch {
        console.warn('Job listings selector not found, proceeding anyway...');
      }

      // Scroll to load more jobs (LinkedIn uses infinite scroll)
      await this.scrollPage(page);

      // Wait a bit for content to load
      await page.waitForTimeout(2000);

      const html = await page.content();
      await browser.close();

      return html;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error fetching LinkedIn with Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Scroll page to load more content (LinkedIn uses infinite scroll)
   */
  private static async scrollPage(page: any): Promise<void> {
    try {
      // Scroll down multiple times to load more jobs
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1000);
      }
      
      // Scroll back to top
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(500);
    } catch (error) {
      console.warn('Error scrolling page:', error);
    }
  }

  /**
   * Parse jobs from HTML
   */
  private static parseJobs(html: string): LinkedInJob[] {
    const $ = cheerio.load(html);
    const jobs: LinkedInJob[] = [];

    // LinkedIn uses various selectors - try multiple
    const jobSelectors = [
      '.jobs-search__results-list li',
      '.scaffold-layout__list-item',
      '[class*="job-card"]',
      '[class*="job-result"]',
      'li[class*="job"]',
      'div[class*="job-card"]',
    ];

    let jobElements: cheerio.Cheerio<cheerio.Element> | null = null;

    for (const selector of jobSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        jobElements = elements;
        console.log(`Found ${elements.length} jobs using selector: ${selector}`);
        break;
      }
    }

    if (!jobElements || jobElements.length === 0) {
      console.warn('No job listings found. LinkedIn may have changed their HTML structure or is blocking access.');
      
      // Try to find job links as fallback
      $('a[href*="/jobs/view/"], a[href*="/jobs/collections/"]').each((index, element) => {
        const $link = $(element);
        const title = $link.text().trim() || $link.find('span, h3, h4').first().text().trim();
        const href = $link.attr('href');

        if (title && href && title.length > 5) {
          const fullUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
          jobs.push({
            title: this.cleanText(title),
            description: `Job posting for ${this.cleanText(title)}. Please visit the original listing for full job description and requirements.`,
            externalUrl: fullUrl,
            externalId: this.extractJobIdFromURL(fullUrl),
          });
        }
      });

      if (jobs.length > 0) {
        console.log(`Found ${jobs.length} jobs from links`);
        return jobs;
      }

      return jobs;
    }

    // Parse each job element
    jobElements.each((index, element) => {
      try {
        const $job = $(element);

        // Extract title
        const title =
          $job.find('.job-card-list__title, .job-result-card__title, [class*="job-title"], h3, h4, a[class*="title"]').first().text().trim() ||
          $job.find('a').first().text().trim() ||
          $job.find('h3, h4').first().text().trim();

        // Extract description
        const description =
          $job.find('.job-result-card__snippet, .job-card-container__description, [class*="description"], [class*="snippet"]').first().text().trim() ||
          $job.find('p').first().text().trim();

        // Extract location
        const location =
          $job.find('.job-result-card__location, .job-card-container__metadata-item, [class*="location"]').first().text().trim() ||
          $job.find('[class*="location"]').first().text().trim();

        // Extract company
        const company =
          $job.find('.job-result-card__company-name, .job-card-container__company-name, [class*="company"]').first().text().trim() ||
          $job.find('[class*="company"]').first().text().trim();

        // Extract link
        const linkElement = $job.find('a[href*="/jobs/view/"], a[href*="/jobs/collections/"], a[class*="link"]').first();
        const href = linkElement.attr('href') || $job.find('a').first().attr('href') || '';
        let externalUrl: string | undefined = undefined;
        if (href) {
          externalUrl = href.startsWith('http') ? href : `https://www.linkedin.com${href}`;
        }

        // Extract published date
        const dateText =
          $job.find('.job-result-card__listdate, [class*="date"], [class*="time"]').first().text().trim() ||
          $job.find('[class*="date"]').first().text().trim();

        if (title) {
          // Ensure description is not empty - provide fallback if needed
          let finalDescription = this.cleanText(description);
          if (!finalDescription || finalDescription.trim().length === 0) {
            // Build a basic description from available data
            const descParts: string[] = [];
            if (company) {
              descParts.push(`Company: ${this.cleanText(company)}.`);
            }
            if (location) {
              descParts.push(`Location: ${this.cleanText(location)}.`);
            }
            if (dateText) {
              descParts.push(`Posted: ${dateText}.`);
            }
            finalDescription = descParts.length > 0
              ? descParts.join(' ') + ' Please visit the original listing for full job description.'
              : `Job posting for ${this.cleanText(title)}. Please visit the original listing for full details.`;
          }
          
          // Ensure we always have an externalId (extractJobIdFromURL now always returns a value)
          const jobId = externalUrl ? this.extractJobIdFromURL(externalUrl) : this.hashString(title + (location || ''));
          
          jobs.push({
            title: this.cleanText(title),
            description: finalDescription,
            location: location ? this.cleanText(location) : undefined,
            company: company ? this.cleanText(company) : undefined,
            externalUrl,
            externalId: jobId, // Always has a value now
            publishedDate: dateText ? this.parseDate(dateText) : undefined,
          });
        }
      } catch (error) {
        console.error('Error parsing LinkedIn job item:', error);
      }
    });

    return jobs;
  }

  /**
   * Extract job ID from LinkedIn URL
   */
  private static extractJobIdFromURL(url: string): string | undefined {
    try {
      // LinkedIn URLs patterns:
      // https://www.linkedin.com/jobs/view/1234567890/
      // https://www.linkedin.com/jobs/collections/recommended/?currentJobId=1234567890
      // https://www.linkedin.com/jobs/view/1234567890/?originalSubdomain=...
      
      // Try /jobs/view/ pattern first
      let match = url.match(/\/jobs\/view\/(\d+)/);
      if (match) {
        return match[1];
      }
      
      // Try currentJobId parameter
      const urlObj = new URL(url);
      const jobId = urlObj.searchParams.get('currentJobId');
      if (jobId) {
        return jobId;
      }
      
      // Try to extract from any numeric ID in the path
      match = url.match(/\/jobs\/[^\/]*\/(\d+)/);
      if (match) {
        return match[1];
      }
      
      // If no ID found, generate a hash from the URL as fallback
      // This ensures we have a unique identifier even when LinkedIn doesn't provide one
      return this.hashString(url);
    } catch {
      // If URL parsing fails, generate hash from the string
      return this.hashString(url);
    }
  }

  /**
   * Generate a simple hash from a string (for use as externalId when URL doesn't contain ID)
   */
  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert to positive number and return as string with prefix to ensure uniqueness
    return `linkedin_${Math.abs(hash).toString()}`;
  }

  /**
   * Clean HTML/text content
   */
  private static cleanText(text: string): string {
    if (!text) return '';

    let cleaned = text.replace(/<[^>]*>/g, '');
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  /**
   * Parse date from text
   */
  private static parseDate(dateText: string): Date | undefined {
    try {
      const lowerText = dateText.toLowerCase();
      
      // Handle relative dates
      if (lowerText.includes('ago')) {
        const daysMatch = lowerText.match(/(\d+)\s*(day|days)/);
        if (daysMatch) {
          const days = parseInt(daysMatch[1]);
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date;
        }
      }

      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Ignore parsing errors
    }

    return undefined;
  }
}


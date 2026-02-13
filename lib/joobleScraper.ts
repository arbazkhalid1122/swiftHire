import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

interface JoobleJob {
  title: string;
  description: string;
  location?: string;
  company?: string;
  salary?: string;
  externalUrl?: string;
  externalId?: string;
  publishedDate?: Date;
}

export class JoobleScraper {
  /**
   * Build Jooble search URL from parameters
   */
  static buildJoobleURL(params: {
    query?: string;
    location?: string;
    page?: number;
  }): string {
    const baseURL = 'https://jooble.org';
    const searchParams = new URLSearchParams();

    // Jooble uses 'ukw' for keywords and 'rgns' for location/region
    if (params.query) searchParams.set('ukw', params.query);
    if (params.location) searchParams.set('rgns', params.location);
    if (params.page) searchParams.set('p', params.page.toString());

    // Use the regular search page URL (not API endpoint)
    return `${baseURL}/SearchResult?${searchParams.toString()}`;
  }

  /**
   * Scrape jobs from Jooble search page
   */
  static async scrapeJoobleJobs(
    searchURL: string,
    usePuppeteer: boolean = true,
    scrapingBeeOptions?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
    }
  ): Promise<JoobleJob[]> {
    try {
      // Convert API URL to regular search page URL if needed
      let finalURL = searchURL;
      if (searchURL.includes('/api/search')) {
        // Convert /api/search to regular search page format
        const urlObj = new URL(searchURL);
        const params = urlObj.searchParams;
        const keywords = params.get('keywords') || '';
        const location = params.get('location') || '';
        
        // Build regular Jooble search URL
        const searchParams = new URLSearchParams();
        if (keywords) searchParams.set('ukw', keywords);
        if (location) searchParams.set('rgns', location);
        
        finalURL = `https://jooble.org/SearchResult?${searchParams.toString()}`;
        console.log(`Converted API URL to search page: ${finalURL}`);
      }

      // Use HTML scraping (Jooble's API requires authentication)
      let html: string;

      // Prioritize ScrapingBee if configured (better for Cloudflare protection)
      if (scrapingBeeOptions) {
        html = await this.fetchWithScrapingBee(finalURL, scrapingBeeOptions);
      } else if (usePuppeteer) {
        html = await this.fetchWithPuppeteer(finalURL);
      } else {
        html = await this.fetchWithCheerio(finalURL);
      }

      return this.parseJobs(html);
    } catch (error) {
      console.error('Error scraping Jooble jobs:', error);
      throw error;
    }
  }


  /**
   * Fetch HTML using ScrapingBee (bypasses Cloudflare)
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
      console.log('Fetching Jooble page using ScrapingBee...');
      
      // Jooble requires JS rendering due to dynamic content
      const html = await ScrapingBee.fetchWithJS(url, {
        countryCode: options?.countryCode,
        wait: options?.wait || 3000, // Wait 3 seconds for Jooble's dynamic content
      });

      return html;
    } catch (error: any) {
      console.error('ScrapingBee fetch failed, falling back to Puppeteer:', error);
      // Fallback to Puppeteer
      return await this.fetchWithPuppeteer(url);
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
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set realistic browser headers and viewport to avoid bot detection
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      });
      
      // Add stealth techniques to avoid detection
      await page.evaluateOnNewDocument(() => {
        // Override webdriver property
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
        
        // Override permissions
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters: any) => (
          parameters.name === 'notifications' ?
            Promise.resolve({ state: Notification.permission } as PermissionStatus) :
            originalQuery(parameters)
        );
      });

      // Navigate to search page
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Check if we're on a Cloudflare challenge page
      let pageTitle = await page.title();
      let challengeDetected = pageTitle.includes('Just a moment') || pageTitle.includes('challenge') || pageTitle.includes('Checking your browser');
      
      if (challengeDetected) {
        console.log('Detected Cloudflare challenge, waiting for it to complete...');
        
        // Wait for the challenge to complete (Cloudflare usually takes 3-5 seconds)
        try {
          // Wait for the title to change from "Just a moment..."
          await page.waitForFunction(
            () => {
              const title = document.title;
              return title !== 'Just a moment...' && 
                     !title.includes('challenge') && 
                     !title.includes('Checking your browser');
            },
            { timeout: 20000 }
          );
          
          // Verify we're past the challenge
          pageTitle = await page.title();
          challengeDetected = pageTitle.includes('Just a moment') || pageTitle.includes('challenge');
          
          if (!challengeDetected) {
            console.log('Cloudflare challenge completed, title:', pageTitle);
          } else {
            console.warn('Still on challenge page after wait');
          }
        } catch (error) {
          console.warn('Cloudflare challenge timeout, checking current state...');
          pageTitle = await page.title();
          challengeDetected = pageTitle.includes('Just a moment') || pageTitle.includes('challenge');
        }
        
        // Wait a bit more for content to load
        await page.waitForTimeout(3000);
      } else {
        // Wait a bit for content to load normally
        await page.waitForTimeout(2000);
      }
      
      // Final check - if still on challenge page, wait longer
      pageTitle = await page.title();
      if (pageTitle.includes('Just a moment') || pageTitle.includes('challenge')) {
        console.warn('Still on Cloudflare challenge page, waiting additional 5 seconds...');
        await page.waitForTimeout(5000);
        pageTitle = await page.title();
      }
      
      // Wait for network to be idle after challenge
      try {
        await page.waitForFunction(
          () => document.readyState === 'complete',
          { timeout: 10000 }
        );
        // Wait a bit more for dynamic content
        await page.waitForTimeout(2000);
      } catch {
        // Ignore if wait fails, just continue
      }
      
      // Log final page title for debugging
      console.log('Final page title:', pageTitle);
      
      // Check if we're still blocked by Cloudflare
      if (pageTitle.includes('Just a moment') || pageTitle.includes('challenge') || pageTitle.includes('Checking your browser')) {
        const html = await page.content();
        if (html.includes('challenge-platform') || html.includes('cf-browser-verification')) {
          await browser.close();
          throw new Error(
            'Cloudflare is blocking automated access to Jooble. Jooble uses Cloudflare protection which prevents automated scraping. ' +
            'Please use Indeed RSS feeds instead (more reliable) or use a proxy service to bypass Cloudflare.'
          );
        }
      }

      // Try to wait for job listings with multiple selectors
      const selectors = [
        '.vacancy-item',
        '.job-item',
        '.result-item',
        '.vacancy-wrapper',
        '[data-testid="job-item"]',
        '[data-testid="vacancy-item"]',
        '.job-card',
        'article',
        '[class*="job"]',
        '[class*="vacancy"]',
      ];

      let foundSelector = false;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          foundSelector = true;
          console.log(`Found jobs using selector: ${selector}`);
          break;
        } catch {
          // Continue to next selector
        }
      }

      if (!foundSelector) {
        console.warn('No job selectors found, proceeding with page content...');
      }

      const html = await page.content();
      
      // Debug: log a snippet of the HTML to help diagnose
      console.log('Page HTML length:', html.length);
      if (html.length < 10000) {
        console.log('Page HTML snippet:', html.substring(0, 2000));
      } else {
        console.log('Page HTML snippet (first 2000 chars):', html.substring(0, 2000));
      }
      
      // Try to find any job-related text in the HTML
      const jobKeywords = ['job', 'vacancy', 'position', 'career', 'hiring'];
      const foundKeywords = jobKeywords.filter(keyword => 
        html.toLowerCase().includes(keyword)
      );
      console.log('Found keywords in HTML:', foundKeywords);
      
      await browser.close();

      return html;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error fetching Jooble with Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Fetch HTML using Cheerio (for static content)
   */
  private static async fetchWithCheerio(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://jooble.org/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error fetching Jooble with Cheerio:', error);
      throw error;
    }
  }

  /**
   * Parse jobs from HTML
   */
  private static parseJobs(html: string): JoobleJob[] {
    const $ = cheerio.load(html);
    const jobs: JoobleJob[] = [];

    // Debug: Check if page loaded correctly
    const pageTitle = $('title').text();
    console.log('Page title:', pageTitle);
    
    // Check for Cloudflare challenge page
    if (pageTitle.includes('Just a moment') || pageTitle.includes('challenge') || 
        html.includes('challenge-platform') || html.includes('cf-browser-verification')) {
      throw new Error(
        'Cloudflare is blocking access to Jooble. Jooble uses Cloudflare protection which prevents automated scraping. ' +
        'Please use Indeed RSS feeds instead (more reliable) or use a proxy service to bypass Cloudflare.'
      );
    }
    
    // Check for common error messages or redirects
    if (html.includes('404') || html.includes('Not Found') || html.includes('Access Denied')) {
      console.warn('Page appears to be an error page');
    }

    // Try multiple selectors as Jooble may change their structure
    // Jooble typically uses classes like: .vacancy-item, .job-item, .result-item
    const jobSelectors = [
      '.vacancy-item',
      '.job-item',
      '.result-item',
      '.vacancy-wrapper',
      '[data-testid="job-item"]',
      '[data-testid="vacancy-item"]',
      '.job-card',
      'article[class*="job"]',
      'article[class*="vacancy"]',
      'div[class*="vacancy"]',
      'div[class*="job"]',
      'li[class*="vacancy"]',
      'li[class*="job"]',
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
      console.warn('No job listings found with standard selectors. Trying alternative methods...');
      
      // Try to find job listings by looking for common patterns
      // Look for any elements that might contain job information
      const alternativeSelectors = [
        'div[class*="result"]',
        'div[class*="listing"]',
        'div[class*="item"]',
        'li[class*="job"]',
        'li[class*="vacancy"]',
        'article',
        'section[class*="job"]',
      ];

      for (const selector of alternativeSelectors) {
        const elements = $(selector);
        if (elements.length > 3) { // Likely job listings if we find multiple
          console.log(`Found ${elements.length} potential jobs using selector: ${selector}`);
          jobElements = elements;
          break;
        }
      }

      // If still nothing, try to find any links that might be job listings
      if (!jobElements || jobElements.length === 0) {
        console.log('Trying to find job links...');
        $('a[href*="/job/"], a[href*="/vacancy/"], a[href*="/position/"], a[href*="/offer/"]').each((index, element) => {
          const $link = $(element);
          const title = $link.text().trim() || $link.find('span, div, h2, h3').first().text().trim();
          const href = $link.attr('href');

          if (title && href && title.length > 5) { // Filter out very short titles
            jobs.push({
              title: this.cleanText(title),
              description: $link.closest('div, article, li').find('p, .description, .snippet').first().text().trim() || '',
              externalUrl: href.startsWith('http') ? href : `https://jooble.org${href}`,
              externalId: this.extractJobIdFromURL(href),
            });
          }
        });

        if (jobs.length > 0) {
          console.log(`Found ${jobs.length} jobs from links`);
          return jobs;
        }
      }
    }

    // Only parse if we found job elements
    if (!jobElements || jobElements.length === 0) {
      console.warn('No job elements found after trying all selectors');
      console.log('Available classes in HTML (sample):', 
        Array.from(new Set(
          $('[class]').map((i, el) => $(el).attr('class')).get().slice(0, 20)
        )).join(', ')
      );
      return jobs; // Return empty array or jobs found from links
    }

    console.log(`Parsing ${jobElements.length} job elements...`);

    // Parse each job element
    jobElements.each((index, element) => {
      try {
        const $job = $(element);

        // Extract title (Jooble often uses .vacancy-title or h2/h3)
        const title =
          $job.find('.vacancy-title, .job-title, [data-testid="job-title"], [data-testid="vacancy-title"], h2, h3, a[class*="title"], a[class*="link"]').first().text().trim() ||
          $job.find('a').first().text().trim() ||
          $job.find('h2, h3, h4').first().text().trim();

        // Extract description
        const description =
          $job.find('.job-description, .vacancy-description, [data-testid="job-description"], .snippet').first().text().trim() ||
          $job.find('p').first().text().trim();

        // Extract location
        const location =
          $job.find('.job-location, .vacancy-location, [data-testid="job-location"], .location').first().text().trim() ||
          $job.find('[class*="location"]').first().text().trim();

        // Extract company
        const company =
          $job.find('.job-company, .vacancy-company, [data-testid="job-company"], .company').first().text().trim() ||
          $job.find('[class*="company"]').first().text().trim();

        // Extract salary
        const salary =
          $job.find('.job-salary, .vacancy-salary, [data-testid="job-salary"], .salary').first().text().trim() ||
          $job.find('[class*="salary"]').first().text().trim();

        // Extract link (Jooble links often contain /job/ or /vacancy/ or are relative)
        const linkElement = $job.find('a[href*="/job/"], a[href*="/vacancy/"], a[href*="/position/"], a[href*="/offer/"], a[class*="link"], a[class*="title"]').first();
        const href = linkElement.attr('href') || $job.find('a').first().attr('href') || '';
        let externalUrl: string | undefined = undefined;
        if (href) {
          if (href.startsWith('http')) {
            externalUrl = href;
          } else if (href.startsWith('/')) {
            externalUrl = `https://jooble.org${href}`;
          } else {
            externalUrl = `https://jooble.org/${href}`;
          }
        }

        // Extract published date
        const dateText =
          $job.find('.job-date, .vacancy-date, [data-testid="job-date"], .date').first().text().trim() ||
          $job.find('[class*="date"]').first().text().trim();

        if (title) {
          jobs.push({
            title: this.cleanText(title),
            description: this.cleanText(description),
            location: location ? this.cleanText(location) : undefined,
            company: company ? this.cleanText(company) : undefined,
            salary: salary ? this.cleanText(salary) : undefined,
            externalUrl,
            externalId: externalUrl ? this.extractJobIdFromURL(externalUrl) : undefined,
            publishedDate: dateText ? this.parseDate(dateText) : undefined,
          });
        }
      } catch (error) {
        console.error('Error parsing Jooble job item:', error);
      }
    });

    return jobs;
  }

  /**
   * Extract job ID from URL
   */
  private static extractJobIdFromURL(url: string): string | undefined {
    try {
      // Jooble URLs typically have format: https://jooble.org/job/{jobId} or /search/{jobId}
      const match = url.match(/\/(?:job|vacancy|search)\/([^\/\?]+)/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Clean HTML/text content
   */
  private static cleanText(text: string): string {
    if (!text) return '';

    // Remove HTML tags
    let cleaned = text.replace(/<[^>]*>/g, '');

    // Decode HTML entities
    cleaned = cleaned
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Parse date from text
   */
  private static parseDate(dateText: string): Date | undefined {
    try {
      // Try to parse relative dates like "2 days ago", "1 week ago"
      const lowerText = dateText.toLowerCase();
      if (lowerText.includes('ago')) {
        const daysMatch = lowerText.match(/(\d+)\s*(day|days)/);
        if (daysMatch) {
          const days = parseInt(daysMatch[1]);
          const date = new Date();
          date.setDate(date.getDate() - days);
          return date;
        }
        const weeksMatch = lowerText.match(/(\d+)\s*(week|weeks)/);
        if (weeksMatch) {
          const weeks = parseInt(weeksMatch[1]);
          const date = new Date();
          date.setDate(date.getDate() - weeks * 7);
          return date;
        }
      }

      // Try to parse as ISO date
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    } catch {
      // Ignore parsing errors
    }

    return undefined;
  }

  /**
   * Parse salary from text
   */
  static parseSalary(salaryText?: string): { min?: number; max?: number; currency?: string } | undefined {
    if (!salaryText) return undefined;

    // Extract numbers from salary text (e.g., "€30,000 - €50,000" or "30k-50k")
    const numbers = salaryText.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) return undefined;

    const cleanNumbers = numbers.map((n) => parseInt(n.replace(/,/g, '')));
    const currency = salaryText.match(/[€$£]/)?.[0] || 'EUR';

    return {
      min: cleanNumbers[0],
      max: cleanNumbers.length > 1 ? cleanNumbers[1] : cleanNumbers[0],
      currency: currency === '€' ? 'EUR' : currency === '$' ? 'USD' : currency === '£' ? 'GBP' : 'EUR',
    };
  }
}


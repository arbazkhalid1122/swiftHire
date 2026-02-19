import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';

interface IndeedRSSItem {
  title?: string | { _text?: string };
  link?: string | { _text?: string };
  description?: string | { _text?: string };
  pubDate?: string | { _text?: string };
  guid?: string | { _text?: string };
  'job:location'?: string | { _text?: string };
  'job:company'?: string | { _text?: string };
  'job:salary'?: string | { _text?: string };
}

interface IndeedRSSFeed {
  rss?: {
    channel?: {
      item?: IndeedRSSItem[];
    };
  };
}

export class IndeedFeedParser {
  /**
   * Parse Indeed RSS feed URL and extract job parameters
   */
  static parseIndeedURL(url: string): { query?: string; location?: string; radius?: string; jobType?: string } {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        query: params.get('q') || undefined,
        location: params.get('l') || undefined,
        radius: params.get('radius') || undefined,
        jobType: params.get('jt') || undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * Build Indeed RSS feed URL from parameters
   */
  static buildIndeedURL(params: {
    query?: string;
    location?: string;
    radius?: number;
    jobType?: string;
  }): string {
    const baseURL = 'https://www.indeed.com/rss';
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.set('q', params.query);
    if (params.location) searchParams.set('l', params.location);
    if (params.radius) searchParams.set('radius', params.radius.toString());
    if (params.jobType) searchParams.set('jt', params.jobType);

    return `${baseURL}?${searchParams.toString()}`;
  }

  /**
   * Fetch and parse Indeed RSS feed
   */
  static async fetchIndeedJobs(
    feedURL: string,
    scrapingBeeOptions?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
      premiumProxy?: boolean;
      stealthProxy?: boolean;
    },
    useScrapingBeeOnly: boolean = false
  ): Promise<Array<{
    title: string;
    description: string;
    location?: string;
    company?: string;
    salary?: string;
    externalUrl?: string;
    externalId?: string;
    publishedDate?: Date;
  }>> {
    try {
      // If ScrapingBee is enabled, use it directly (skip regular fetch and Puppeteer)
      if (useScrapingBeeOnly && scrapingBeeOptions) {
        console.log('Using ScrapingBee only for Indeed RSS feed...');
        try {
          const xmlText = await this.fetchWithScrapingBee(feedURL, scrapingBeeOptions);
          return this.parseXMLFeed(xmlText);
        } catch (scrapingBeeError: any) {
          // If RSS feed fails (404, 500, or any error), try scraping the search page instead
          const is404 = scrapingBeeError.is404 || scrapingBeeError.message.includes('404') || scrapingBeeError.message.includes('Not Found');
          const is500 = scrapingBeeError.is500 || scrapingBeeError.message.includes('500') || scrapingBeeError.message.includes('INTERNAL SERVER ERROR');
          
          if (is404 || is500) {
            const reason = is404 ? 'not available (404)' : 'server error (500)';
            console.log(`Indeed RSS feed ${reason}. Falling back to scraping search page HTML...`);
            try {
              // Convert RSS URL to search page URL
              const searchURL = this.convertRSSToSearchURL(feedURL);
              const htmlJobs = await this.scrapeSearchPageWithScrapingBee(searchURL, scrapingBeeOptions);
              // Return jobs directly (already in the correct format)
              return htmlJobs;
            } catch (searchPageError: any) {
              console.error('Search page scraping failed:', searchPageError.message);
              throw new Error(`Indeed RSS feed ${reason} and search page scraping failed: ${searchPageError.message}`);
            }
          }
          
          // For other errors, still try fallback before giving up
          console.log('Indeed RSS feed fetch failed. Falling back to scraping search page HTML...');
          try {
            const searchURL = this.convertRSSToSearchURL(feedURL);
            const htmlJobs = await this.scrapeSearchPageWithScrapingBee(searchURL, scrapingBeeOptions);
            return htmlJobs;
          } catch (searchPageError: any) {
            console.error('Search page scraping also failed:', searchPageError.message);
            throw new Error(`ScrapingBee failed to fetch Indeed RSS feed: ${scrapingBeeError.message}. Search page fallback also failed: ${searchPageError.message}`);
          }
        }
      }

      // Otherwise, try regular fetch first
      // Always use www.indeed.com for referer (more reliable)
      // Country-specific domains may have different protections
      const refererDomain = 'https://www.indeed.com/';
      
      // Fetch RSS feed with proper headers to avoid 403
      const response = await fetch(feedURL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': refererDomain,
          'Origin': refererDomain.replace(/\/$/, ''),
          'Connection': 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        // Add redirect handling
        redirect: 'follow',
      });

      if (!response.ok) {
        // If 403 or blocked, try ScrapingBee first (if configured), then Puppeteer
        if (response.status === 403 || response.status === 429) {
          // Try ScrapingBee if configured (either explicitly or if API key exists)
          const { ScrapingBee } = await import('./scrapingBee');
          const scrapingBeeAvailable = scrapingBeeOptions || ScrapingBee.isConfigured();
          
          if (scrapingBeeAvailable) {
            console.warn(`Indeed returned ${response.status}, trying with ScrapingBee...`);
            try {
              // Use provided options or default options if ScrapingBee is configured
              const options = scrapingBeeOptions || {
                renderJs: true,
                wait: 2000,
              };
              const xmlText = await this.fetchWithScrapingBee(feedURL, options);
              return this.parseXMLFeed(xmlText);
            } catch (scrapingBeeError: any) {
              console.warn('ScrapingBee RSS fetch failed, trying search page fallback:', scrapingBeeError.message);
              
              // If RSS feed fails, try scraping the search page HTML instead
              try {
                const searchURL = this.convertRSSToSearchURL(feedURL);
                const options = scrapingBeeOptions || {
                  renderJs: true,
                  wait: 3000,
                  premiumProxy: true, // Use premium proxy for better success rate
                };
                const htmlJobs = await this.scrapeSearchPageWithScrapingBee(searchURL, options);
                console.log(`Successfully scraped ${htmlJobs.length} jobs from search page HTML`);
                return htmlJobs;
              } catch (searchPageError: any) {
                console.warn('Search page scraping also failed:', searchPageError.message);
                // Continue to Puppeteer fallback if not using ScrapingBee only
                if (!useScrapingBeeOnly) {
                  console.warn('Trying Puppeteer as last resort...');
                } else {
                  throw new Error(`Indeed RSS feed returned ${response.status}. ScrapingBee failed: ${scrapingBeeError.message}. Search page also failed: ${searchPageError.message}`);
                }
              }
            }
          }
          
          // Fallback to Puppeteer (only if ScrapingBee is not enabled or not configured)
          if (!useScrapingBeeOnly) {
            console.warn(`Indeed returned ${response.status}, trying with Puppeteer (real browser)...`);
            try {
              const xmlText = await this.fetchWithPuppeteer(feedURL);
              return this.parseXMLFeed(xmlText);
            } catch (puppeteerError: any) {
              console.error('Puppeteer fetch also failed:', puppeteerError);
              const errorMsg = scrapingBeeAvailable
                ? `Indeed RSS feed returned ${response.status}. ScrapingBee and Puppeteer both failed. This may be due to rate limiting or access restrictions.`
                : `Indeed RSS feed returned ${response.status}. All fallback methods failed: ${puppeteerError.message}. This may be due to rate limiting or access restrictions. Try enabling ScrapingBee for better reliability.`;
              throw new Error(errorMsg);
            }
          } else {
            throw new Error(`Indeed RSS feed returned ${response.status}. ScrapingBee is enabled but failed. Please check your ScrapingBee settings.`);
          }
        }
        
        throw new Error(`HTTP error! status: ${response.status}. ${response.status === 403 ? 'Indeed may be blocking the request. Try again later or enable ScrapingBee.' : ''}`);
      }

      const xmlText = await response.text();
      return this.parseXMLFeed(xmlText);
    } catch (error) {
      console.error('Error fetching Indeed RSS feed:', error);
      throw error;
    }
  }

  /**
   * Fetch RSS feed using ScrapingBee (bypasses Cloudflare)
   */
  private static async fetchWithScrapingBee(
    feedURL: string,
    options?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
      premiumProxy?: boolean;
      stealthProxy?: boolean;
    }
  ): Promise<string> {
    const { ScrapingBee } = await import('./scrapingBee');
    
    if (!ScrapingBee.isConfigured()) {
      throw new Error('ScrapingBee is not configured. Please set SCRAPINGBEE_API_KEY in your environment variables.');
    }

    try {
      console.log('Fetching Indeed RSS feed using ScrapingBee...');
      
      // For RSS feeds, we typically don't need JS rendering, but use it if specified
      const html = options?.renderJs
        ? await ScrapingBee.fetchWithJS(feedURL, {
            countryCode: options?.countryCode,
            wait: options?.wait || 2000,
            premiumProxy: options?.premiumProxy,
            stealthProxy: options?.stealthProxy,
          })
        : await ScrapingBee.fetch(feedURL, {
            countryCode: options?.countryCode,
            wait: options?.wait,
            premiumProxy: options?.premiumProxy,
            stealthProxy: options?.stealthProxy,
          });

      // Check if we got an HTML error page instead of XML
      if (html.includes('<!DOCTYPE html') || html.includes('<html')) {
        // Check for common error indicators
        if (html.includes('404') || html.includes('Not Found') || html.includes("We can't find this page")) {
          throw new Error(`Indeed RSS feed returned 404 Not Found. The RSS feed URL may be invalid or Indeed may not provide RSS feeds for this query. URL: ${feedURL}`);
        }
        if (html.includes('403') || html.includes('Forbidden') || html.includes('Access Denied')) {
          throw new Error(`Indeed RSS feed returned 403 Forbidden. The feed may be blocked or require authentication. URL: ${feedURL}`);
        }
        // Generic HTML error
        throw new Error(`Indeed returned an HTML page instead of RSS feed. The feed may not exist or be blocked. URL: ${feedURL}`);
      }

      // Extract XML from response
      if (html.includes('<?xml')) {
        const xmlMatch = html.match(/<\?xml[\s\S]*$/);
        if (xmlMatch) {
          return xmlMatch[0];
        }
      }

      // If wrapped in HTML, try to extract
      if (html.includes('<rss') || html.includes('<feed')) {
        const rssMatch = html.match(/<(rss|feed)[\s\S]*$/);
        if (rssMatch) {
          return rssMatch[0];
        }
      }

      // If we still have HTML, it's likely an error page
      if (html.includes('<!DOCTYPE') || html.includes('<html')) {
        throw new Error(`Indeed returned an HTML page instead of RSS feed. The RSS feed may not exist for this query. URL: ${feedURL}`);
      }

      return html;
    } catch (error: any) {
      // Only log errors that aren't expected 404/500 (which trigger fallbacks)
      if (!error.is404 && !error.is500 && !error.message?.includes('404') && !error.message?.includes('500')) {
        console.error('ScrapingBee fetch failed:', error.message);
      }
      throw error;
    }
  }

  /**
   * Convert RSS feed URL to search page URL
   */
  private static convertRSSToSearchURL(rssURL: string): string {
    try {
      const urlObj = new URL(rssURL);
      const params = urlObj.searchParams;
      
      // Build search page URL
      const searchParams = new URLSearchParams();
      const query = params.get('q');
      const location = params.get('l');
      
      if (query) searchParams.set('q', query);
      if (location) searchParams.set('l', location);
      
      return `https://www.indeed.com/jobs?${searchParams.toString()}`;
    } catch (error) {
      // If URL parsing fails, return a basic search URL
      return 'https://www.indeed.com/jobs';
    }
  }

  /**
   * Scrape Indeed search page HTML using ScrapingBee (fallback when RSS fails)
   */
  private static async scrapeSearchPageWithScrapingBee(
    searchURL: string,
    options?: {
      renderJs?: boolean;
      countryCode?: string;
      wait?: number;
    }
  ): Promise<Array<{
    title: string;
    description: string;
    location?: string;
    company?: string;
    salary?: string;
    externalUrl?: string;
    externalId?: string;
    publishedDate?: Date;
  }>> {
    const { ScrapingBee } = await import('./scrapingBee');
    
    if (!ScrapingBee.isConfigured()) {
      throw new Error('ScrapingBee is not configured. Please set SCRAPINGBEE_API_KEY in your environment variables.');
    }

    try {
      console.log('Scraping Indeed search page using ScrapingBee (RSS feed not available)...');
      
      // Search pages require JS rendering
      // For Indeed, try premium_proxy first (cost-effective), then stealth_proxy, then regular
      let html: string;
      try {
        // Try premium proxy first (cost-effective: 10-25 credits)
        console.log('Trying with premium_proxy (cost-effective)...');
        html = await ScrapingBee.fetchWithJS(searchURL, {
          countryCode: options?.countryCode,
          wait: options?.wait || 3000,
          premiumProxy: true,
          blockResources: false,
        });
      } catch (premiumError: any) {
        console.warn('Premium proxy failed, trying stealth_proxy (best success rate)...');
        try {
          // Fallback to stealth proxy (best success rate: 75 credits)
          html = await ScrapingBee.fetchWithJS(searchURL, {
            countryCode: options?.countryCode,
            wait: options?.wait || 3000,
            stealthProxy: true,
            blockResources: false,
          });
        } catch (stealthError: any) {
          // Last resort: try without premium/stealth
          console.warn('Stealth proxy also failed, trying regular proxy...');
          html = await ScrapingBee.fetchWithJS(searchURL, {
            countryCode: options?.countryCode,
            wait: options?.wait || 3000,
            blockResources: false,
          });
        }
      }

      // Parse jobs from HTML
      return this.parseJobsFromHTML(html);
    } catch (error: any) {
      console.error('ScrapingBee search page scraping failed:', error);
      throw error;
    }
  }

  /**
   * Parse jobs from HTML (when RSS feed is not available)
   */
  private static parseJobsFromHTML(html: string): Array<{
    title: string;
    description: string;
    location?: string;
    company?: string;
    salary?: string;
    externalUrl?: string;
    externalId?: string;
    publishedDate?: Date;
  }> {
    const $ = cheerio.load(html);
    const jobs: Array<{
      title: string;
      description: string;
      location?: string;
      company?: string;
      salary?: string;
      externalUrl?: string;
      externalId?: string;
      publishedDate?: Date;
    }> = [];

    // Indeed search page selectors (may vary, these are common patterns)
    const jobSelectors = [
      'div[data-jk]',
      'div.job_seen_beacon',
      'a[data-jk]',
      'div[class*="job"]',
      'div[class*="result"]',
    ];

    let jobElements: any = null;
    for (const selector of jobSelectors) {
      const elements = $(selector);
      if (elements.length > 0) {
        jobElements = elements;
        console.log(`Found ${elements.length} jobs using selector: ${selector}`);
        break;
      }
    }

    if (!jobElements || jobElements.length === 0) {
      console.warn('No job listings found in HTML. Indeed may have changed their HTML structure.');
      return jobs;
    }

    jobElements.each((index: number, element: any) => {
      try {
        const $job = $(element);
        
        // Extract job ID
        const jobId = $job.attr('data-jk') || $job.find('[data-jk]').first().attr('data-jk');
        
        // Extract title
        const title = $job.find('h2.jobTitle a, a[data-jk] span[title], h2 a span[title], .jobTitle span').first().text().trim() ||
                     $job.find('h2, h3, .title').first().text().trim();
        
        // Extract company
        const company = $job.find('.companyName, [data-testid="company-name"], .company').first().text().trim();
        
        // Extract location
        const location = $job.find('.companyLocation, [data-testid="text-location"], .location').first().text().trim();
        
        // Extract description/snippet
        const description = $job.find('.job-snippet, .summary, .job-snippet-container').first().text().trim() ||
                          $job.find('ul li').first().text().trim() ||
                          `Job posting for ${title}${company ? ` at ${company}` : ''}${location ? ` in ${location}` : ''}. Please visit the original listing for full details.`;
        
        // Extract salary
        const salary = $job.find('.salary-snippet, .salary, [data-testid="attribute_snippet_testid"]').first().text().trim();
        
        // Extract link
        let externalUrl: string | undefined;
        const linkElement = $job.find('h2.jobTitle a, a[data-jk]').first();
        const href = linkElement.attr('href');
        if (href) {
          externalUrl = href.startsWith('http') ? href : `https://www.indeed.com${href}`;
        } else if (jobId) {
          externalUrl = `https://www.indeed.com/viewjob?jk=${jobId}`;
        }

        if (title) {
          jobs.push({
            title: this.cleanText(title),
            description: this.cleanText(description) || `Job posting for ${this.cleanText(title)}. Please visit the original listing for full details.`,
            location: location ? this.cleanText(location) : undefined,
            company: company ? this.cleanText(company) : undefined,
            salary: salary ? this.cleanText(salary) : undefined,
            externalUrl,
            externalId: jobId,
            publishedDate: undefined,
          });
        }
      } catch (error) {
        console.error('Error parsing Indeed job from HTML:', error);
      }
    });

    console.log(`Parsed ${jobs.length} jobs from Indeed search page HTML`);
    return jobs;
  }

  /**
   * Fetch RSS feed using Puppeteer (real browser)
   */
  private static async fetchWithPuppeteer(feedURL: string): Promise<string> {
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
      
      // Set realistic browser headers
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.indeed.com/',
      });
      
      // Intercept the response to get raw XML
      let xmlText = '';
      const responseHandler = async (response: any) => {
        const responseUrl = response.url();
        if (responseUrl === feedURL || responseUrl.includes('indeed.com/rss') || responseUrl.includes('/rss')) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('xml') || contentType.includes('rss') || responseUrl.includes('rss')) {
              const text = await response.text();
              if (text && (text.includes('<?xml') || text.includes('<rss'))) {
                xmlText = text;
                console.log('Got XML from response interceptor');
              }
            }
          } catch (e) {
            console.warn('Could not get response text:', e);
          }
        }
      };
      
      page.on('response', responseHandler);
      
      // Navigate to RSS feed
      await page.goto(feedURL, { 
        waitUntil: 'networkidle2', 
        timeout: 30000 
      });
      
      // Wait a bit for content to load
      await page.waitForTimeout(2000);
      
      // Check if we got blocked or got an error page
      let pageTitle = await page.title();
      let pageUrl = page.url();
      
      console.log('Puppeteer page title:', pageTitle);
      console.log('Puppeteer page URL:', pageUrl);
      
      // Check for Cloudflare challenge
      if (pageTitle.includes('Just a moment') || pageTitle.includes('challenge') || pageTitle.includes('Checking your browser')) {
        console.log('Detected Cloudflare challenge on Indeed, waiting for it to complete...');
        
        try {
          // Wait for the challenge to complete
          await page.waitForFunction(
            () => {
              const title = document.title;
              return title !== 'Just a moment...' && 
                     !title.includes('challenge') && 
                     !title.includes('Checking your browser');
            },
            { timeout: 20000 }
          );
          
          pageTitle = await page.title();
          if (!pageTitle.includes('Just a moment')) {
            console.log('Cloudflare challenge completed');
            await page.waitForTimeout(2000);
          }
        } catch (error) {
          console.warn('Cloudflare challenge timeout');
        }
        
        // Check again after waiting
        pageTitle = await page.title();
        if (pageTitle.includes('Just a moment') || pageTitle.includes('challenge')) {
          await browser.close();
          throw new Error(
            'Indeed RSS feed is blocked by Cloudflare. ' +
            'Country-specific Indeed sites (like pk.indeed.com) may have Cloudflare protection. ' +
            'Try using www.indeed.com instead, or add location parameter to the query.'
          );
        }
      }
      
      // If we didn't get XML from response interceptor, try getting it from page
      if (!xmlText) {
        // For RSS feeds, try to get the raw XML from the page
        xmlText = await page.evaluate(() => {
          // Try to get XML content from pre tag or body
          const pre = document.querySelector('pre');
          if (pre) return pre.textContent || '';
          
          // Check if body contains XML
          const bodyText = document.body?.textContent || '';
          if (bodyText.includes('<?xml') || bodyText.includes('<rss')) {
            return bodyText;
          }
          
          // Otherwise get full HTML and try to extract XML
          return document.documentElement?.outerHTML || '';
        });
      }
      
      await browser.close();
      
      // Validate that we got XML
      if (!xmlText || xmlText.length === 0) {
        throw new Error('Puppeteer did not retrieve any XML content from Indeed RSS feed');
      }
      
      // Check if we got an HTML error page instead of XML
      if (xmlText.includes('<!DOCTYPE html') && !xmlText.includes('<?xml')) {
        console.error('Got HTML page instead of XML. Page might be blocked or redirected.');
        throw new Error('Indeed returned an HTML page instead of RSS feed. The feed may be blocked or require authentication.');
      }
      
      // Clean up XML if it's wrapped in HTML
      if (xmlText.includes('<?xml')) {
        const xmlMatch = xmlText.match(/<\?xml[\s\S]*$/);
        if (xmlMatch) {
          xmlText = xmlMatch[0];
        }
      }
      
      // Validate XML structure
      if (!xmlText.includes('<rss') && !xmlText.includes('<feed')) {
        console.error('Retrieved content does not appear to be a valid RSS/XML feed');
        console.log('Content preview:', xmlText.substring(0, 500));
        throw new Error('Indeed RSS feed did not return valid XML. The feed may be blocked or the URL may be incorrect.');
      }
      
      console.log('Successfully retrieved XML feed, length:', xmlText.length);
      return xmlText;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error fetching Indeed RSS feed with Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Parse XML feed content
   */
  private static parseXMLFeed(xmlText: string): Array<{
    title: string;
    description: string;
    location?: string;
    company?: string;
    salary?: string;
    externalUrl?: string;
    externalId?: string;
    publishedDate?: Date;
  }> {
    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text',
      parseAttributeValue: true,
    });

    const parsed: IndeedRSSFeed = parser.parse(xmlText);

    const jobs: Array<{
      title: string;
      description: string;
      location?: string;
      company?: string;
      salary?: string;
      externalUrl?: string;
      externalId?: string;
      publishedDate?: Date;
    }> = [];

    const items = parsed.rss?.channel?.item;
    if (!items) {
      return jobs;
    }

    // Handle both array and single item
    const itemsArray = Array.isArray(items) ? items : [items];

    for (const item of itemsArray) {
      try {
        const title: string = typeof item.title === 'object' && item.title !== null && '_text' in item.title 
          ? (item.title._text || '')
          : (typeof item.title === 'string' ? item.title : '');
        const description: string = typeof item.description === 'object' && item.description !== null && '_text' in item.description
          ? (item.description._text || '')
          : (typeof item.description === 'string' ? item.description : '');
        const link: string = typeof item.link === 'object' && item.link !== null && '_text' in item.link
          ? (item.link._text || '')
          : (typeof item.link === 'string' ? item.link : '');
        const location: string = typeof item['job:location'] === 'object' && item['job:location'] !== null && '_text' in item['job:location']
          ? (item['job:location']._text || '')
          : (typeof item['job:location'] === 'string' ? item['job:location'] : '');
        const company: string = typeof item['job:company'] === 'object' && item['job:company'] !== null && '_text' in item['job:company']
          ? (item['job:company']._text || '')
          : (typeof item['job:company'] === 'string' ? item['job:company'] : '');
        const salary: string = typeof item['job:salary'] === 'object' && item['job:salary'] !== null && '_text' in item['job:salary']
          ? (item['job:salary']._text || '')
          : (typeof item['job:salary'] === 'string' ? item['job:salary'] : '');
        const pubDate: string | undefined = typeof item.pubDate === 'object' && item.pubDate !== null && '_text' in item.pubDate
          ? item.pubDate._text
          : (typeof item.pubDate === 'string' ? item.pubDate : undefined);

        if (!title || !description) {
          continue;
        }

        // Extract job ID from Indeed URL
        const jobId = this.extractJobIdFromURL(link);

        jobs.push({
          title: this.cleanText(title),
          description: this.cleanText(description),
          location: location ? this.cleanText(location) : undefined,
          company: company ? this.cleanText(company) : undefined,
          salary: salary ? this.cleanText(salary) : undefined,
          externalUrl: link || undefined,
          externalId: jobId,
          publishedDate: pubDate ? new Date(pubDate) : undefined,
        });
      } catch (error) {
        console.error('Error parsing Indeed RSS item:', error);
      }
    }

    return jobs;
  }

  /**
   * Extract job ID from Indeed URL
   */
  private static extractJobIdFromURL(url: string): string | undefined {
    try {
      // Indeed URLs typically have format: https://www.indeed.com/viewjob?jk={jobId}
      const match = url.match(/[?&]jk=([^&]+)/);
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
   * Parse salary from Indeed salary string
   */
  static parseSalary(salaryText?: string): { min?: number; max?: number; currency?: string } | undefined {
    if (!salaryText) return undefined;

    // Indeed salary formats: "$50,000 - $70,000 a year", "$30 an hour", etc.
    const numbers = salaryText.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) return undefined;

    const cleanNumbers = numbers.map(n => parseInt(n.replace(/,/g, '')));
    const currency = salaryText.match(/[€$£]/)?.[0] || '$';

    return {
      min: cleanNumbers[0],
      max: cleanNumbers.length > 1 ? cleanNumbers[1] : cleanNumbers[0],
      currency: currency === '€' ? 'EUR' : currency === '$' ? 'USD' : currency === '£' ? 'GBP' : 'USD',
    };
  }
}


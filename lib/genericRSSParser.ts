import { XMLParser } from 'fast-xml-parser';
import puppeteer from 'puppeteer';

interface RSSJob {
  title: string;
  description: string;
  location?: string;
  company?: string;
  salary?: string;
  externalUrl?: string;
  externalId?: string;
  publishedDate?: Date;
}

export class GenericRSSParser {
  /**
   * Parse any RSS/XML feed and extract jobs
   */
  static async parseRSSFeed(feedURL: string, usePuppeteer: boolean = false): Promise<RSSJob[]> {
    try {
      let xmlText: string;

      if (usePuppeteer) {
        // Use Puppeteer if regular fetch fails (e.g., Cloudflare protection)
        xmlText = await this.fetchWithPuppeteer(feedURL);
      } else {
        xmlText = await this.fetchWithFetch(feedURL);
      }

      return this.parseXML(xmlText, feedURL);
    } catch (error) {
      console.error('Error parsing RSS feed:', error);
      throw error;
    }
  }

  /**
   * Fetch RSS feed using regular fetch
   */
  private static async fetchWithFetch(feedURL: string): Promise<string> {
    const response = await fetch(feedURL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      // If 403 or other error, try with Puppeteer
      if (response.status === 403 || response.status === 429) {
        console.log('Fetch failed, trying with Puppeteer...');
        return this.fetchWithPuppeteer(feedURL);
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Fetch RSS feed using Puppeteer (for sites with bot protection)
   */
  private static async fetchWithPuppeteer(feedURL: string): Promise<string> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      await page.goto(feedURL, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for content
      await page.waitForTimeout(2000);

      const content = await page.content();
      await browser.close();

      // Extract XML from HTML if wrapped
      if (content.includes('<?xml')) {
        const xmlMatch = content.match(/<\?xml[\s\S]*$/);
        if (xmlMatch) {
          return xmlMatch[0];
        }
      }

      return content;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      console.error('Error fetching RSS with Puppeteer:', error);
      throw error;
    }
  }

  /**
   * Parse XML content and extract jobs
   */
  private static parseXML(xmlText: string, feedURL: string): RSSJob[] {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: '_text',
      parseAttributeValue: true,
    });

    const parsed: any = parser.parse(xmlText);
    const jobs: RSSJob[] = [];

    // Handle different RSS feed structures
    let items: any[] = [];

    // Standard RSS structure
    if (parsed.rss?.channel?.item) {
      items = Array.isArray(parsed.rss.channel.item) 
        ? parsed.rss.channel.item 
        : [parsed.rss.channel.item];
    }
    // Atom feed structure
    else if (parsed.feed?.entry) {
      items = Array.isArray(parsed.feed.entry) 
        ? parsed.feed.entry 
        : [parsed.feed.entry];
    }
    // Alternative structures
    else if (parsed.channel?.item) {
      items = Array.isArray(parsed.channel.item) 
        ? parsed.channel.item 
        : [parsed.channel.item];
    }

    for (const item of items) {
      try {
        // Extract title
        const title = this.extractText(item, ['title', 'job:title', 'dc:title']);
        
        // Extract description
        const description = this.extractText(item, [
          'description', 
          'job:description', 
          'content', 
          'content:encoded',
          'summary',
          'dc:description'
        ]);

        // Extract link
        const link = this.extractText(item, ['link', 'job:link', 'guid']);
        const externalUrl = link || undefined;

        // Extract location
        const location = this.extractText(item, [
          'location',
          'job:location',
          'geo:location',
          'city',
          'job:city'
        ]);

        // Extract company
        const company = this.extractText(item, [
          'company',
          'job:company',
          'employer',
          'dc:creator'
        ]);

        // Extract salary
        const salary = this.extractText(item, [
          'salary',
          'job:salary',
          'compensation'
        ]);

        // Extract published date
        let publishedDate: Date | undefined;
        const dateText = this.extractText(item, [
          'pubDate',
          'published',
          'dc:date',
          'updated',
          'job:date'
        ]);
        if (dateText) {
          publishedDate = new Date(dateText);
          if (isNaN(publishedDate.getTime())) {
            publishedDate = undefined;
          }
        }

        // Extract ID
        const externalId = this.extractIdFromURL(externalUrl || '', feedURL);

        if (title && description) {
          jobs.push({
            title: this.cleanText(title),
            description: this.cleanText(description),
            location: location ? this.cleanText(location) : undefined,
            company: company ? this.cleanText(company) : undefined,
            salary: salary ? this.cleanText(salary) : undefined,
            externalUrl,
            externalId,
            publishedDate,
          });
        }
      } catch (error) {
        console.error('Error parsing RSS item:', error);
      }
    }

    return jobs;
  }

  /**
   * Extract text from item using multiple possible field names
   */
  private static extractText(item: any, fieldNames: string[]): string {
    for (const fieldName of fieldNames) {
      const value = item[fieldName];
      if (value) {
        if (typeof value === 'string') {
          return value;
        }
        if (value._text) {
          return value._text;
        }
        if (Array.isArray(value) && value.length > 0) {
          const first = value[0];
          return typeof first === 'string' ? first : first._text || '';
        }
      }
    }
    return '';
  }

  /**
   * Extract job ID from URL
   */
  private static extractIdFromURL(url: string, feedURL: string): string | undefined {
    if (!url) return undefined;

    try {
      // Try to extract ID from URL patterns
      const patterns = [
        /[?&]id=([^&]+)/,
        /[?&]jk=([^&]+)/, // Indeed
        /\/([^\/]+)\/?$/,
        /[?&]jobId=([^&]+)/,
      ];

      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      // Use full URL as ID if no pattern matches
      return url;
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
      .replace(/&nbsp;/g, ' ')
      .replace(/&#8217;/g, "'")
      .replace(/&#8211;/g, '-')
      .replace(/&#8212;/g, '—');

    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
  }

  /**
   * Build RSS feed URLs for common job boards
   */
  static buildRSSURL(source: 'indeed' | 'glassdoor' | 'monster' | 'careerbuilder', params: {
    query?: string;
    location?: string;
    [key: string]: any;
  }): string {
    const baseURLs = {
      indeed: 'https://www.indeed.com/rss',
      glassdoor: 'https://www.glassdoor.com/Job/rss.htm',
      monster: 'https://rss.monster.com/rss',
      careerbuilder: 'https://www.careerbuilder.com/rss',
    };

    const baseURL = baseURLs[source];
    const searchParams = new URLSearchParams();

    switch (source) {
      case 'indeed':
        if (params.query) searchParams.set('q', params.query);
        if (params.location) searchParams.set('l', params.location);
        if (params.radius) searchParams.set('radius', params.radius);
        if (params.jobType) searchParams.set('jt', params.jobType);
        return `${baseURL}?${searchParams.toString()}`;

      case 'glassdoor':
        if (params.query) searchParams.set('q', params.query);
        if (params.location) searchParams.set('l', params.location);
        return `${baseURL}?${searchParams.toString()}`;

      case 'monster':
        if (params.query) searchParams.set('q', params.query);
        if (params.location) searchParams.set('where', params.location);
        return `${baseURL}?${searchParams.toString()}`;

      case 'careerbuilder':
        if (params.query) searchParams.set('keywords', params.query);
        if (params.location) searchParams.set('location', params.location);
        return `${baseURL}?${searchParams.toString()}`;

      default:
        return baseURL;
    }
  }
}


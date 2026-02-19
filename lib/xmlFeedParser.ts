/**
 * XML Feed Parser
 * 
 * Parses XML job feeds from partners like Adecco, Randstad, etc.
 * Supports the standard XML structure with <source> and <job> elements.
 */

import { ScrapingBee } from './scrapingBee';
import { XMLParser } from 'fast-xml-parser';

export interface XMLJob {
  title: string;
  description: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    raw?: string;
  };
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship';
  externalUrl?: string;
  externalId?: string; // referencenumber
  company?: string;
  date?: string;
  education?: string;
  category?: string;
  rawData?: any; // Store raw XML data for reference
}

export interface XMLFeedOptions {
  useScrapingBee?: boolean;
  scrapingBeeOptions?: {
    renderJs?: boolean;
    countryCode?: string;
    wait?: number;
  };
}

export class XMLFeedParser {
  /**
   * Fetch and parse XML feed from URL
   */
  static async fetchXMLFeed(
    feedUrl: string,
    options?: XMLFeedOptions
  ): Promise<XMLJob[]> {
    try {
      let xmlContent: string;

      // Fetch XML content
      if (options?.useScrapingBee) {
        console.log('Fetching XML feed using ScrapingBee:', feedUrl);
        const response = await ScrapingBee.fetch(
          feedUrl,
          {
            renderJs: options.scrapingBeeOptions?.renderJs || false,
            countryCode: options.scrapingBeeOptions?.countryCode,
            wait: options.scrapingBeeOptions?.wait,
          }
        );
        xmlContent = response;
      } else {
        console.log('Fetching XML feed directly:', feedUrl);
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/xml, text/xml, */*',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch XML feed: ${response.status} ${response.statusText}`);
        }

        xmlContent = await response.text();
      }

      // Parse XML
      return await this.parseXML(xmlContent);
    } catch (error: any) {
      console.error('Error fetching XML feed:', error);
      throw new Error(`Failed to fetch XML feed: ${error.message}`);
    }
  }

  /**
   * Parse XML content string into job objects
   */
  static async parseXML(xmlContent: string): Promise<XMLJob[]> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '',
        textNodeName: '_text',
        parseAttributeValue: true,
        trimValues: true,
      });

      const parsed = parser.parse(xmlContent);
      const jobs = this.extractJobsFromXML(parsed);
      return jobs;
    } catch (error: any) {
      console.error('XML parsing error:', error);
      throw new Error(`Failed to parse XML: ${error.message}`);
    }
  }

  /**
   * Extract jobs from parsed XML structure
   */
  static extractJobsFromXML(xmlData: any): XMLJob[] {
    const jobs: XMLJob[] = [];

    // Handle different XML structures
    let jobNodes: any[] = [];

    // Structure 1: <source><job>...</job></source>
    if (xmlData.source?.job) {
      jobNodes = Array.isArray(xmlData.source.job) 
        ? xmlData.source.job 
        : [xmlData.source.job];
    }
    // Structure 2: <rss><channel><item>...</item></channel></rss> (RSS format)
    else if (xmlData.rss?.channel?.item) {
      jobNodes = Array.isArray(xmlData.rss.channel.item)
        ? xmlData.rss.channel.item
        : [xmlData.rss.channel.item];
    }
    // Structure 3: <jobs><job>...</job></jobs>
    else if (xmlData.jobs?.job) {
      jobNodes = Array.isArray(xmlData.jobs.job)
        ? xmlData.jobs.job
        : [xmlData.jobs.job];
    }
    // Structure 4: Direct array of jobs
    else if (Array.isArray(xmlData.job)) {
      jobNodes = xmlData.job;
    }
    else if (xmlData.job) {
      jobNodes = [xmlData.job];
    }

    for (const jobNode of jobNodes) {
      try {
        const job = this.parseJobNode(jobNode);
        if (job.title && job.description) {
          jobs.push(job);
        }
      } catch (error: any) {
        console.warn('Error parsing job node:', error.message, jobNode);
        // Continue with next job
      }
    }

    console.log(`Extracted ${jobs.length} jobs from XML feed`);
    return jobs;
  }

  /**
   * Parse a single job node from XML
   */
  static parseJobNode(jobNode: any): XMLJob {
    // Helper to extract text content (handles CDATA and nested structures)
    const getText = (node: any): string => {
      if (!node) return '';
      if (typeof node === 'string') return node.trim();
      if (typeof node === 'number') return String(node).trim();
      if (typeof node === 'object') {
        // Handle fast-xml-parser text node format
        if (node._text) return String(node._text).trim();
        // Handle other text formats
        if (node.text) return String(node.text).trim();
        // If it's an array, take first element
        if (Array.isArray(node) && node.length > 0) {
          return getText(node[0]);
        }
        // If object has a single string property, use it
        const keys = Object.keys(node);
        if (keys.length === 1 && typeof node[keys[0]] === 'string') {
          return String(node[keys[0]]).trim();
        }
      }
      return String(node || '').trim();
    };

    const job: XMLJob = {
      title: getText(jobNode.title || jobNode.jobtitle || jobNode.name),
      description: getText(jobNode.description || jobNode.desc || jobNode.summary || jobNode.details),
      externalId: getText(jobNode.referencenumber || jobNode.referencenumber || jobNode.id || jobNode.guid),
      externalUrl: getText(jobNode.url || jobNode.link || jobNode.joburl),
      company: getText(jobNode.company || jobNode.employer || jobNode.employername),
      date: getText(jobNode.date || jobNode.pubdate || jobNode.publisheddate),
      education: getText(jobNode.education || jobNode.qualification),
      category: getText(jobNode.category || jobNode.jobcategory),
      rawData: jobNode, // Store raw data for debugging
    };

    // Parse location (can be city, state, country separately or combined)
    const city = getText(jobNode.city);
    const state = getText(jobNode.state);
    const country = getText(jobNode.country);
    
    if (city || state || country) {
      const locationParts = [city, state, country].filter(Boolean);
      job.location = locationParts.join(', ');
      job.city = city;
      job.state = state;
      job.country = country;
    } else {
      job.location = getText(jobNode.location || jobNode.locality || jobNode.address);
    }

    // Parse salary
    const salaryText = getText(jobNode.salary || jobNode.salaryrange || jobNode.compensation);
    if (salaryText) {
      job.salary = this.parseSalary(salaryText);
      job.salary.raw = salaryText;
    }

    // Parse job type
    const jobTypeText = getText(jobNode.jobtype || jobNode.type || jobNode.employmenttype);
    if (jobTypeText) {
      job.jobType = this.determineJobType(jobTypeText);
    }

    // Ensure description is not empty (use title as fallback)
    if (!job.description || job.description.trim().length === 0) {
      job.description = job.title || 'No description available';
    }

    // Clean description: Remove external branding and links
    job.description = this.cleanDescription(job.description);

    // Ensure externalId exists (generate from URL or title if missing)
    if (!job.externalId && job.externalUrl) {
      try {
        const url = new URL(job.externalUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        job.externalId = pathParts[pathParts.length - 1] || this.generateIdFromString(job.externalUrl);
      } catch {
        job.externalId = this.generateIdFromString(job.externalUrl);
      }
    }
    if (!job.externalId) {
      job.externalId = this.generateIdFromString(job.title + job.company);
    }

    return job;
  }

  /**
   * Parse salary string into structured object
   */
  static parseSalary(salaryText: string): { min?: number; max?: number; currency?: string; raw?: string } {
    if (!salaryText) return {};

    const salary: { min?: number; max?: number; currency?: string; raw?: string } = {
      raw: salaryText,
    };

    // Extract currency (EUR, USD, GBP, etc.)
    const currencyMatch = salaryText.match(/(EUR|USD|GBP|€|\$|£)/i);
    if (currencyMatch) {
      if (currencyMatch[0] === '€' || currencyMatch[0].toUpperCase() === 'EUR') {
        salary.currency = 'EUR';
      } else if (currencyMatch[0] === '$' || currencyMatch[0].toUpperCase() === 'USD') {
        salary.currency = 'USD';
      } else if (currencyMatch[0] === '£' || currencyMatch[0].toUpperCase() === 'GBP') {
        salary.currency = 'GBP';
      } else {
        salary.currency = currencyMatch[0].toUpperCase();
      }
    } else {
      salary.currency = 'EUR'; // Default
    }

    // Extract numbers (handle ranges like "€35,000 - €40,000" or "35000-40000")
    const numberRegex = /[\d,]+/g;
    const numbers = salaryText.match(numberRegex);
    
    if (numbers && numbers.length > 0) {
      const cleanNumbers = numbers.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => !isNaN(n));
      
      if (cleanNumbers.length === 1) {
        salary.min = cleanNumbers[0];
      } else if (cleanNumbers.length >= 2) {
        salary.min = Math.min(...cleanNumbers);
        salary.max = Math.max(...cleanNumbers);
      }
    }

    return salary;
  }

  /**
   * Determine job type from text
   */
  static determineJobType(typeText: string): 'full-time' | 'part-time' | 'contract' | 'internship' {
    const lower = typeText.toLowerCase();
    
    if (lower.includes('full') || lower.includes('permanent') || lower.includes('fulltime')) {
      return 'full-time';
    }
    if (lower.includes('part') || lower.includes('parttime')) {
      return 'part-time';
    }
    if (lower.includes('contract') || lower.includes('temporary') || lower.includes('fixed-term')) {
      return 'contract';
    }
    if (lower.includes('intern') || lower.includes('stage')) {
      return 'internship';
    }
    
    return 'full-time'; // Default
  }

  /**
   * Generate a unique ID from a string (for fallback externalId)
   */
  static generateIdFromString(str: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `XML-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Clean description by removing external branding, links, and partner-specific text
   */
  static cleanDescription(description: string): string {
    if (!description) return description;

    let cleaned = description;

    // Remove common external branding phrases (case-insensitive)
    const brandingPatterns = [
      /apply\s+on\s+indeed/gi,
      /candidati\s+su\s+indeed/gi,
      /apply\s+via\s+indeed/gi,
      /indeed\.com/gi,
      /apply\s+on\s+linkedin/gi,
      /candidati\s+su\s+linkedin/gi,
      /linkedin\.com/gi,
      /apply\s+on\s+[a-z]+/gi,
      /candidati\s+su\s+[a-z]+/gi,
      /clicca\s+qui\s+per\s+candidarti/gi,
      /click\s+here\s+to\s+apply/gi,
      /applica\s+ora\s+su\s+[a-z]+/gi,
      /apply\s+now\s+on\s+[a-z]+/gi,
    ];

    brandingPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    // Remove HTML links (but keep the text if it's meaningful)
    cleaned = cleaned.replace(/<a[^>]*>([^<]*)<\/a>/gi, '$1');
    cleaned = cleaned.replace(/<a[^>]*href=["'][^"']*["'][^>]*>/gi, '');
    cleaned = cleaned.replace(/<\/a>/gi, '');

    // Remove URLs (http/https links)
    cleaned = cleaned.replace(/https?:\/\/[^\s]+/gi, '');

    // Remove email addresses that might be external
    cleaned = cleaned.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '');

    // Remove "For more information visit..." patterns
    cleaned = cleaned.replace(/for\s+more\s+information[^.]*\./gi, '');
    cleaned = cleaned.replace(/per\s+maggiori\s+informazioni[^.]*\./gi, '');
    cleaned = cleaned.replace(/visita\s+[^.]*\./gi, '');

    // Clean up multiple spaces and newlines
    cleaned = cleaned.replace(/\s+/g, ' ');
    cleaned = cleaned.replace(/\n\s*\n/g, '\n');
    cleaned = cleaned.trim();

    return cleaned;
  }
}


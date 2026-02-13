/**
 * ScrapingBee API Integration
 * 
 * ScrapingBee handles web scraping for you:
 * - Bypasses Cloudflare protection
 * - Manages proxies automatically
 * - Handles bot detection
 * - More reliable than direct scraping
 * 
 * Get your API key from: https://www.scrapingbee.com/
 */

interface ScrapingBeeOptions {
  renderJs?: boolean; // Render JavaScript (like Puppeteer)
  countryCode?: string; // Country code for proxy (e.g., 'us', 'gb')
  wait?: number; // Wait time in milliseconds before returning content
  waitFor?: string; // CSS selector to wait for
  blockAds?: boolean; // Block ads
  blockResources?: boolean; // Block images, CSS, fonts (faster)
  cookies?: string; // Cookie string to send
  premiumProxy?: boolean; // Use premium proxy (10-25 credits per request)
  stealthProxy?: boolean; // Use stealth proxy (75 credits per request)
}

export class ScrapingBee {
  private static readonly API_URL = 'https://app.scrapingbee.com/api/v1/';
  private static readonly API_KEY = process.env.SCRAPINGBEE_API_KEY;

  /**
   * Check if ScrapingBee is configured
   */
  static isConfigured(): boolean {
    return !!this.API_KEY;
  }

  /**
   * Fetch HTML content using ScrapingBee
   * 
   * @param url - URL to scrape
   * @param options - ScrapingBee options
   * @returns HTML content as string
   */
  static async fetch(url: string, options: ScrapingBeeOptions = {}): Promise<string> {
    if (!this.API_KEY) {
      throw new Error('ScrapingBee API key not configured. Please set SCRAPINGBEE_API_KEY in your environment variables.');
    }

    const params = new URLSearchParams({
      api_key: this.API_KEY,
      url: url,
    });

    // Add optional parameters (only include supported ones)
    if (options.renderJs !== undefined) {
      params.set('render_js', options.renderJs.toString());
    }
    if (options.countryCode) {
      params.set('country_code', options.countryCode);
    }
    if (options.wait) {
      params.set('wait', options.wait.toString());
    }
    if (options.waitFor) {
      params.set('wait_for', options.waitFor);
    }
    if (options.blockAds !== undefined) {
      params.set('block_ads', options.blockAds.toString());
    }
    if (options.blockResources !== undefined) {
      params.set('block_resources', options.blockResources.toString());
    }
    if (options.cookies) {
      params.set('cookies', options.cookies);
    }
    if (options.premiumProxy !== undefined) {
      params.set('premium_proxy', options.premiumProxy.toString());
    }
    if (options.stealthProxy !== undefined) {
      params.set('stealth_proxy', options.stealthProxy.toString());
    }

    try {
      console.log(`Fetching ${url} using ScrapingBee...`);
      const response = await fetch(`${this.API_URL}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

          if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `ScrapingBee API error: ${response.status} ${response.statusText}`;
            
            // Parse error JSON if available
            try {
              const errorJson = JSON.parse(errorText);
              if (errorJson.error) {
                errorMessage += ` - ${errorJson.error}`;
              }
            } catch {
              // For 404s, don't include HTML content in error message
              if (response.status !== 404) {
                errorMessage += ` - ${errorText.substring(0, 200)}`;
              }
            }
            
            // For 404 errors, create a clean error without HTML content
            if (response.status === 404) {
              const cleanError = new Error(`${errorMessage} - URL: ${url}`);
              (cleanError as any).is404 = true; // Mark as 404 for easier detection
              throw cleanError;
            }
            
            // For 500 errors, mark it for fallback handling
            if (response.status === 500) {
              const error = new Error(`${errorMessage} - URL: ${url}`);
              (error as any).is500 = true; // Mark as 500 for easier detection
              throw error;
            }
            
            throw new Error(errorMessage);
          }

      const html = await response.text();
      console.log(`Successfully fetched ${url} using ScrapingBee (${html.length} bytes)`);
      
      // Don't check for 404 in HTML content - let the caller handle it
      // Some pages may contain "404" text but still be valid
      return html;
    } catch (error: any) {
      // Only log detailed errors if it's not a 404 or 500 (expected errors that trigger fallbacks)
      if (!error.is404 && !error.is500 && !error.message?.includes('404') && !error.message?.includes('500')) {
        console.error('ScrapingBee fetch error:', error.message);
      }
      throw error; // Re-throw original error to preserve error type
    }
  }

  /**
   * Fetch HTML with JavaScript rendering (for dynamic content)
   * This is equivalent to using Puppeteer
   */
  static async fetchWithJS(url: string, options: Omit<ScrapingBeeOptions, 'renderJs'> = {}): Promise<string> {
    return this.fetch(url, {
      ...options,
      renderJs: true,
      wait: options.wait || 2000, // Default wait 2 seconds for JS to render
    });
  }

  /**
   * Fetch HTML with country-specific proxy (better success rate for regional sites)
   */
  static async fetchWithCountryProxy(url: string, countryCode: string, options: Omit<ScrapingBeeOptions, 'countryCode'> = {}): Promise<string> {
    return this.fetch(url, {
      ...options,
      countryCode: countryCode,
    });
  }

  /**
   * Fetch HTML optimized for speed (blocks resources)
   */
  static async fetchFast(url: string, options: ScrapingBeeOptions = {}): Promise<string> {
    return this.fetch(url, {
      ...options,
      blockResources: true,
      blockAds: true,
    });
  }
}


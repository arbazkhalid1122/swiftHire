/**
 * Indeed Application Submitter
 * 
 * This service handles submitting job applications to Indeed programmatically.
 * It uses Puppeteer or ScrapingBee to interact with Indeed's application form.
 * 
 * Note: This may violate Indeed's Terms of Service. Use at your own risk.
 * Consider using Indeed's official API if available.
 */

import puppeteer from 'puppeteer';
import { ScrapingBee } from './scrapingBee';

interface ApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  workExperience?: Array<{
    company: string;
    title: string;
    startDate: string;
    endDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school: string;
    degree: string;
    field?: string;
    graduationDate?: string;
  }>;
}

interface SubmitOptions {
  useScrapingBee?: boolean;
  scrapingBeeOptions?: {
    renderJs?: boolean;
    countryCode?: string;
    wait?: number;
    premiumProxy?: boolean;
    stealthProxy?: boolean;
  };
}

export class IndeedApplicationSubmitter {
  /**
   * Check if a URL is an Indeed job URL
   */
  static isIndeedURL(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.includes('indeed.com');
    } catch {
      return false;
    }
  }

  /**
   * Submit application to Indeed using Puppeteer
   */
  private static async submitWithPuppeteer(
    jobURL: string,
    applicationData: ApplicationData
  ): Promise<{ success: boolean; message: string }> {
    let browser;
    try {
      console.log('Launching Puppeteer to submit Indeed application...');
      browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();

      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      // Navigate to job page
      console.log(`Navigating to Indeed job page: ${jobURL}`);
      await page.goto(jobURL, { waitUntil: 'networkidle2', timeout: 30000 });

      // Wait for page to load
      await page.waitForTimeout(2000);

      // Check if we're on a Cloudflare challenge page
      const pageTitle = await page.title();
      if (pageTitle.includes('Just a moment') || pageTitle.includes('Checking your browser')) {
        console.log('Cloudflare challenge detected, waiting...');
        await page.waitForTimeout(5000);
      }

      // Look for "Apply now" or "Apply" button
      const applyButton = await page.evaluate(() => {
        // Try multiple selectors for the apply button (valid CSS selectors only)
        const selectors = [
          'a[data-testid="apply-button"]',
          'a[data-testid="indeedApplyButton"]',
          'a[href*="/viewjob"]',
          'button[data-testid="apply-button"]',
          '.jobsearch-JobInfoHeader-actions a',
          '.jobsearch-IndeedApplyButton',
          'a[href*="apply"]',
          'button[aria-label*="Apply"]',
          'a[aria-label*="Apply"]',
        ];

        // First, try exact selectors
        for (const selector of selectors) {
          try {
            const element = document.querySelector(selector);
            if (element) {
              return {
                selector,
                text: element.textContent?.trim(),
                href: (element as HTMLElement).getAttribute('href'),
              };
            }
          } catch (e) {
            // Invalid selector, skip
            continue;
          }
        }

        // If no exact match, search for links/buttons containing "Apply" text
        const allLinks = Array.from(document.querySelectorAll('a, button'));
        for (const element of allLinks) {
          const text = element.textContent?.trim().toLowerCase() || '';
          const ariaLabel = element.getAttribute('aria-label')?.toLowerCase() || '';
          if (text.includes('apply') || ariaLabel.includes('apply')) {
            return {
              selector: 'text-search',
              text: element.textContent?.trim(),
              href: (element as HTMLElement).getAttribute('href'),
            };
          }
        }

        return null;
      });

      if (!applyButton) {
        throw new Error('Could not find application button on Indeed job page. The page structure may have changed or you may need to apply manually.');
      }
      
      // Click the apply button
      console.log(`Found apply button: ${applyButton.text} - ${applyButton.selector}`);
      
      if (applyButton.href) {
        // If we have an href, navigate to it
        const href = applyButton.href.startsWith('http') 
          ? applyButton.href 
          : new URL(applyButton.href, jobURL).toString();
        console.log(`Navigating to apply page: ${href}`);
        await page.goto(href, { waitUntil: 'networkidle2', timeout: 30000 });
      } else if (applyButton.selector !== 'text-search') {
        // If we have a valid selector (not text-search), click it
        try {
          await page.click(applyButton.selector);
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
            // Navigation might not happen, that's okay
            console.log('No navigation after click, continuing...');
          });
        } catch (clickError) {
          // If click fails, try to find and click by text
          console.log('Click by selector failed, trying to find element by text...');
          const clicked = await page.evaluate((buttonText) => {
            const elements = Array.from(document.querySelectorAll('a, button'));
            for (const el of elements) {
              if (el.textContent?.trim().toLowerCase().includes(buttonText?.toLowerCase() || 'apply')) {
                (el as HTMLElement).click();
                return true;
              }
            }
            return false;
          }, applyButton.text || 'apply');
          
          if (!clicked) {
            throw new Error('Could not click apply button');
          }
          
          await page.waitForTimeout(2000);
        }
      } else {
        // For text-search results, find and click the element
        const clicked = await page.evaluate((buttonText) => {
          const elements = Array.from(document.querySelectorAll('a, button'));
          for (const el of elements) {
            const text = el.textContent?.trim().toLowerCase();
            if (text && text.includes(buttonText?.toLowerCase() || 'apply')) {
              (el as HTMLElement).click();
              return true;
            }
          }
          return false;
        }, applyButton.text || 'apply');
        
        if (!clicked) {
          throw new Error('Could not click apply button found by text search');
        }
        
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {
          console.log('No navigation after click, continuing...');
        });
      }

      // Wait for application form to load
      await page.waitForTimeout(3000);

      // Fill out the application form
      // Note: Indeed's form structure varies, so we'll try common selectors
      try {
        // Fill first name
        const firstNameSelectors = ['input[name="firstName"]', 'input[name="firstname"]', '#firstName', '#firstname'];
        for (const selector of firstNameSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.type(selector, applicationData.firstName, { delay: 100 });
            break;
          } catch {
            continue;
          }
        }

        // Fill last name
        const lastNameSelectors = ['input[name="lastName"]', 'input[name="lastname"]', '#lastName', '#lastname'];
        for (const selector of lastNameSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.type(selector, applicationData.lastName, { delay: 100 });
            break;
          } catch {
            continue;
          }
        }

        // Fill email
        const emailSelectors = ['input[name="email"]', 'input[type="email"]', '#email'];
        for (const selector of emailSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.type(selector, applicationData.email, { delay: 100 });
            break;
          } catch {
            continue;
          }
        }

        // Fill phone if provided
        if (applicationData.phone) {
          const phoneSelectors = ['input[name="phone"]', 'input[type="tel"]', '#phone'];
          for (const selector of phoneSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.type(selector, applicationData.phone!, { delay: 100 });
              break;
            } catch {
              continue;
            }
          }
        }

        // Upload resume if provided
        if (applicationData.resumeUrl) {
          // For resume upload, we'd need to download the file first
          // This is complex, so we'll skip it for now
          console.log('Resume upload not yet implemented');
        }

        // Fill cover letter if provided
        if (applicationData.coverLetter) {
          const coverLetterSelectors = ['textarea[name="coverLetter"]', 'textarea[name="coverletter"]', 'textarea#coverLetter'];
          for (const selector of coverLetterSelectors) {
            try {
              await page.waitForSelector(selector, { timeout: 2000 });
              await page.type(selector, applicationData.coverLetter!, { delay: 50 });
              break;
            } catch {
              continue;
            }
          }
        }

        // Submit the form
        const submitSelectors = [
          'button[type="submit"]',
          'button:contains("Submit")',
          'button:contains("Apply")',
          'input[type="submit"]',
          'button[data-testid="submit-button"]',
        ];

        let submitted = false;
        for (const selector of submitSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 2000 });
            await page.click(selector);
            submitted = true;
            break;
          } catch {
            continue;
          }
        }

        if (!submitted) {
          throw new Error('Could not find submit button');
        }

        // Wait for submission confirmation
        await page.waitForTimeout(3000);

        // Check if submission was successful
        const successIndicators = await page.evaluate(() => {
          const text = document.body.textContent?.toLowerCase() || '';
          return (
            text.includes('thank you') ||
            text.includes('application submitted') ||
            text.includes('successfully applied') ||
            text.includes('application received')
          );
        });

        if (successIndicators) {
          return {
            success: true,
            message: 'Application submitted successfully to Indeed',
          };
        } else {
          return {
            success: false,
            message: 'Application form submitted, but success confirmation not detected',
          };
        }
      } catch (formError: any) {
        console.error('Error filling form:', formError);
        // Take a screenshot for debugging
        await page.screenshot({ path: '/tmp/indeed-apply-error.png' }).catch(() => {});
        throw new Error(`Failed to fill application form: ${formError.message}`);
      }
    } catch (error: any) {
      console.error('Puppeteer application submission error:', error);
      throw new Error(`Failed to submit application via Puppeteer: ${error.message}`);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Submit application to Indeed using ScrapingBee
   * Note: ScrapingBee is primarily for fetching content, not for form submission.
   * This method will attempt to fetch the application page and parse it,
   * but form submission via ScrapingBee is limited.
   */
  private static async submitWithScrapingBee(
    jobURL: string,
    applicationData: ApplicationData,
    options?: SubmitOptions['scrapingBeeOptions']
  ): Promise<{ success: boolean; message: string }> {
    // ScrapingBee doesn't support form submission directly
    // We can fetch the page, but we'd still need Puppeteer to submit
    // For now, we'll use ScrapingBee to get the application page URL, then use Puppeteer
    throw new Error('ScrapingBee form submission not yet implemented. Use Puppeteer instead.');
  }

  /**
   * Submit application to Indeed
   */
  static async submitApplication(
    jobURL: string,
    applicationData: ApplicationData,
    options: SubmitOptions = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!this.isIndeedURL(jobURL)) {
      throw new Error('URL is not an Indeed job URL');
    }

    // For now, always use Puppeteer (more reliable for form submission)
    // ScrapingBee can be used to fetch pages, but form submission requires Puppeteer
    return this.submitWithPuppeteer(jobURL, applicationData);
  }
}


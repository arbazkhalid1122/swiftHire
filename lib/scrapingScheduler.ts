import * as cron from 'node-cron';
import connectDB from './mongodb';
import JobSource from '@/models/JobSource';
import { JobScraper } from './jobScraper';

class ScrapingScheduler {
  private tasks: Map<string, cron.ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Start the scheduler
   */
  async start() {
    if (this.isRunning) {
      console.log('Scraping scheduler is already running');
      return;
    }

    await connectDB();
    this.isRunning = true;
    console.log('Starting job scraping scheduler...');

    // Load all active sources and schedule them
    await this.loadAndScheduleSources();

    // Check for new sources every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      await this.loadAndScheduleSources();
    });

    console.log('Job scraping scheduler started');
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.tasks.forEach((task) => task.stop());
    this.tasks.clear();
    this.isRunning = false;
    console.log('Job scraping scheduler stopped');
  }

  /**
   * Load active sources and schedule scraping tasks
   */
  private async loadAndScheduleSources() {
    try {
      const sources = await JobSource.find({ isActive: true });

      for (const source of sources) {
        const sourceId = source._id.toString();

        // Skip if already scheduled
        if (this.tasks.has(sourceId)) {
          continue;
        }

        // Calculate cron expression based on scrapeInterval (in minutes)
        const intervalMinutes = source.scrapeInterval || 60;
        const cronExpression = this.getCronExpression(intervalMinutes);

        // Schedule the scraping task
        const task = cron.schedule(cronExpression, async () => {
          try {
            console.log(`Scraping source: ${source.name} (${source.url})`);
            const result = await JobScraper.scrapeSource(sourceId);
            console.log(`Scraping completed for ${source.name}: ${result.success} jobs saved, ${result.errors} errors`);
          } catch (error: any) {
            console.error(`Error scraping source ${source.name}:`, error);
            await JobSource.findByIdAndUpdate(sourceId, {
              lastError: error.message || 'Unknown error',
            });
          }
        }, {
          scheduled: true,
          timezone: 'Europe/Rome', // Adjust to your timezone
        });

        this.tasks.set(sourceId, task);
        console.log(`Scheduled scraping for ${source.name} (every ${intervalMinutes} minutes)`);
      }

      // Remove tasks for sources that are no longer active
      const activeSourceIds = new Set(sources.map(s => s._id.toString()));
      for (const [sourceId, task] of this.tasks.entries()) {
        if (!activeSourceIds.has(sourceId)) {
          task.stop();
          this.tasks.delete(sourceId);
          console.log(`Removed scheduled task for source: ${sourceId}`);
        }
      }
    } catch (error) {
      console.error('Error loading and scheduling sources:', error);
    }
  }

  /**
   * Convert minutes to cron expression
   */
  private getCronExpression(minutes: number): string {
    // Ensure minutes is a valid positive number
    const validMinutes = Math.max(1, Math.floor(minutes));
    
    if (validMinutes < 60) {
      // For intervals less than 60 minutes
      // Find the largest divisor of 60 that is <= validMinutes
      const divisors = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30, 60];
      let bestDivisor = 1;
      for (const divisor of divisors) {
        if (divisor <= validMinutes && 60 % divisor === 0) {
          bestDivisor = divisor;
        }
      }
      
      if (bestDivisor === validMinutes) {
        // Perfect match - use exact interval
        return `*/${bestDivisor} * * * *`;
      } else {
        // Round to nearest valid divisor
        // Use comma-separated minutes for more precise timing
        const intervals: number[] = [];
        for (let i = 0; i < 60; i += validMinutes) {
          intervals.push(i);
        }
        if (intervals.length > 0) {
          return `${intervals.join(',')} * * * *`;
        }
        // Fallback to every hour if calculation fails
        return `0 * * * *`;
      }
    } else if (validMinutes < 1440) {
      // Every N hours
      const hours = Math.floor(validMinutes / 60);
      if (hours >= 1 && hours <= 24) {
        // Find valid hour divisors
        const hourDivisors = [1, 2, 3, 4, 6, 8, 12, 24];
        let bestHourDivisor = 1;
        for (const divisor of hourDivisors) {
          if (divisor <= hours && 24 % divisor === 0) {
            bestHourDivisor = divisor;
          }
        }
        return `0 */${bestHourDivisor} * * *`;
      } else {
        // More than 24 hours, run once per day
        return `0 0 * * *`;
      }
    } else {
      // Every N days
      const days = Math.floor(validMinutes / 1440);
      return `0 0 */${Math.max(1, Math.min(days, 31))} * *`;
    }
  }

  /**
   * Manually trigger scraping for a source
   */
  async triggerScrape(sourceId: string) {
    try {
      await connectDB();
      const result = await JobScraper.scrapeSource(sourceId);
      return result;
    } catch (error: any) {
      console.error(`Error triggering scrape for source ${sourceId}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const scrapingScheduler = new ScrapingScheduler();


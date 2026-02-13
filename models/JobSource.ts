import mongoose, { Schema, Document } from 'mongoose';

export interface IJobSource extends Document {
  name: string;
  url: string;
  type: 'scraping' | 'xml' | 'api';
  isActive: boolean;
  scrapingConfig: {
    jobListSelector?: string; // CSS selector for job list container
    jobItemSelector?: string; // CSS selector for individual job items
    titleSelector?: string; // CSS selector for job title
    descriptionSelector?: string; // CSS selector for job description
    locationSelector?: string; // CSS selector for location
    salarySelector?: string; // CSS selector for salary
    linkSelector?: string; // CSS selector for job detail link
    paginationSelector?: string; // CSS selector for pagination
    usePuppeteer?: boolean; // Whether to use Puppeteer for dynamic content
    useScrapingBee?: boolean; // Whether to use ScrapingBee (bypasses Cloudflare, handles proxies)
    scrapingBeeOptions?: {
      renderJs?: boolean; // Render JavaScript (like Puppeteer)
      countryCode?: string; // Country code for proxy
      wait?: number; // Wait time in milliseconds
    };
  };
  lastScrapedAt?: Date;
  lastSuccessAt?: Date;
  lastError?: string;
  scrapeInterval: number; // Minutes between scrapes
  createdAt: Date;
  updatedAt: Date;
}

const JobSourceSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true,
    },
    url: {
      type: String,
      required: [true, 'Source URL is required'],
      trim: true,
    },
    type: {
      type: String,
      enum: ['scraping', 'xml', 'api'],
      default: 'scraping',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    scrapingConfig: {
      jobListSelector: String,
      jobItemSelector: String,
      titleSelector: String,
      descriptionSelector: String,
      locationSelector: String,
      salarySelector: String,
      linkSelector: String,
      paginationSelector: String,
      usePuppeteer: {
        type: Boolean,
        default: false,
      },
      useScrapingBee: {
        type: Boolean,
        default: false,
      },
      scrapingBeeOptions: {
        renderJs: Boolean,
        countryCode: String,
        wait: Number,
      },
    },
    lastScrapedAt: Date,
    lastSuccessAt: Date,
    lastError: String,
    scrapeInterval: {
      type: Number,
      default: 60, // Default: scrape every hour
      min: 5, // Minimum 5 minutes
    },
  },
  {
    timestamps: true,
  }
);

JobSourceSchema.index({ isActive: 1, lastScrapedAt: 1 });
JobSourceSchema.index({ type: 1 });

export default mongoose.models.JobSource || mongoose.model<IJobSource>('JobSource', JobSourceSchema);


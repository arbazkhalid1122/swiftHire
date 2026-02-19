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
  applicationConfig?: {
    submissionMethod?: 'auto' | 'redirect' | 'manual'; // How to handle applications
    autoSubmit?: boolean; // Whether to auto-submit to partner platform
    redirectAfterSave?: boolean; // Whether to redirect after saving application
    redirectDelay?: number; // Delay in milliseconds before redirect (default: 2000)
    customSubmissionUrl?: string; // Custom submission endpoint if needed
    requiresManualStep?: boolean; // Whether manual step is required
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
    applicationConfig: {
      submissionMethod: {
        type: String,
        enum: ['auto', 'redirect', 'manual'],
        default: 'redirect',
      },
      autoSubmit: {
        type: Boolean,
        default: false,
      },
      redirectAfterSave: {
        type: Boolean,
        default: true,
      },
      redirectDelay: {
        type: Number,
        default: 2000, // 2 seconds
      },
      customSubmissionUrl: String,
      requiresManualStep: {
        type: Boolean,
        default: false,
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


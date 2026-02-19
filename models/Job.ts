import mongoose, { Schema, Document } from 'mongoose';

export interface IJob extends Document {
  companyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  requirements: {
    minExperience?: number; // years
    education?: string; // e.g., "Laurea", "Diploma", etc.
    skills?: string[];
    other?: string;
  };
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  status: 'active' | 'closed' | 'draft';
  applications: mongoose.Types.ObjectId[];
  viewCount: number;
  expiresAt?: Date;
  // External source tracking
  externalSource?: {
    sourceId: mongoose.Types.ObjectId; // Reference to JobSource
    externalId?: string; // External job ID from source
    externalUrl?: string; // Original job URL
    scrapedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const JobSchema: Schema = new Schema(
  {
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Company ID is required'],
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
    },
    location: {
      type: String,
      trim: true,
    },
    salary: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'EUR',
      },
    },
    requirements: {
      minExperience: {
        type: Number,
        default: 0,
      },
      education: String,
      skills: [String],
      other: String,
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
    },
    status: {
      type: String,
      enum: ['active', 'closed', 'draft'],
      default: 'active',
    },
    applications: [{
      type: Schema.Types.ObjectId,
      ref: 'JobApplication',
    }],
    viewCount: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
    },
    // External source tracking
    externalSource: {
      sourceId: {
        type: Schema.Types.ObjectId,
        ref: 'JobSource',
      },
      externalId: String,
      externalUrl: String,
      scrapedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
JobSchema.index({ companyId: 1, status: 1 });
JobSchema.index({ status: 1, createdAt: -1 });
JobSchema.index({ status: 1, viewCount: -1 }); // For ranking by views
JobSchema.index({ expiresAt: 1 }); // For filtering expired jobs
JobSchema.index({ 'requirements.minExperience': 1 });
JobSchema.index({ title: 'text', description: 'text' });
JobSchema.index({ 'externalSource.sourceId': 1, 'externalSource.externalId': 1 }, { unique: true, sparse: true });

export default mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);


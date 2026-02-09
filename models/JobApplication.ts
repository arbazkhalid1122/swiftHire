import mongoose, { Schema, Document } from 'mongoose';

export interface IJobApplication extends Document {
  jobId: mongoose.Types.ObjectId;
  candidateId: mongoose.Types.ObjectId;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';
  coverLetter?: string;
  cvUrl?: string;
  videoCvUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const JobApplicationSchema: Schema = new Schema(
  {
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job ID is required'],
    },
    candidateId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate ID is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
      default: 'pending',
    },
    coverLetter: {
      type: String,
      trim: true,
    },
    cvUrl: {
      type: String,
    },
    videoCvUrl: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
JobApplicationSchema.index({ jobId: 1, candidateId: 1 }, { unique: true });
JobApplicationSchema.index({ candidateId: 1, status: 1 });
JobApplicationSchema.index({ jobId: 1, status: 1 });

export default mongoose.models.JobApplication || mongoose.model<IJobApplication>('JobApplication', JobApplicationSchema);


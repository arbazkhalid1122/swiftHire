import mongoose, { Schema, Document } from 'mongoose';

export interface IWorkExperience extends Document {
  userId: mongoose.Types.ObjectId;
  companyName: string;
  position: string;
  startDate: Date;
  endDate?: Date;
  isCurrent: boolean;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WorkExperienceSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    position: {
      type: String,
      required: [true, 'Position is required'],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
    },
    isCurrent: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
WorkExperienceSchema.index({ userId: 1, startDate: -1 });

export default mongoose.models.WorkExperience || mongoose.model<IWorkExperience>('WorkExperience', WorkExperienceSchema);


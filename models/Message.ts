import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  senderId: mongoose.Types.ObjectId;
  receiverId: mongoose.Types.ObjectId;
  jobId?: mongoose.Types.ObjectId; // Optional: message related to a job
  subject?: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Sender ID is required'],
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver ID is required'],
    },
    jobId: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
    },
    subject: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Message content is required'],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
MessageSchema.index({ senderId: 1, createdAt: -1 });
MessageSchema.index({ receiverId: 1, isRead: 1, createdAt: -1 });
MessageSchema.index({ jobId: 1 });

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);


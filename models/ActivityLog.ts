import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema: Schema = new Schema(
  {
    userId: {
      type: String,
      required: [true, 'User ID is required'],
    },
    userEmail: {
      type: String,
      required: [true, 'User email is required'],
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        'user_created',
        'user_updated',
        'user_deleted',
        'user_role_changed',
        'user_verified',
        'newsletter_subscribed',
        'newsletter_unsubscribed',
        'newsletter_deleted',
        'newsletter_sent',
        'login',
        'logout',
        'password_reset',
        'profile_updated',
        'admin_access',
        'export_data',
        'bulk_operation',
      ],
    },
    resource: {
      type: String,
      required: [true, 'Resource is required'],
      enum: ['user', 'newsletter', 'system', 'auth'],
    },
    resourceId: {
      type: String,
    },
    details: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, createdAt: -1 });
ActivityLogSchema.index({ resource: 1, createdAt: -1 });

export default mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);


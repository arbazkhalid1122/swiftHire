import ActivityLog from '@/models/ActivityLog';
import connectDB from '@/lib/mongodb';

export interface LogActivityParams {
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function logActivity(params: LogActivityParams) {
  try {
    await connectDB();
    const activityLog = new ActivityLog(params);
    await activityLog.save();
  } catch (error) {
    // Don't throw error - logging should not break the main flow
    console.error('Failed to log activity:', error);
  }
}


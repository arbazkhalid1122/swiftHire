import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Newsletter from '@/models/Newsletter';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';
import { logActivity } from '@/lib/activityLog';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { email: string } }
) {
  try {
    await connectDB();

    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await User.findById(auth.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const email = decodeURIComponent(params.email);

    // Find and delete subscriber
    const subscriber = await Newsletter.findOne({ email: email.toLowerCase() });
    if (!subscriber) {
      return NextResponse.json(
        { error: 'Subscriber not found' },
        { status: 404 }
      );
    }

    // Mark as inactive instead of deleting (soft delete)
    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    await subscriber.save();

    // Log activity
    await logActivity({
      userId: auth.userId,
      userEmail: adminUser.email,
      action: 'newsletter_deleted',
      resource: 'newsletter',
      resourceId: subscriber._id.toString(),
      details: { email: subscriber.email },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        message: 'Subscriber removed successfully',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete subscriber error:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscriber' },
      { status: 500 }
    );
  }
}


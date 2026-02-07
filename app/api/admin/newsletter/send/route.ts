import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Newsletter from '@/models/Newsletter';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';
import { sendNewsletterUpdate } from '@/lib/email';
import { logActivity } from '@/lib/activityLog';

export async function POST(request: NextRequest) {
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

    const { subject, content } = await request.json();

    if (!subject || !content) {
      return NextResponse.json(
        { error: 'Subject and content are required' },
        { status: 400 }
      );
    }

    // Get all active subscribers
    const subscribers = await Newsletter.find({ isActive: true });
    
    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: 'No active subscribers found' },
        { status: 400 }
      );
    }

    // Send emails to all subscribers
    let successCount = 0;
    let failCount = 0;
    const failedEmails: string[] = [];

    for (const subscriber of subscribers) {
      try {
        const sent = await sendNewsletterUpdate(subscriber.email, subject, content);
        if (sent) {
          successCount++;
        } else {
          failCount++;
          failedEmails.push(subscriber.email);
        }
      } catch (error) {
        console.error(`Failed to send to ${subscriber.email}:`, error);
        failCount++;
        failedEmails.push(subscriber.email);
      }
    }

    // Log activity
    await logActivity({
      userId: auth.userId.toString(),
      userEmail: user.email,
      action: 'newsletter_sent',
      resource: 'newsletter',
      details: {
        subject,
        totalSubscribers: subscribers.length,
        successCount,
        failCount,
        failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        message: 'Newsletter sent successfully',
        stats: {
          total: subscribers.length,
          success: successCount,
          failed: failCount,
          failedEmails: failedEmails.length > 0 ? failedEmails : undefined,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Send newsletter error:', error);
    return NextResponse.json(
      { error: 'Failed to send newsletter' },
      { status: 500 }
    );
  }
}


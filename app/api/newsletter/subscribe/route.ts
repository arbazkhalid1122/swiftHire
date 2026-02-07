import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Newsletter from '@/models/Newsletter';
import { sendNewsletterConfirmation } from '@/lib/email';
import { logActivity } from '@/lib/activityLog';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await Newsletter.findOne({ email: email.toLowerCase() });
    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { error: 'Email is already subscribed to newsletter' },
          { status: 400 }
        );
      } else {
        // Reactivate subscription
        existing.isActive = true;
        existing.subscribedAt = new Date();
        existing.unsubscribedAt = undefined;
        await existing.save();

        await sendNewsletterConfirmation(email);

        // Log activity
        await logActivity({
          userId: 'system',
          userEmail: email.toLowerCase(),
          action: 'newsletter_subscribed',
          resource: 'newsletter',
          resourceId: existing._id.toString(),
          details: { action: 'resubscribed' },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });

        return NextResponse.json(
          { message: 'Successfully resubscribed to newsletter' },
          { status: 200 }
        );
      }
    }

    // Create new subscription
    const newsletter = new Newsletter({
      email: email.toLowerCase(),
      isActive: true,
    });

    await newsletter.save();

    // Send confirmation email
    await sendNewsletterConfirmation(email);

    // Log activity
    await logActivity({
      userId: 'system',
      userEmail: email.toLowerCase(),
      action: 'newsletter_subscribed',
      resource: 'newsletter',
      resourceId: newsletter._id.toString(),
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json(
      {
        message: 'Successfully subscribed to newsletter',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Newsletter subscription error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Email is already subscribed' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to subscribe. Please try again.' },
      { status: 500 }
    );
  }
}


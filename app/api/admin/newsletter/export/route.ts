import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Newsletter from '@/models/Newsletter';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';

export async function GET(request: NextRequest) {
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

    // Get all active subscribers
    const subscribers = await Newsletter.find({ isActive: true })
      .sort({ subscribedAt: -1 });

    // Generate CSV
    const csvHeader = 'Email,Subscribed At,Status\n';
    const csvRows = subscribers.map((sub) => {
      const date = new Date(sub.subscribedAt).toISOString().split('T')[0];
      return `${sub.email},${date},Active`;
    }).join('\n');

    const csv = csvHeader + csvRows;

    // Return CSV file
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Export newsletter error:', error);
    return NextResponse.json(
      { error: 'Failed to export subscribers' },
      { status: 500 }
    );
  }
}


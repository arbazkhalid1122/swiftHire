import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import { verifyAuth } from '@/middleware/auth';

// GET - Get jobs posted by the authenticated company
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

    const jobs = await Job.find({ companyId: auth.userId })
      .populate('companyId', 'name companyName email location')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Get my jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}


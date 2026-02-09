import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get all applications for the authenticated candidate
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

    const user = await User.findById(auth.userId);
    if (!user || user.userType !== 'candidate') {
      return NextResponse.json(
        { error: 'Only candidates can view their applications' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query: any = { candidateId: auth.userId };

    if (status) {
      query.status = status;
    }

    const applications = await JobApplication.find(query)
      .populate('jobId', 'title description location jobType requirements salary companyId status')
      .populate({
        path: 'jobId',
        populate: {
          path: 'companyId',
          select: 'name companyName email location',
        },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error: any) {
    console.error('Get my applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}


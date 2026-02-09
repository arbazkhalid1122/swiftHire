import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get all jobs (admin only, includes all statuses)
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    let query: any = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const jobs = await Job.find(query)
      .populate('companyId', 'name companyName email location')
      .sort({ createdAt: -1 })
      .lean();

    // Get application counts
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job: any) => {
        const applicationCount = await JobApplication.countDocuments({ jobId: job._id });
        return {
          ...job,
          applications: applicationCount,
        };
      })
    );

    return NextResponse.json({ jobs: jobsWithCounts }, { status: 200 });
  } catch (error: any) {
    console.error('Get admin jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}


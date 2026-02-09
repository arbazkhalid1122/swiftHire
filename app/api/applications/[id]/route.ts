import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobApplication from '@/models/JobApplication';
import Job from '@/models/Job';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// PUT - Update application status
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const application = await JobApplication.findById(id).populate('jobId');

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(auth.userId);
    const job = application.jobId as any;

    // Only company owner or admin can update application status
    if (job.companyId.toString() !== auth.userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { status } = await request.json();

    if (!['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    application.status = status;
    await application.save();

    return NextResponse.json(
      { message: 'Application status updated', application },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update application error:', error);
    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    );
  }
}


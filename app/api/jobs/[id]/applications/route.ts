import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get all applications for a job
export async function GET(
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
    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(auth.userId);
    
    // Only company owner or admin can view applications
    if (job.companyId.toString() !== auth.userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to view applications' },
        { status: 403 }
      );
    }

    const applications = await JobApplication.find({ jobId: id })
      .populate('candidateId', 'name email phone location education skills calculatedExperience cvUrl videoCvUrl')
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error: any) {
    console.error('Get applications error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}


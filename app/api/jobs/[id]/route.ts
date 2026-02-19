import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get a specific job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const job = await Job.findById(id)
      .populate('companyId', 'name companyName email location companyDescription companyWebsite')
      .lean();

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Increment view count (async, don't wait for it)
    Job.findByIdAndUpdate(id, { $inc: { viewCount: 1 } }).catch(err => 
      console.error('Error incrementing view count:', err)
    );

    return NextResponse.json({ job }, { status: 200 });
  } catch (error: any) {
    console.error('Get job error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT - Update a job (company only)
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
    const job = await Job.findById(id);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const user = await User.findById(auth.userId);
    
    // Allow company owner or admin to update
    if (job.companyId.toString() !== auth.userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only update your own jobs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    Object.assign(job, body);
    await job.save();

    return NextResponse.json(
      { message: 'Job updated successfully', job },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update job error:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job (company only)
export async function DELETE(
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
    
    // Allow company owner or admin to delete
    if (job.companyId.toString() !== auth.userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'You can only delete your own jobs' },
        { status: 403 }
      );
    }

    await Job.findByIdAndDelete(id);

    return NextResponse.json(
      { message: 'Job deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete job error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}


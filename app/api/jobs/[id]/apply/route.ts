import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { meetsRequirements } from '@/lib/experienceCalculator';

// POST - Apply to a job
export async function POST(
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

    const candidate = await User.findById(auth.userId);
    if (!candidate || candidate.userType !== 'candidate') {
      return NextResponse.json(
        { error: 'Only candidates can apply to jobs' },
        { status: 403 }
      );
    }

    // Check if already applied
    const existingApplication = await JobApplication.findOne({
      jobId: id,
      candidateId: auth.userId,
    });

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this job' },
        { status: 400 }
      );
    }

    // Validate requirements
    const candidateExperience = candidate.calculatedExperience || 0;
    const candidateEducation = candidate.education;
    const jobMinExperience = job.requirements?.minExperience;
    const jobEducation = job.requirements?.education;

    const requirementCheck = meetsRequirements(
      candidateExperience,
      candidateEducation,
      jobMinExperience,
      jobEducation
    );

    if (!requirementCheck.meets) {
      return NextResponse.json(
        { 
          error: requirementCheck.reason || 'Non soddisfi i requisiti per questa posizione',
          canApply: false
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { coverLetter, cvUrl, videoCvUrl } = body;

    const application = new JobApplication({
      jobId: id,
      candidateId: auth.userId,
      coverLetter,
      cvUrl,
      videoCvUrl,
      status: 'pending',
    });

    await application.save();

    // Add application to job
    job.applications.push(application._id);
    await job.save();

    return NextResponse.json(
      { 
        message: 'Application submitted successfully',
        application,
        canApply: true
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Apply to job error:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get all active jobs (with smart ranking for candidates)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const auth = verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const location = searchParams.get('location');
    const jobType = searchParams.get('jobType');

    let query: any = { status: 'active' };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (jobType) {
      query.jobType = jobType;
    }

    let jobs = await Job.find(query)
      .populate('companyId', 'name companyName email location')
      .sort({ createdAt: -1 })
      .lean();

    // Smart ranking: If user is authenticated and is a candidate, rank jobs by match
    if (auth) {
      const user = await User.findById(auth.userId);
      if (user && user.userType === 'candidate') {
        jobs = await rankJobsForCandidate(jobs, user);
      }
    }

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Get jobs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST - Create a new job (companies only)
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

    const user = await User.findById(auth.userId);
    if (!user || (user.userType !== 'company' && user.role !== 'admin')) {
      return NextResponse.json(
        { error: 'Only companies and admins can post jobs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      location,
      salary,
      requirements,
      jobType,
    } = body;

    // Use the authenticated user's company ID
    // For admins, if they're also a company, use their company ID
    // Otherwise, admins need to be associated with a company
    const finalCompanyId = auth.userId;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    const job = new Job({
      companyId: finalCompanyId,
      title,
      description,
      location,
      salary,
      requirements: requirements || {},
      jobType: jobType || 'full-time',
      status: 'active',
    });

    await job.save();

    // Send email notifications to similar candidates (only in production)
    if (process.env.NODE_ENV === 'production') {
      await sendJobNotificationToCandidates(job);
    }

    return NextResponse.json(
      { message: 'Job posted successfully', job },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create job error:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

// Smart ranking function
async function rankJobsForCandidate(jobs: any[], candidate: any): Promise<any[]> {
  const candidateSkills = candidate.skills || [];
  const candidateExperience = candidate.calculatedExperience || 0;
  const candidateEducation = candidate.education || '';

  const scoredJobs = jobs.map((job: any) => {
    let score = 0;

    // Experience match
    const requiredExp = job.requirements?.minExperience || 0;
    if (candidateExperience >= requiredExp) {
      score += 30;
    } else {
      score -= (requiredExp - candidateExperience) * 10;
    }

    // Education match
    if (job.requirements?.education) {
      const educationLevels: Record<string, number> = {
        'Laurea Magistrale': 4,
        'Laurea Triennale': 3,
        'Laurea': 3,
        'Diploma': 2,
        'Other': 1,
      };
      const candidateLevel = educationLevels[candidateEducation] || 1;
      const requiredLevel = educationLevels[job.requirements.education] || 1;
      if (candidateLevel >= requiredLevel) {
        score += 20;
      }
    }

    // Skills match
    const jobSkills = job.requirements?.skills || [];
    if (jobSkills.length > 0 && candidateSkills.length > 0) {
      const matchingSkills = jobSkills.filter((skill: string) =>
        candidateSkills.some((cs: string) =>
          cs.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(cs.toLowerCase())
        )
      );
      score += (matchingSkills.length / jobSkills.length) * 50;
    }

    return { ...job, matchScore: score };
  });

  // Sort by score (highest first)
  return scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
}

// Send job notifications to similar candidates
async function sendJobNotificationToCandidates(job: any) {
  try {
    const { sendJobNotificationEmail } = await import('@/lib/email');
    const candidates = await User.find({
      userType: 'candidate',
      isVerified: true,
    });

    const matchingCandidates = candidates.filter((candidate) => {
      const candidateExp = candidate.calculatedExperience || 0;
      const requiredExp = job.requirements?.minExperience || 0;

      // Check if candidate meets minimum requirements
      if (requiredExp > 0 && candidateExp < requiredExp) {
        return false;
      }

      // Check education if required
      if (job.requirements?.education) {
        const educationLevels: Record<string, number> = {
          'Laurea Magistrale': 4,
          'Laurea Triennale': 3,
          'Laurea': 3,
          'Diploma': 2,
          'Other': 1,
        };
        const candidateLevel = educationLevels[candidate.education || 'Other'] || 1;
        const requiredLevel = educationLevels[job.requirements.education] || 1;
        if (candidateLevel < requiredLevel) {
          return false;
        }
      }

      return true;
    });

    // Send emails (limit to 50 to avoid spam)
    for (const candidate of matchingCandidates.slice(0, 50)) {
      try {
        await sendJobNotificationEmail(candidate.email, job);
      } catch (err) {
        console.error(`Failed to send email to ${candidate.email}:`, err);
      }
    }
  } catch (error) {
    console.error('Error sending job notifications:', error);
  }
}


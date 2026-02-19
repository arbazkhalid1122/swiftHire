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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const skip = (page - 1) * limit;

    // Build query with all conditions using $and
    const andConditions: any[] = [
      { status: 'active' },
      {
        $or: [
          { expiresAt: { $exists: false } }, // Jobs without expiration
          { expiresAt: { $gt: new Date() } }, // Jobs that haven't expired yet
        ],
      },
    ];

    if (search) {
      andConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (location) {
      andConditions.push({ location: { $regex: location, $options: 'i' } });
    }

    if (jobType) {
      andConditions.push({ jobType });
    }

    const query = { $and: andConditions };

    // Get total count for pagination
    const totalCount = await Job.countDocuments(query);

    // Fetch jobs with pagination
    let jobs = await Job.find(query)
      .populate('companyId', 'name companyName email location')
      .sort({ viewCount: -1, createdAt: -1 }) // Sort by view count (most viewed first), then by creation date
      .skip(skip)
      .limit(limit)
      .lean();

    // Smart ranking: If user is authenticated and is a candidate, rank jobs by match
    if (auth) {
      const user = await User.findById(auth.userId);
      if (user && user.userType === 'candidate') {
        jobs = await rankJobsForCandidate(jobs, user);
      }
    }

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({ 
      jobs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }, { status: 200 });
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
      expiresAt,
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

    // Calculate expiration date if expirationDuration is provided
    let calculatedExpiresAt: Date | undefined;
    if (expiresAt) {
      calculatedExpiresAt = new Date(expiresAt);
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
      expiresAt: calculatedExpiresAt,
      viewCount: 0,
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
  // Get skills from both profile and extracted CV data
  const profileSkills = candidate.skills || [];
  const cvSkills = candidate.cvExtractedData?.skills || [];
  const candidateSkills = [...new Set([...profileSkills, ...cvSkills])]; // Merge and deduplicate
  
  const candidateExperience = candidate.calculatedExperience || 0;
  const candidateEducation = candidate.education || candidate.cvExtractedData?.education?.[0] || '';

  const scoredJobs = jobs.map((job: any) => {
    let score = 0;
    const matchReasons: string[] = [];

    // Experience match
    const requiredExp = job.requirements?.minExperience || 0;
    if (candidateExperience >= requiredExp) {
      score += 30;
      matchReasons.push(`Esperienza: ${candidateExperience} anni (richiesti: ${requiredExp})`);
    } else {
      score -= (requiredExp - candidateExperience) * 10;
    }

    // Education match - check both profile and CV extracted data
    if (job.requirements?.education) {
      const educationLevels: Record<string, number> = {
        'Laurea Magistrale': 4,
        'Laurea Triennale': 3,
        'Laurea': 3,
        'Diploma': 2,
        'Other': 1,
        'master': 4,
        'phd': 5,
        'doctorate': 5,
        'bachelor': 3,
        'degree': 3,
      };
      
      // Check profile education
      let candidateLevel = educationLevels[candidateEducation] || 1;
      
      // Also check CV extracted education (use highest)
      if (candidate.cvExtractedData?.education) {
        candidate.cvExtractedData.education.forEach((edu: string) => {
          const eduLower = edu.toLowerCase();
          let level = educationLevels[eduLower] || 1;
          
          // Try to find partial match
          if (level === 1) {
            const matchedKey = Object.keys(educationLevels).find(k => eduLower.includes(k));
            if (matchedKey) {
              level = educationLevels[matchedKey];
            }
          }
          
          if (level > candidateLevel) {
            candidateLevel = level;
          }
        });
      }
      
      const requiredLevel = educationLevels[job.requirements.education] || 1;
      if (candidateLevel >= requiredLevel) {
        score += 20;
        matchReasons.push(`Formazione: ${candidateEducation || candidate.cvExtractedData?.education?.[0] || 'Trovata nel CV'}`);
      }
    }

    // Skills match - enhanced with CV extracted skills
    const jobSkills = job.requirements?.skills || [];
    if (jobSkills.length > 0 && candidateSkills.length > 0) {
      const matchingSkills = jobSkills.filter((skill: string) =>
        candidateSkills.some((cs: string) => {
          const csLower = cs.toLowerCase();
          const skillLower = skill.toLowerCase();
          return csLower.includes(skillLower) || skillLower.includes(csLower);
        })
      );
      
      const skillMatchRatio = matchingSkills.length / jobSkills.length;
      score += skillMatchRatio * 50;
      
      if (matchingSkills.length > 0) {
        matchReasons.push(`Competenze corrispondenti: ${matchingSkills.slice(0, 3).join(', ')}${matchingSkills.length > 3 ? '...' : ''}`);
      }
    }

    // Bonus for CV extracted data (shows more complete profile)
    if (candidate.cvExtractedData) {
      score += 5; // Small bonus for having extracted CV data
    }

    // Bonus for languages if job mentions international work
    if (candidate.cvExtractedData?.languages && candidate.cvExtractedData.languages.length > 1) {
      if (job.description?.toLowerCase().includes('international') || 
          job.description?.toLowerCase().includes('multilingual')) {
        score += 10;
        matchReasons.push('Competenze linguistiche');
      }
    }

    // Bonus for certifications
    if (candidate.cvExtractedData?.certifications && candidate.cvExtractedData.certifications.length > 0) {
      score += 5;
    }

    return { 
      ...job, 
      matchScore: Math.max(0, score), // Ensure score is not negative
      matchReasons: matchReasons.slice(0, 3), // Limit to top 3 reasons
    };
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


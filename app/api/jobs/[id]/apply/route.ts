import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { meetsRequirements } from '@/lib/experienceCalculator';
import { IndeedApplicationSubmitter } from '@/lib/indeedApplicationSubmitter';

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

    // Check if this is an external job (Indeed, LinkedIn, etc.)
    const isExternalJob = job.externalSource?.externalUrl;
    const externalUrl = job.externalSource?.externalUrl;

    // Create application record
    const application = new JobApplication({
      jobId: id,
      candidateId: auth.userId,
      coverLetter,
      cvUrl,
      videoCvUrl,
      status: 'pending',
    });

    // If it's an external Indeed job, try to submit it programmatically
    if (isExternalJob && externalUrl && IndeedApplicationSubmitter.isIndeedURL(externalUrl)) {
      try {
        // Parse candidate name into first and last name
        const nameParts = candidate.name?.trim().split(/\s+/) || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        // Prepare application data for Indeed
        const applicationData = {
          firstName,
          lastName,
          email: candidate.email || '',
          phone: candidate.phone || '',
          resumeUrl: candidate.cvUrl || cvUrl,
          coverLetter: coverLetter || '',
          workExperience: candidate.cvExtractedData?.experience?.map((exp: any) => ({
            company: exp.company || '',
            title: exp.position || '',
            startDate: exp.duration || '',
            description: exp.description || '',
          })) || [],
          education: candidate.educationHistory?.map((edu: any) => ({
            school: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            graduationDate: edu.endDate ? new Date(edu.endDate).getFullYear().toString() : undefined,
          })) || [],
        };

        // Submit to Indeed
        console.log(`Submitting application to Indeed for job: ${externalUrl}`);
        const submissionResult = await IndeedApplicationSubmitter.submitApplication(
          externalUrl,
          applicationData
        );

        // Update application with external submission status
        application.externalApplication = {
          submitted: true,
          submittedAt: new Date(),
          externalUrl: externalUrl,
          submissionStatus: submissionResult.success ? 'success' : 'failed',
          submissionMessage: submissionResult.message,
        };

        await application.save();

        // Add application to job
        job.applications.push(application._id);
        await job.save();

        return NextResponse.json(
          {
            message: submissionResult.success
              ? 'Application submitted successfully to Indeed'
              : 'Application saved, but Indeed submission had issues',
            application,
            canApply: true,
            externalSubmission: {
              success: submissionResult.success,
              message: submissionResult.message,
            },
          },
          { status: 201 }
        );
      } catch (externalError: any) {
        console.error('External application submission error:', externalError);

        // Save application even if external submission fails
        application.externalApplication = {
          submitted: false,
          externalUrl: externalUrl,
          submissionStatus: 'failed',
          submissionMessage: externalError.message || 'Failed to submit to external platform',
        };

        await application.save();

        // Add application to job
        job.applications.push(application._id);
        await job.save();

        return NextResponse.json(
          {
            message: 'Application saved, but failed to submit to Indeed. You may need to apply manually.',
            application,
            canApply: true,
            externalSubmission: {
              success: false,
              message: externalError.message || 'Failed to submit to external platform',
            },
            warning: 'Please consider applying directly on Indeed as a backup.',
          },
          { status: 201 }
        );
      }
    }

    // Regular internal job application
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


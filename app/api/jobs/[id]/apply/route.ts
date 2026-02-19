import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Job from '@/models/Job';
import JobApplication from '@/models/JobApplication';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { meetsRequirements } from '@/lib/experienceCalculator';
import { IndeedApplicationSubmitter } from '@/lib/indeedApplicationSubmitter';
import { ExternalApplicationSubmitter } from '@/lib/externalApplicationSubmitter';
import { sendApplicationReceivedEmail } from '@/lib/email';
import { organizeCVFile, getPartnerNameFromJob } from '@/lib/cvOrganizer';

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
    let { coverLetter, cvUrl, videoCvUrl } = body;

    // Check if this is an external job (Indeed, LinkedIn, etc.)
    const isExternalJob = job.externalSource?.externalUrl;
    const externalUrl = job.externalSource?.externalUrl;

    // Get partner name and application config for CV organization
    const partnerName = await getPartnerNameFromJob(job);
    
    // Get application config from job source if available
    let applicationConfig: any = null;
    if (job.externalSource?.sourceId) {
      try {
        const JobSource = (await import('@/models/JobSource')).default;
        const source = await JobSource.findById(job.externalSource.sourceId);
        applicationConfig = source?.applicationConfig;
      } catch (error) {
        console.error('Error fetching job source config:', error);
      }
    }

    // Organize CV files by partner/job structure
    if (cvUrl && cvUrl.startsWith('/uploads/cvs/')) {
      try {
        const organizedCvUrl = await organizeCVFile(cvUrl, {
          partnerName,
          jobId: id,
          candidateId: auth.userId.toString(),
        });
        cvUrl = organizedCvUrl;
      } catch (error) {
        console.error('Error organizing CV file:', error);
        // Continue with original URL if organization fails
      }
    }

    if (videoCvUrl && videoCvUrl.startsWith('/uploads/cvs/')) {
      try {
        const organizedVideoCvUrl = await organizeCVFile(videoCvUrl, {
          partnerName,
          jobId: id,
          candidateId: auth.userId.toString(),
        });
        videoCvUrl = organizedVideoCvUrl;
      } catch (error) {
        console.error('Error organizing video CV file:', error);
        // Continue with original URL if organization fails
      }
    }

    // Create application record
    const application = new JobApplication({
      jobId: id,
      candidateId: auth.userId,
      coverLetter,
      cvUrl,
      videoCvUrl,
      status: 'pending',
    });

    // If it's an external job, try to submit it using generic submitter
    if (isExternalJob && externalUrl) {
      try {
        // Parse candidate name into first and last name
        const nameParts = candidate.name?.trim().split(/\s+/) || [];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || firstName;

        // Prepare application data
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

        // Determine submission method from config or auto-detect
        const submissionMethod = applicationConfig?.submissionMethod || 
          ExternalApplicationSubmitter.getSubmissionMethod(partnerName, externalUrl);
        
        // Submit using generic external submitter (only if auto-submit is enabled)
        let submissionResult;
        if (applicationConfig?.autoSubmit !== false && submissionMethod === 'auto') {
          console.log(`Submitting application to external platform: ${externalUrl}, Partner: ${partnerName || 'Unknown'}`);
          submissionResult = await ExternalApplicationSubmitter.submitApplication(
            externalUrl,
            applicationData,
            partnerName
          );
        } else {
          // Just save locally and provide redirect URL
          submissionResult = {
            success: true,
            message: 'Application saved. Please complete the process on the partner platform.',
            redirectUrl: externalUrl,
          };
        }

        // Update application with external submission status
        application.externalApplication = {
          submitted: submissionResult.success,
          submittedAt: new Date(),
          externalUrl: externalUrl,
          submissionStatus: submissionResult.success ? 'success' : 'failed',
          submissionMessage: submissionResult.message,
        };

        await application.save();

        // Add application to job
        job.applications.push(application._id);
        await job.save();

        // Send email notification to company (async, don't wait)
        try {
          const company = await User.findById(job.companyId);
          if (company && company.email) {
            sendApplicationReceivedEmail(
              company.email,
              candidate.name || 'Candidato',
              job.title,
              job._id.toString(),
              !!application.cvUrl,
              !!application.videoCvUrl
            ).catch(err => console.error('Failed to send application notification email:', err));
          }
        } catch (emailError) {
          console.error('Error sending application notification email:', emailError);
          // Don't fail the request if email fails
        }

        return NextResponse.json(
          {
            message: submissionResult.success
              ? 'Application submitted successfully'
              : 'Application saved, but external submission had issues',
            application,
            canApply: true,
            externalSubmission: {
              success: submissionResult.success,
              message: submissionResult.message,
              redirectUrl: submissionResult.redirectUrl,
              shouldRedirect: applicationConfig?.redirectAfterSave !== false,
              redirectDelay: applicationConfig?.redirectDelay || 2000,
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

        // Send email notification to company (async, don't wait)
        try {
          const company = await User.findById(job.companyId);
          if (company && company.email) {
            sendApplicationReceivedEmail(
              company.email,
              candidate.name || 'Candidato',
              job.title,
              job._id.toString(),
              !!application.cvUrl,
              !!application.videoCvUrl
            ).catch(err => console.error('Failed to send application notification email:', err));
          }
        } catch (emailError) {
          console.error('Error sending application notification email:', emailError);
          // Don't fail the request if email fails
        }

        return NextResponse.json(
          {
            message: 'Application saved, but failed to submit to external platform. You may need to apply manually.',
            application,
            canApply: true,
            externalSubmission: {
              success: false,
              message: externalError.message || 'Failed to submit to external platform',
              redirectUrl: externalUrl,
              shouldRedirect: applicationConfig?.redirectAfterSave !== false,
              redirectDelay: applicationConfig?.redirectDelay || 2000,
            },
            warning: 'Please consider applying directly on the partner platform as a backup.',
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

    // Send email notification to company (async, don't wait)
    try {
      const company = await User.findById(job.companyId);
      if (company && company.email) {
        sendApplicationReceivedEmail(
          company.email,
          candidate.name || 'Candidato',
          job.title,
          job._id.toString(),
          !!application.cvUrl,
          !!application.videoCvUrl
        ).catch(err => console.error('Failed to send application notification email:', err));
      }
    } catch (emailError) {
      console.error('Error sending application notification email:', emailError);
      // Don't fail the request if email fails
    }

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


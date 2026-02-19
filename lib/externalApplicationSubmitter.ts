/**
 * Generic External Application Submitter
 * 
 * Handles application submission to external job platforms
 * Supports different partner types with configurable submission methods
 */

import { IndeedApplicationSubmitter } from './indeedApplicationSubmitter';

export interface ExternalApplicationData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  coverLetter?: string;
  workExperience?: Array<{
    company?: string;
    title?: string;
    startDate?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    graduationDate?: string;
  }>;
}

export interface ExternalSubmissionResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

export class ExternalApplicationSubmitter {
  /**
   * Submit application to external platform based on URL/partner type
   */
  static async submitApplication(
    externalUrl: string,
    applicationData: ExternalApplicationData,
    partnerName?: string
  ): Promise<ExternalSubmissionResult> {
    try {
      // Determine partner type from URL or partner name
      const partnerType = this.detectPartnerType(externalUrl, partnerName);

      switch (partnerType) {
        case 'indeed':
          return await this.submitToIndeed(externalUrl, applicationData);
        
        case 'linkedin':
          return await this.submitToLinkedIn(externalUrl, applicationData);
        
        case 'generic':
        default:
          // For generic partners, we save locally and return redirect URL
          return {
            success: true,
            message: 'Application saved. Please complete the process on the partner platform.',
            redirectUrl: externalUrl,
          };
      }
    } catch (error: any) {
      console.error('External application submission error:', error);
      return {
        success: false,
        message: error.message || 'Failed to submit application to external platform',
        redirectUrl: externalUrl,
      };
    }
  }

  /**
   * Detect partner type from URL or partner name
   */
  static detectPartnerType(externalUrl: string, partnerName?: string): 'indeed' | 'linkedin' | 'generic' {
    const urlLower = externalUrl.toLowerCase();
    const nameLower = partnerName?.toLowerCase() || '';

    // Check URL patterns
    if (urlLower.includes('indeed.com') || IndeedApplicationSubmitter.isIndeedURL(externalUrl)) {
      return 'indeed';
    }
    
    if (urlLower.includes('linkedin.com')) {
      return 'linkedin';
    }

    // Check partner name patterns
    if (nameLower.includes('indeed')) {
      return 'indeed';
    }
    
    if (nameLower.includes('linkedin')) {
      return 'linkedin';
    }

    // Default to generic
    return 'generic';
  }

  /**
   * Submit to Indeed
   */
  private static async submitToIndeed(
    externalUrl: string,
    applicationData: ExternalApplicationData
  ): Promise<ExternalSubmissionResult> {
    try {
      // Transform ExternalApplicationData to ApplicationData format required by IndeedApplicationSubmitter
      // Filter out work experience items that don't have required fields
      const workExperience = applicationData.workExperience
        ?.filter(exp => exp.company && exp.title && exp.startDate)
        .map(exp => ({
          company: exp.company!,
          title: exp.title!,
          startDate: exp.startDate!,
          endDate: undefined, // endDate is optional in ApplicationData
          description: exp.description,
        })) || [];

      // Filter out education items that don't have required fields
      const education = applicationData.education
        ?.filter(edu => edu.school && edu.degree)
        .map(edu => ({
          school: edu.school!,
          degree: edu.degree!,
          field: edu.field,
          graduationDate: edu.graduationDate,
        })) || [];

      const indeedApplicationData = {
        firstName: applicationData.firstName,
        lastName: applicationData.lastName,
        email: applicationData.email,
        phone: applicationData.phone,
        resumeUrl: applicationData.resumeUrl,
        coverLetter: applicationData.coverLetter,
        workExperience,
        education,
      };

      const result = await IndeedApplicationSubmitter.submitApplication(externalUrl, indeedApplicationData);
      return {
        success: result.success,
        message: result.message || (result.success 
          ? 'Application submitted successfully to Indeed' 
          : 'Failed to submit to Indeed automatically'),
        redirectUrl: result.success ? undefined : externalUrl, // Only redirect if failed
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to submit to Indeed',
        redirectUrl: externalUrl,
      };
    }
  }

  /**
   * Submit to LinkedIn (placeholder - LinkedIn has strict anti-automation)
   */
  private static async submitToLinkedIn(
    externalUrl: string,
    applicationData: ExternalApplicationData
  ): Promise<ExternalSubmissionResult> {
    // LinkedIn doesn't allow automated submissions
    // Return redirect URL for manual application
    return {
      success: true,
      message: 'Application saved. Please complete the process on LinkedIn.',
      redirectUrl: externalUrl,
    };
  }

  /**
   * Check if URL is from a supported external platform
   */
  static isExternalPlatform(url: string): boolean {
    const urlLower = url.toLowerCase();
    return (
      urlLower.includes('indeed.com') ||
      urlLower.includes('linkedin.com') ||
      urlLower.includes('jooble.org') ||
      urlLower.includes('monster.com') ||
      urlLower.includes('glassdoor.com')
    );
  }

  /**
   * Get submission method for a partner
   */
  static getSubmissionMethod(partnerName?: string, externalUrl?: string): 'auto' | 'redirect' | 'manual' {
    if (!externalUrl) return 'manual';

    const partnerType = this.detectPartnerType(externalUrl, partnerName);

    switch (partnerType) {
      case 'indeed':
        return 'auto'; // Indeed supports automated submission
      case 'linkedin':
        return 'redirect'; // LinkedIn requires manual application
      default:
        return 'redirect'; // Generic partners use redirect
    }
  }
}


/**
 * CV File Organizer
 * 
 * Organizes CV files by partner/job structure:
 * uploads/cvs/{partner}/{jobId}/{candidateId}.pdf
 */

import { copyFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface CVOrganizationOptions {
  partnerName?: string;
  jobId: string;
  candidateId: string;
  originalCvPath?: string;
  originalVideoCvPath?: string;
}

/**
 * Organize CV file by partner/job structure
 * Returns the new organized path
 */
export async function organizeCVFile(
  originalPath: string,
  options: CVOrganizationOptions
): Promise<string> {
  try {
    // Determine partner name (sanitize for filesystem)
    const partnerName = options.partnerName 
      ? sanitizeFilename(options.partnerName.toLowerCase().replace(/\s+/g, '-'))
      : 'internal';
    
    // Build organized path: uploads/cvs/{partner}/{jobId}/{candidateId}.pdf
    const organizedDir = join(
      process.cwd(),
      'public',
      'uploads',
      'cvs',
      partnerName,
      options.jobId
    );

    // Create directory if it doesn't exist
    if (!existsSync(organizedDir)) {
      await mkdir(organizedDir, { recursive: true });
    }

    // Extract file extension from original path
    const ext = originalPath.split('.').pop() || 'pdf';
    const filename = `${options.candidateId}.${ext}`;
    const organizedPath = join(organizedDir, filename);

    // Copy file to organized location (don't move, keep original)
    const originalFullPath = join(process.cwd(), 'public', originalPath.replace(/^\//, ''));
    if (existsSync(originalFullPath)) {
      await copyFile(originalFullPath, organizedPath);
    }

    // Return relative path from public directory
    return `/uploads/cvs/${partnerName}/${options.jobId}/${filename}`;
  } catch (error: any) {
    console.error('Error organizing CV file:', error);
    // Return original path if organization fails
    return originalPath;
  }
}

/**
 * Sanitize filename for filesystem safety
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50); // Limit length
}

/**
 * Get partner name from job source
 */
export async function getPartnerNameFromJob(job: any): Promise<string | undefined> {
  if (!job.externalSource?.sourceId) {
    return undefined; // Internal job
  }

  try {
    const JobSource = (await import('@/models/JobSource')).default;
    const source = await JobSource.findById(job.externalSource.sourceId);
    return source?.name;
  } catch (error) {
    console.error('Error fetching job source:', error);
    return undefined;
  }
}


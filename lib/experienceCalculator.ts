import WorkExperience from '@/models/WorkExperience';

interface DateRange {
  start: Date;
  end: Date | null;
}

/**
 * Calculate non-overlapping years of experience from work experience records
 * This merges overlapping periods and calculates actual calendar days worked
 */
export async function calculateExperience(userId: string): Promise<number> {
  try {
    const experiences = await WorkExperience.find({ userId }).sort({ startDate: 1 });

    if (experiences.length === 0) {
      return 0;
    }

    // Convert to date ranges
    const ranges: DateRange[] = experiences.map((exp) => ({
      start: new Date(exp.startDate),
      end: exp.isCurrent ? new Date() : (exp.endDate ? new Date(exp.endDate) : new Date()),
    }));

    // Merge overlapping ranges
    const mergedRanges = mergeRanges(ranges);

    // Calculate total days
    let totalDays = 0;
    for (const range of mergedRanges) {
      const end = range.end || new Date();
      const days = Math.ceil((end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
      totalDays += days;
    }

    // Convert to years (365 days per year)
    const years = totalDays / 365;

    return Math.round(years * 100) / 100; // Round to 2 decimal places
  } catch (error) {
    console.error('Error calculating experience:', error);
    return 0;
  }
}

/**
 * Merge overlapping date ranges into continuous periods
 */
function mergeRanges(ranges: DateRange[]): DateRange[] {
  if (ranges.length === 0) return [];

  // Sort by start date
  const sorted = [...ranges].sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: DateRange[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const currentEnd = current.end || new Date();
    const nextStart = next.start;

    // If ranges overlap or are adjacent (within 1 day), merge them
    if (nextStart.getTime() <= currentEnd.getTime() + 86400000) {
      // Merge: extend current range to the later end date
      const nextEnd = next.end || new Date();
      current.end = currentEnd > nextEnd ? currentEnd : nextEnd;
    } else {
      // No overlap: save current and start new
      merged.push(current);
      current = { ...next };
    }
  }

  merged.push(current);
  return merged;
}

/**
 * Check if candidate meets job requirements
 */
export function meetsRequirements(
  candidateExperience: number,
  candidateEducation: string | undefined,
  jobMinExperience: number | undefined,
  jobEducation: string | undefined
): { meets: boolean; reason?: string } {
  // Check experience
  if (jobMinExperience !== undefined && jobMinExperience > 0) {
    if (candidateExperience < jobMinExperience) {
      return {
        meets: false,
        reason: `Non hai esperienza sufficiente. Richiesti: ${jobMinExperience} anni, tu hai: ${candidateExperience.toFixed(1)} anni`,
      };
    }
  }

  // Check education (if required)
  if (jobEducation) {
    // Education hierarchy: Laurea > Diploma > Other
    const educationLevels: Record<string, number> = {
      Laurea: 3,
      'Laurea Magistrale': 4,
      'Laurea Triennale': 3,
      Diploma: 2,
      Other: 1,
    };

    const candidateLevel = educationLevels[candidateEducation || 'Other'] || 1;
    const requiredLevel = educationLevels[jobEducation] || 1;

    if (candidateLevel < requiredLevel) {
      return {
        meets: false,
        reason: `Non hai il titolo di studio richiesto. Richiesto: ${jobEducation}, tu hai: ${candidateEducation || 'Nessuno'}`,
      };
    }
  }

  return { meets: true };
}


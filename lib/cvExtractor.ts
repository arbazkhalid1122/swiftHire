import pdfParse from 'pdf-parse';

export interface ExtractedCVData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  skills: string[];
  education: string[];
  experience: Array<{
    company?: string;
    position?: string;
    duration?: string;
    description?: string;
  }>;
  summary?: string;
  languages?: string[];
  certifications?: string[];
}

export async function extractCVData(pdfBuffer: Buffer): Promise<ExtractedCVData> {
  try {
    const data = await pdfParse(pdfBuffer);
    const text = data.text;

    const extracted: ExtractedCVData = {
      skills: [],
      education: [],
      experience: [],
      languages: [],
      certifications: [],
    };

    // Extract email
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = text.match(emailRegex);
    if (emails && emails.length > 0) {
      extracted.email = emails[0];
    }

    // Extract phone (various formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g;
    const phones = text.match(phoneRegex);
    if (phones && phones.length > 0) {
      extracted.phone = phones[0].trim();
    }

    // Extract name (usually at the top, before email/phone)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      // If first line doesn't look like email/phone, it might be the name
      if (!emailRegex.test(firstLine) && !phoneRegex.test(firstLine) && firstLine.length < 50) {
        extracted.name = firstLine;
      } else if (lines.length > 1) {
        extracted.name = lines[1].trim();
      }
    }

    // Extract skills (common tech skills) - improved matching
    const commonSkills = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
      'react', 'angular', 'vue', 'node.js', 'nodejs', 'express', 'django', 'flask', 'spring', 'laravel',
      'mongodb', 'mysql', 'postgresql', 'redis', 'elasticsearch', 'sql',
      'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'ci/cd', 'cicd',
      'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind',
      'machine learning', 'ai', 'data science', 'analytics', 'deep learning',
      'agile', 'scrum', 'project management', 'leadership',
      'typescript', 'javascript', 'java', 'python', 'react', 'vue', 'angular'
    ];

    const textLower = text.toLowerCase();
    const foundSkills = new Set<string>();
    
    // Direct match
    commonSkills.forEach(skill => {
      const skillLower = skill.toLowerCase();
      // Check for exact word match or as part of a word
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(text)) {
        foundSkills.add(skill);
      }
    });

    // Also look for skills section
    const skillsKeywords = ['skills', 'competenze', 'technical skills', 'technologies', 'tools', 'technologies'];
    for (let i = 0; i < linesLower.length; i++) {
      if (skillsKeywords.some(keyword => linesLower[i].includes(keyword))) {
        // Extract next 10-15 lines as potential skills
        const skillsSection = text.split('\n').slice(i, i + 15).join(' ').toLowerCase();
        commonSkills.forEach(skill => {
          if (skillsSection.includes(skill.toLowerCase())) {
            foundSkills.add(skill);
          }
        });
        break;
      }
    }

    extracted.skills = Array.from(foundSkills);

    // Extract education (look for education section)
    const educationKeywords = ['education', 'qualification', 'degree', 'university', 'college', 'laurea', 'diploma'];
    let educationSection = '';
    const linesLower = text.toLowerCase().split('\n');
    
    for (let i = 0; i < linesLower.length; i++) {
      if (educationKeywords.some(keyword => linesLower[i].includes(keyword))) {
        // Extract next 5-10 lines as education
        educationSection = text.split('\n').slice(i, i + 10).join('\n');
        break;
      }
    }

    // Extract education levels
    const educationLevels = ['laurea magistrale', 'laurea triennale', 'laurea', 'master', 'phd', 'doctorate', 'diploma', 'bachelor', 'degree'];
    educationLevels.forEach(level => {
      if (textLower.includes(level)) {
        extracted.education.push(level);
      }
    });

    // Extract experience (look for experience/work section)
    const experienceKeywords = ['experience', 'work experience', 'employment', 'career', 'professional experience', 'work history'];
    let experienceSection = '';
    
    for (let i = 0; i < linesLower.length; i++) {
      if (experienceKeywords.some(keyword => linesLower[i].includes(keyword))) {
        // Extract next 20-30 lines as experience
        experienceSection = text.split('\n').slice(i, i + 30).join('\n');
        break;
      }
    }

    // Try to extract individual experiences - improved pattern matching
    const experiencePatterns = [
      /(\d{4}|\w+\s+\d{4})\s*[-–—]\s*(\d{4}|present|current|now|oggi)/gi,
      /(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}\s*[-–—]\s*((gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+\d{4}|present|current|now|oggi)/gi,
      /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}\s*[-–—]\s*((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{4}|present|current|now)/gi,
    ];

    experiencePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const matchIndex = text.indexOf(match);
          const context = text.substring(Math.max(0, matchIndex - 150), matchIndex + 300);
          const lines = context.split('\n').filter(l => l.trim().length > 0);
          
          // Try to find position and company in nearby lines
          let position = '';
          let company = '';
          
          // Look for position (usually before date)
          for (let i = Math.max(0, lines.length - 5); i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length > 5 && line.length < 80 && !line.match(/\d{4}/)) {
              if (!position) position = line;
              else if (!company) company = line;
            }
          }
          
          extracted.experience.push({
            duration: match.trim(),
            position: position || undefined,
            company: company || undefined,
          });
        });
      }
    });

    // Extract location (common patterns)
    const locationPatterns = [
      /(?:located in|based in|from|residing in)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s*(?:Italy|USA|UK|United States|United Kingdom)/i,
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        extracted.location = match[1];
        break;
      }
    }

    // Extract summary/objective
    const summaryKeywords = ['summary', 'objective', 'profile', 'about', 'overview'];
    for (let i = 0; i < linesLower.length; i++) {
      if (summaryKeywords.some(keyword => linesLower[i].includes(keyword))) {
        extracted.summary = text.split('\n').slice(i, i + 5).join(' ').substring(0, 500);
        break;
      }
    }

    // Extract languages
    const languageKeywords = ['languages', 'lingue', 'idiomas'];
    const languageList = ['english', 'italian', 'spanish', 'french', 'german', 'chinese', 'japanese'];
    for (let i = 0; i < linesLower.length; i++) {
      if (languageKeywords.some(keyword => linesLower[i].includes(keyword))) {
        const languageSection = text.split('\n').slice(i, i + 10).join(' ').toLowerCase();
        languageList.forEach(lang => {
          if (languageSection.includes(lang)) {
            extracted.languages?.push(lang);
          }
        });
        break;
      }
    }

    // Extract certifications
    const certKeywords = ['certification', 'certificate', 'certified', 'certificazione'];
    for (let i = 0; i < linesLower.length; i++) {
      if (certKeywords.some(keyword => linesLower[i].includes(keyword))) {
        const certSection = text.split('\n').slice(i, i + 10);
        certSection.forEach(line => {
          if (line.trim().length > 0 && line.trim().length < 100) {
            extracted.certifications?.push(line.trim());
          }
        });
        break;
      }
    }

    // Log extraction results for debugging
    console.log('CV Extraction Results:', {
      skillsFound: extracted.skills.length,
      educationFound: extracted.education.length,
      experienceFound: extracted.experience.length,
      languagesFound: extracted.languages?.length || 0,
      certificationsFound: extracted.certifications?.length || 0,
      textLength: text.length,
    });

    return extracted;
  } catch (error) {
    console.error('Error extracting CV data:', error);
    throw new Error('Failed to extract CV data from PDF');
  }
}


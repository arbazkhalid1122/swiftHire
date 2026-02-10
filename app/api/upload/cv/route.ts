import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { extractCVData } from '@/lib/cvExtractor';

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
    if (!user || user.userType !== 'candidate') {
      return NextResponse.json(
        { error: 'Only candidates can upload CVs' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Extract data from PDF
    const extractedData = await extractCVData(buffer);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'cvs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${user._id}_${timestamp}.pdf`;
    const filepath = join(uploadsDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Generate public URL
    const cvUrl = `/uploads/cvs/${filename}`;

    // Update user profile with CV URL and extracted data
    user.cvUrl = cvUrl;
    
    // Update profile fields from extracted data
    if (extractedData.name && !user.name) {
      user.name = extractedData.name;
    }
    if (extractedData.email && !user.email) {
      // Don't update email if it's different (security)
      if (extractedData.email.toLowerCase() === user.email.toLowerCase()) {
        // Email matches, safe to update
      }
    }
    if (extractedData.phone && !user.phone) {
      user.phone = extractedData.phone;
    }
    if (extractedData.location && !user.location) {
      user.location = extractedData.location;
    }
    if (extractedData.skills && extractedData.skills.length > 0) {
      // Merge with existing skills
      const existingSkills = user.skills || [];
      const newSkills = [...new Set([...existingSkills, ...extractedData.skills])];
      user.skills = newSkills;
    }
    if (extractedData.education && extractedData.education.length > 0) {
      // Use the highest education level found
      const educationLevels: Record<string, number> = {
        'phd': 5,
        'doctorate': 5,
        'master': 4,
        'laurea magistrale': 4,
        'laurea triennale': 3,
        'laurea': 3,
        'bachelor': 3,
        'degree': 3,
        'diploma': 2,
      };
      
      let highestLevel = '';
      let highestValue = 0;
      
      extractedData.education.forEach(edu => {
        const level = edu.toLowerCase();
        const value = educationLevels[level] || 1;
        if (value > highestValue) {
          highestValue = value;
          highestLevel = edu;
        }
      });
      
      if (highestLevel && !user.education) {
        user.education = highestLevel;
      }
    }
    if (extractedData.summary && !user.bio) {
      user.bio = extractedData.summary;
    }

    // Store extracted data in a new field for future use
    (user as any).cvExtractedData = {
      extractedAt: new Date(),
      skills: extractedData.skills,
      education: extractedData.education,
      experience: extractedData.experience,
      languages: extractedData.languages,
      certifications: extractedData.certifications,
    };

    await user.save();

    return NextResponse.json(
      {
        message: 'CV uploaded and processed successfully',
        cvUrl,
        extractedData: {
          skills: extractedData.skills,
          education: extractedData.education,
          experience: extractedData.experience.length,
        },
        updatedFields: {
          name: extractedData.name ? 'Updated' : 'Not found',
          phone: extractedData.phone ? 'Updated' : 'Not found',
          location: extractedData.location ? 'Updated' : 'Not found',
          skills: extractedData.skills.length > 0 ? `${extractedData.skills.length} skills found` : 'No skills found',
          education: extractedData.education.length > 0 ? extractedData.education[0] : 'Not found',
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('CV upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload CV' },
      { status: 500 }
    );
  }
}


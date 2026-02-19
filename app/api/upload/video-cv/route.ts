import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

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
        { error: 'Only candidates can upload video CVs' },
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

    // Validate file type (video files)
    const allowedTypes = ['video/webm', 'video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Only video files are allowed (webm, mp4, mov, avi)' },
        { status: 400 }
      );
    }

    // Validate file size (max 100MB for videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'video-cvs');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'webm';
    const filename = `${user._id}_${timestamp}.${ext}`;
    const filepath = join(uploadsDir, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Generate public URL
    const videoCvUrl = `/uploads/video-cvs/${filename}`;

    // Update user profile with video CV URL
    user.videoCvUrl = videoCvUrl;
    await user.save();

    return NextResponse.json(
      {
        message: 'Video CV uploaded successfully',
        videoCvUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Video CV upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload video CV' },
      { status: 500 }
    );
  }
}


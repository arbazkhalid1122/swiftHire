import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { uploadToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

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

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'webm';
    const filename = `${user._id}_${timestamp}.${ext}`;
    const contentType = file.type || 'video/webm';

    let videoCvUrl: string;

    if (isCloudinaryConfigured()) {
      const url = await uploadToCloudinary(buffer, 'video-cvs', filename, 'video', contentType);
      if (!url) {
        return NextResponse.json(
          { error: 'Upload failed' },
          { status: 500 }
        );
      }
      videoCvUrl = url;
    } else {
      const uploadsDir = join(process.cwd(), 'public', 'uploads', 'video-cvs');
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true });
      }
      const filepath = join(uploadsDir, filename);
      await writeFile(filepath, buffer);
      videoCvUrl = `/uploads/video-cvs/${filename}`;
    }

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


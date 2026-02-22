import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXT = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

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
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
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

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const typeOk = file.type && ALLOWED_TYPES.includes(file.type);
    const extOk = ALLOWED_EXT.includes(ext);
    if (!typeOk && !extOk) {
      return NextResponse.json(
        { error: 'Only image files are allowed (JPEG, PNG, WebP, GIF)' },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'profile-photos');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const safeExt = ALLOWED_EXT.includes(ext) ? ext : 'jpg';
    const filename = `${user._id}_${Date.now()}.${safeExt}`;
    const filepath = join(uploadsDir, filename);

    await writeFile(filepath, buffer);

    const profilePhotoUrl = `/uploads/profile-photos/${filename}`;
    await User.findByIdAndUpdate(auth.userId, { profilePhotoUrl });

    return NextResponse.json(
      {
        message: 'Profile photo uploaded successfully',
        profilePhotoUrl,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload profile photo' },
      { status: 500 }
    );
  }
}

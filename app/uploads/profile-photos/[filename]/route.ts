import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MIMES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    const dir = join(process.cwd(), 'public', 'uploads', 'profile-photos');
    const filepath = join(dir, filename);
    if (!existsSync(filepath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = MIMES[ext] || 'application/octet-stream';
    const buffer = await readFile(filepath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Serve profile photo error:', err);
    return NextResponse.json({ error: 'Failed to serve image' }, { status: 500 });
  }
}

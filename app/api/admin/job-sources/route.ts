import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobSource from '@/models/JobSource';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';

// GET - Get all job sources
export async function GET(request: NextRequest) {
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const sources = await JobSource.find().sort({ createdAt: -1 });

    return NextResponse.json({ sources }, { status: 200 });
  } catch (error: any) {
    console.error('Get job sources error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job sources' },
      { status: 500 }
    );
  }
}

// POST - Create a new job source
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
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      url,
      type,
      isActive,
      scrapingConfig,
      scrapeInterval,
    } = body;

    if (!name || !url) {
      return NextResponse.json(
        { error: 'Name and URL are required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const source = new JobSource({
      name,
      url,
      type: type || 'scraping',
      isActive: isActive !== undefined ? isActive : true,
      scrapingConfig: scrapingConfig || {},
      scrapeInterval: scrapeInterval || 60,
    });

    await source.save();

    return NextResponse.json(
      { message: 'Job source created successfully', source },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create job source error:', error);
    return NextResponse.json(
      { error: 'Failed to create job source' },
      { status: 500 }
    );
  }
}


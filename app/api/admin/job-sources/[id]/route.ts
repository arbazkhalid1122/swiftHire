import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobSource from '@/models/JobSource';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';

// GET - Get a single job source
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const source = await JobSource.findById(id);

    if (!source) {
      return NextResponse.json(
        { error: 'Job source not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ source }, { status: 200 });
  } catch (error: any) {
    console.error('Get job source error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job source' },
      { status: 500 }
    );
  }
}

// PUT - Update a job source
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();

    const source = await JobSource.findById(id);
    if (!source) {
      return NextResponse.json(
        { error: 'Job source not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (body.name !== undefined) source.name = body.name;
    if (body.url !== undefined) {
      try {
        new URL(body.url);
        source.url = body.url;
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }
    if (body.type !== undefined) source.type = body.type;
    if (body.isActive !== undefined) source.isActive = body.isActive;
    if (body.scrapingConfig !== undefined) source.scrapingConfig = body.scrapingConfig;
    if (body.scrapeInterval !== undefined) source.scrapeInterval = body.scrapeInterval;

    await source.save();

    return NextResponse.json(
      { message: 'Job source updated successfully', source },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update job source error:', error);
    return NextResponse.json(
      { error: 'Failed to update job source' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job source
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const source = await JobSource.findById(id);

    if (!source) {
      return NextResponse.json(
        { error: 'Job source not found' },
        { status: 404 }
      );
    }

    await source.deleteOne();

    return NextResponse.json(
      { message: 'Job source deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete job source error:', error);
    return NextResponse.json(
      { error: 'Failed to delete job source' },
      { status: 500 }
    );
  }
}


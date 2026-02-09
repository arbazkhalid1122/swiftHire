import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkExperience from '@/models/WorkExperience';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { calculateExperience } from '@/lib/experienceCalculator';

// GET - Get work experience for a user
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || auth.userId;

    // Only allow users to see their own experience unless admin
    const user = await User.findById(auth.userId);
    if (userId !== auth.userId && user?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const experiences = await WorkExperience.find({ userId })
      .sort({ startDate: -1 })
      .lean();

    // Calculate total experience
    const totalExperience = await calculateExperience(userId);

    return NextResponse.json(
      { experiences, totalExperience },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get experience error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch experience' },
      { status: 500 }
    );
  }
}

// POST - Add work experience
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
        { error: 'Only candidates can add work experience' },
        { status: 403 }
      );
    }

    const { companyName, position, startDate, endDate, isCurrent, description } = await request.json();

    if (!companyName || !position || !startDate) {
      return NextResponse.json(
        { error: 'Company name, position, and start date are required' },
        { status: 400 }
      );
    }

    const experience = new WorkExperience({
      userId: auth.userId,
      companyName,
      position,
      startDate,
      endDate: isCurrent ? undefined : endDate,
      isCurrent: isCurrent || false,
      description,
    });

    await experience.save();

    // Recalculate total experience
    const totalExperience = await calculateExperience(auth.userId);
    user.calculatedExperience = totalExperience;
    await user.save();

    return NextResponse.json(
      { 
        message: 'Work experience added successfully',
        experience,
        totalExperience
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Add experience error:', error);
    return NextResponse.json(
      { error: 'Failed to add work experience' },
      { status: 500 }
    );
  }
}


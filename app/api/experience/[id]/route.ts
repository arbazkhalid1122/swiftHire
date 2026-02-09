import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import WorkExperience from '@/models/WorkExperience';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';
import { calculateExperience } from '@/lib/experienceCalculator';

// PUT - Update work experience
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

    const { id } = await params;
    const experience = await WorkExperience.findById(id);

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    if (experience.userId.toString() !== auth.userId) {
      return NextResponse.json(
        { error: 'You can only update your own experience' },
        { status: 403 }
      );
    }

    const body = await request.json();
    Object.assign(experience, body);
    await experience.save();

    // Recalculate total experience
    const user = await User.findById(auth.userId);
    if (user) {
      const totalExperience = await calculateExperience(auth.userId);
      user.calculatedExperience = totalExperience;
      await user.save();
    }

    return NextResponse.json(
      { 
        message: 'Experience updated successfully',
        experience,
        totalExperience: user?.calculatedExperience
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update experience error:', error);
    return NextResponse.json(
      { error: 'Failed to update experience' },
      { status: 500 }
    );
  }
}

// DELETE - Delete work experience
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

    const { id } = await params;
    const experience = await WorkExperience.findById(id);

    if (!experience) {
      return NextResponse.json(
        { error: 'Experience not found' },
        { status: 404 }
      );
    }

    if (experience.userId.toString() !== auth.userId) {
      return NextResponse.json(
        { error: 'You can only delete your own experience' },
        { status: 403 }
      );
    }

    await WorkExperience.findByIdAndDelete(id);

    // Recalculate total experience
    const user = await User.findById(auth.userId);
    if (user) {
      const totalExperience = await calculateExperience(auth.userId);
      user.calculatedExperience = totalExperience;
      await user.save();
    }

    return NextResponse.json(
      { 
        message: 'Experience deleted successfully',
        totalExperience: user?.calculatedExperience
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete experience error:', error);
    return NextResponse.json(
      { error: 'Failed to delete experience' },
      { status: 500 }
    );
  }
}


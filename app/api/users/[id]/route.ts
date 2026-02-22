import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

// GET - Get user info (for messaging, accessible to authenticated users)
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

    const { id } = await params;
    const user = await User.findById(id).select('-password');
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return basic user info (safe for messaging)
    return NextResponse.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        companyLogoUrl: user.companyLogoUrl ?? null,
        userType: user.userType,
        location: user.location,
        profilePhotoUrl: user.profilePhotoUrl ?? null,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error('Get user info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user info' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyAuth } from '@/middleware/auth';

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

    const user = await User.findById(auth.userId).select('-password');
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          bio: user.bio,
          isVerified: user.isVerified,
          role: user.role,
          userType: user.userType,
          cvUrl: user.cvUrl,
          videoCvUrl: user.videoCvUrl,
          education: user.education,
          skills: user.skills,
          companyName: user.companyName,
          companyDescription: user.companyDescription,
          companyWebsite: user.companyWebsite,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const auth = verifyAuth(request);
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, phone, location, bio, cvUrl, videoCvUrl, education, skills, companyName, companyDescription, companyWebsite } = await request.json();

    const user = await User.findById(auth.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    
    // Candidate-specific fields
    if (cvUrl !== undefined) user.cvUrl = cvUrl;
    if (videoCvUrl !== undefined) user.videoCvUrl = videoCvUrl;
    if (education !== undefined) user.education = education;
    if (skills !== undefined) {
      user.skills = typeof skills === 'string' 
        ? skills.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : skills;
    }
    
    // Company-specific fields
    if (companyName !== undefined) user.companyName = companyName;
    if (companyDescription !== undefined) user.companyDescription = companyDescription;
    if (companyWebsite !== undefined) user.companyWebsite = companyWebsite;

    await user.save();

    return NextResponse.json(
      {
        message: 'Profile updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          location: user.location,
          bio: user.bio,
          isVerified: user.isVerified,
          role: user.role,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}


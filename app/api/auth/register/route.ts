import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateJWT } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { 
      name, 
      email, 
      password, 
      userType, 
      // Company fields
      companyName,
      companyDescription,
      companyWebsite,
      // Candidate fields
      education,
      skills
    } = await request.json();

    // Validation
    if (!name || !email || !password || !userType) {
      return NextResponse.json(
        { error: 'Name, email, password, and user type are required' },
        { status: 400 }
      );
    }

    if (userType !== 'company' && userType !== 'candidate') {
      return NextResponse.json(
        { error: 'User type must be either "company" or "candidate"' },
        { status: 400 }
      );
    }

    // Validate company-specific fields
    if (userType === 'company' && !companyName) {
      return NextResponse.json(
        { error: 'Company name is required for company registration' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists. Please login instead.' },
        { status: 400 }
      );
    }

    // Create user (automatically verified)
    const userData: any = {
      name,
      email,
      password,
      userType,
      isVerified: true, // Auto-verify without OTP
    };

    // Add company-specific fields
    if (userType === 'company') {
      userData.companyName = companyName;
      if (companyDescription) userData.companyDescription = companyDescription;
      if (companyWebsite) userData.companyWebsite = companyWebsite;
    }

    // Add candidate-specific fields
    if (userType === 'candidate') {
      if (education) userData.education = education;
      if (skills && Array.isArray(skills)) userData.skills = skills;
      userData.calculatedExperience = 0; // Will be calculated when work experience is added
    }

    const user = new User(userData);
    await user.save();

    // Generate JWT token
    const token = generateJWT({
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json(
      {
        message: 'Registration successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          profilePhotoUrl: user.profilePhotoUrl,
          isVerified: user.isVerified,
          role: user.role,
          userType: user.userType,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

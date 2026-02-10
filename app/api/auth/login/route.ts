import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateJWT } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { email, password } = body;

    console.log('Login attempt:', { email: email ? 'provided' : 'missing', password: password ? 'provided' : 'missing' });

    // Validate email and password
    if (!email || !password) {
      console.error('Missing credentials:', { hasEmail: !!email, hasPassword: !!password });
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Trim and validate email format
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || trimmedEmail.length === 0) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    if (password.trim().length === 0) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Find user with password
    const user = await User.findOne({ email: trimmedEmail }).select('+password');
    if (!user) {
      console.error('User not found for email:', trimmedEmail);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if user has userType (required field)
    if (!user.userType) {
      console.error('User missing userType:', user._id, user.email);
      // Set a default userType if missing (for backward compatibility)
      user.userType = 'candidate';
      await user.save();
    }

    // Auto-verify user if not already verified
    if (!user.isVerified) {
      // Use updateOne to avoid triggering full validation
      await User.updateOne(
        { _id: user._id },
        { isVerified: true }
      );
      user.isVerified = true;
    }

    // Generate JWT token directly
    const token = generateJWT({
      userId: user._id.toString(),
      email: user.email,
    });

    return NextResponse.json(
      {
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          isVerified: user.isVerified,
          role: user.role,
          userType: user.userType,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}


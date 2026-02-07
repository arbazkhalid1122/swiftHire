import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { generateOTP, generateJWT } from '@/lib/utils';
import { sendOTPEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user with password
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
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

    // If user is already verified, skip OTP and directly log them in
    if (user.isVerified) {
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
          },
          skipOTP: true, // Flag to indicate OTP was skipped
        },
        { status: 200 }
      );
    }

    // If user is not verified, send OTP (first time signup verification)
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes expiry

    const otpDoc = new OTP({
      email: user.email,
      otp,
      type: 'login',
      expiresAt: otpExpiry,
    });

    await otpDoc.save();

    // Send OTP email
    await sendOTPEmail(user.email, otp, 'login');

    return NextResponse.json(
      {
        message: 'OTP sent to your email. Please verify to complete login.',
        email: user.email,
        skipOTP: false, // Flag to indicate OTP is required
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


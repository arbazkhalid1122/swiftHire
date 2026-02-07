import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { generateJWT } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email, otp, type } = await request.json();

    if (!email || !otp || !type) {
      return NextResponse.json(
        { error: 'Email, OTP, and type are required' },
        { status: 400 }
      );
    }

    // Find OTP
    const otpDoc = await OTP.findOne({
      email: email.toLowerCase(),
      otp,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpDoc) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    otpDoc.isUsed = true;
    await otpDoc.save();

    // Handle different OTP types
    if (type === 'registration') {
      // Verify user account
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      user.isVerified = true;
      await user.save();

      // Generate JWT token
      const token = generateJWT({
        userId: user._id.toString(),
        email: user.email,
      });

      return NextResponse.json(
        {
          message: 'Email verified successfully',
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            isVerified: user.isVerified,
            role: user.role,
          },
        },
        { status: 200 }
      );
    } else if (type === 'login') {
      // Find user and generate token
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

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
        },
        { status: 200 }
      );
    } else if (type === 'password-reset') {
      // OTP verified, allow password reset
      return NextResponse.json(
        {
          message: 'OTP verified. You can now reset your password.',
          verified: true,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid OTP type' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'OTP verification failed. Please try again.' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateJWT } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists for security
      return NextResponse.json(
        { message: 'If the email exists, a password reset token has been generated.' },
        { status: 200 }
      );
    }

    // Generate a simple reset token (JWT that expires in 1 hour)
    const resetToken = generateJWT({
      userId: user._id.toString(),
      email: user.email,
      type: 'password-reset',
    });

    // Return token (in production, this would be sent via email)
    return NextResponse.json(
      {
        message: 'Password reset token generated. Use this token to reset your password.',
        resetToken, // In production, send this via email instead
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request. Please try again.' },
      { status: 500 }
    );
  }
}


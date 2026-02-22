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

    const adminUser = await User.findById(auth.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const query: any = {
      userType: 'candidate',
      videoCvUrl: { $exists: true, $nin: ['', null] },
    };
    if (search.trim()) {
      query.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { email: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const candidates = await User.find(query)
      .select('name email videoCvUrl createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const videoCVs = candidates.map((c: any) => ({
      _id: c._id,
      candidateId: c._id.toString(),
      candidateName: c.name,
      candidateEmail: c.email,
      videoCvUrl: c.videoCvUrl ?? null,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({ videoCVs }, { status: 200 });
  } catch (error: any) {
    console.error('Admin video CVs list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch video CVs' },
      { status: 500 }
    );
  }
}

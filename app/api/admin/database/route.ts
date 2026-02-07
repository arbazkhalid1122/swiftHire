import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Newsletter from '@/models/Newsletter';
import ActivityLog from '@/models/ActivityLog';
import OTP from '@/models/OTP';
import PasswordReset from '@/models/PasswordReset';
import { verifyAuth } from '@/middleware/auth';
import mongoose from 'mongoose';

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

    // Get database connection info
    const db = mongoose.connection.db;
    const adminDb = db?.admin();

    // Get collection stats
    const collections = await db?.listCollections().toArray();
    const collectionStats: any[] = [];

    if (collections && db) {
      for (const collection of collections) {
        const collectionObj = db.collection(collection.name);
        // Use type assertion for stats() method which exists but TypeScript types may not include
        const stats = await (collectionObj as any).stats();
        const count = await collectionObj.countDocuments();
        collectionStats.push({
          name: collection.name,
          count,
          size: stats?.size || 0,
          storageSize: stats?.storageSize || 0,
          indexes: stats?.nindexes || 0,
        });
      }
    }

    // Get model counts
    const modelCounts = {
      users: await User.countDocuments(),
      newsletters: await Newsletter.countDocuments(),
      activityLogs: await ActivityLog.countDocuments(),
      otps: await OTP.countDocuments(),
      passwordResets: await PasswordReset.countDocuments(),
    };

    // Get database size
    const dbStats = await db?.stats();

    // Get expired/old records
    const expiredOTPs = await OTP.countDocuments({
      expiresAt: { $lt: new Date() },
    });

    const expiredPasswordResets = await PasswordReset.countDocuments({
      expiresAt: { $lt: new Date() },
    });

    return NextResponse.json(
      {
        connection: {
          name: db?.databaseName,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          readyState: mongoose.connection.readyState,
        },
        stats: {
          dataSize: dbStats?.dataSize || 0,
          storageSize: dbStats?.storageSize || 0,
          indexes: dbStats?.indexes || 0,
          indexSize: dbStats?.indexSize || 0,
        },
        collections: collectionStats,
        modelCounts,
        cleanup: {
          expiredOTPs,
          expiredPasswordResets,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Get database info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database information' },
      { status: 500 }
    );
  }
}

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

    const adminUser = await User.findById(auth.userId);
    if (!adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'cleanup-expired-otps') {
      const result = await OTP.deleteMany({
        expiresAt: { $lt: new Date() },
        isUsed: true,
      });
      return NextResponse.json(
        {
          message: 'Expired OTPs cleaned up',
          deleted: result.deletedCount,
        },
        { status: 200 }
      );
    }

    if (action === 'cleanup-expired-resets') {
      const result = await PasswordReset.deleteMany({
        expiresAt: { $lt: new Date() },
        isUsed: true,
      });
      return NextResponse.json(
        {
          message: 'Expired password resets cleaned up',
          deleted: result.deletedCount,
        },
        { status: 200 }
      );
    }

    if (action === 'cleanup-old-logs') {
      const days = parseInt(body.days || '90');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      const result = await ActivityLog.deleteMany({
        createdAt: { $lt: cutoffDate },
      });
      return NextResponse.json(
        {
          message: 'Old activity logs cleaned up',
          deleted: result.deletedCount,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Database action error:', error);
    return NextResponse.json(
      { error: 'Failed to perform database action' },
      { status: 500 }
    );
  }
}


import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // 45 seconds socket timeout
      family: 4, // Use IPv4, skip IPv6
      retryWrites: true,
      retryReads: true,
      connectTimeoutMS: 10000, // 10 seconds connection timeout
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    }).catch((error: any) => {
      console.error('❌ MongoDB connection error:', error.message);
      console.error('Connection string format:', MONGODB_URI ? 'Set (hidden)' : 'NOT SET');
      
      // Provide helpful error messages
      if (error.code === 'ESERVFAIL' || error.message.includes('ESERVFAIL')) {
        console.error('💡 DNS Resolution Error - Possible solutions:');
        console.error('   1. Check your internet connection');
        console.error('   2. Verify MongoDB Atlas connection string is correct');
        console.error('   3. Check if MongoDB Atlas IP whitelist includes your IP');
        console.error('   4. Try using a different DNS server (8.8.8.8 or 1.1.1.1)');
        console.error('   5. If using VPN, try disconnecting or switching servers');
      }
      
      cached.promise = null;
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    console.error('❌ Failed to establish MongoDB connection:', e?.message || e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;


import mongoose from 'mongoose';
import User from '../models/User';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set.');
  console.error('Please set MONGODB_URI in your .env.local file');
  process.exit(1);
}

async function createAdmin() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Pass@123';
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      // Update existing user to admin if not already admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isVerified = true;
        if (existingAdmin.password !== adminPassword) {
          existingAdmin.password = adminPassword; // Will be hashed by pre-save hook
        }
        await existingAdmin.save();
        console.log('✅ Updated existing user to admin role');
      } else {
        // Update password if needed
        const isPasswordCorrect = await existingAdmin.comparePassword(adminPassword);
        if (!isPasswordCorrect) {
          existingAdmin.password = adminPassword; // Will be hashed by pre-save hook
          await existingAdmin.save();
          console.log('✅ Updated admin password');
        } else {
          console.log('ℹ️  Admin user already exists with correct credentials');
        }
      }
    } else {
      // Create new admin user
      const admin = new User({
        name: adminName,
        email: adminEmail,
        password: adminPassword, // Will be hashed by pre-save hook
        role: 'admin',
        isVerified: true,
      });

      await admin.save();
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n📋 Admin Credentials:');
    console.log('   Email: admin@gmail.com');
    console.log('   Password: Pass@123');
    console.log('\n✅ Script completed successfully!');

  } catch (error: any) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.code === 11000) {
      console.error('   User with this email already exists');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Run the script
createAdmin();


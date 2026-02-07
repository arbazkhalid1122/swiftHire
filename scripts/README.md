# Admin User Creation Script

This script creates an admin user with the following credentials:
- **Email**: admin@gmail.com
- **Password**: Pass@123
- **Role**: admin

## Usage

### Option 1: Using npm script (Recommended)
```bash
npm run create-admin
```

### Option 2: Direct execution
```bash
node scripts/create-admin.js
```

## Requirements

1. Make sure your `.env.local` file exists with `MONGODB_URI` set:
   ```env
   MONGODB_URI=mongodb://localhost:27017/swift-hire
   # or for MongoDB Atlas:
   # MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swift-hire
   ```

2. MongoDB should be running and accessible.

## What the script does

1. Connects to MongoDB using the `MONGODB_URI` from `.env.local`
2. Checks if an admin user with email `admin@gmail.com` already exists
3. If exists:
   - Updates the user to admin role if not already admin
   - Updates password if it's different
4. If doesn't exist:
   - Creates a new admin user with the specified credentials
5. Password is automatically hashed using bcrypt

## Notes

- The script is idempotent - you can run it multiple times safely
- If the admin user already exists with correct credentials, it will just confirm
- The password will be hashed automatically before saving to the database


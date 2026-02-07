# SwiftHire Pro - Full-Stack Job Platform

A complete job recruitment platform built with Next.js, TypeScript, and MongoDB.

## Features

### User Side
- ✅ User Registration with OTP Verification
- ✅ Login with OTP Verification
- ✅ Password Recovery (Forgot Password)
- ✅ Profile Management
- ✅ Newsletter Subscription
- ✅ Job Search & Browsing
- ✅ Job Applications
- ✅ Video CV Creation
- ✅ Messaging System

### Company Side (Admin)
- ✅ Newsletter Subscriber Management
- ✅ User Management
- ✅ Database Management Interface

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT Tokens, OTP via Email
- **Email**: Nodemailer (SMTP)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up MongoDB

#### Option A: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/swift-hire`

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Get your connection string

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/swift-hire
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/swift-hire

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=SwiftHire Pro <your-email@gmail.com>

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Email Setup (Gmail Example)

For Gmail, you need to:
1. Enable 2-Step Verification
2. Generate an App Password:
   - Go to Google Account → Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `SMTP_PASS`

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user (sends OTP)
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with OTP

### User
- `GET /api/users/profile` - Get user profile (requires auth)
- `PUT /api/users/profile` - Update user profile (requires auth)

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe to newsletter

### Admin
- `GET /api/admin/newsletter` - Get newsletter subscribers (requires admin)

## Database Models

### User
- name, email, password (hashed)
- phone, location, bio
- isVerified, role (user/admin)
- timestamps

### OTP
- email, otp, type (registration/login/password-reset)
- expiresAt, isUsed
- Auto-expires after 10 minutes

### Newsletter
- email, isActive
- subscribedAt, unsubscribedAt

### PasswordReset
- email, token
- expiresAt, isUsed
- Auto-expires after 1 hour

## Project Structure

```
swift-hire/
├── app/
│   ├── api/              # API routes
│   ├── components/        # React components
│   ├── profile/          # Profile page
│   ├── reset-password/   # Password reset page
│   └── ...
├── lib/                  # Utilities (MongoDB, email, utils)
├── models/               # Mongoose models
├── middleware/           # Auth middleware
└── public/               # Static files
```

## Authentication Flow

1. **Registration**:
   - User fills registration form
   - OTP sent to email
   - User verifies OTP
   - Account created and JWT token issued

2. **Login**:
   - User enters email/password
   - OTP sent to email
   - User verifies OTP
   - JWT token issued

3. **Password Reset**:
   - User requests password reset
   - OTP sent to email
   - User verifies OTP
   - User sets new password

## Production Deployment

### Environment Variables
Make sure to set all environment variables in your hosting platform:
- Vercel: Project Settings → Environment Variables
- Other platforms: Follow their documentation

### MongoDB
- Use MongoDB Atlas for production
- Whitelist your server IP addresses
- Use strong connection strings

### Email Service
- Consider using services like SendGrid, Resend, or AWS SES for production
- Update SMTP configuration accordingly

## Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ OTP expiration (10 minutes)
- ✅ Email verification
- ✅ Protected API routes
- ✅ Input validation

## Next Steps

1. Set up MongoDB database
2. Configure email service
3. Test all authentication flows
4. Deploy to production
5. Set up admin panel UI (optional)

## Support

For issues or questions, please check the code comments or create an issue in the repository.

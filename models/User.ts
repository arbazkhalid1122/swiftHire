import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: string;
  bio?: string;
  isVerified: boolean;
  role: 'user' | 'admin';
  userType: 'company' | 'candidate';
  // Company fields
  companyName?: string;
  companyDescription?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;
  companyCourses?: Array<{
    title: string;
    description?: string;
    url?: string;
  }>;
  // Candidate fields
  education?: string; // e.g., "Laurea", "Diploma"
  skills?: string[];
  cvUrl?: string;
  videoCvUrl?: string;
  profilePhotoUrl?: string;
  cvProfile?: {
    headline?: string;
    summary?: string;
    desiredRole?: string;
    dateOfBirth?: string;
    nationality?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    githubUrl?: string;
    expectedSalary?: string;
    availability?: string;
    preferredWorkMode?: string;
    strengths?: string[];
    achievements?: string[];
    projects?: Array<{
      name?: string;
      role?: string;
      description?: string;
      technologies?: string;
      link?: string;
    }>;
  };
  calculatedExperience?: number; // Calculated years of experience (non-overlapping)
  cvExtractedData?: {
    extractedAt: Date;
    skills: string[];
    education: string[];
    experience: Array<{
      company?: string;
      position?: string;
      duration?: string;
      description?: string;
    }>;
    languages?: string[];
    certifications?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    userType: {
      type: String,
      enum: ['company', 'candidate'],
      required: [true, 'User type is required'],
    },
    // Company fields
    companyName: {
      type: String,
      trim: true,
    },
    companyDescription: {
      type: String,
      trim: true,
    },
    companyWebsite: {
      type: String,
      trim: true,
    },
    companyLogoUrl: {
      type: String,
      trim: true,
    },
    companyCourses: [{
      title: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
      },
      url: {
        type: String,
        trim: true,
      },
    }],
    // Candidate fields
    education: {
      type: String,
      trim: true,
    },
    skills: [String],
    languages: [{
      name: String,
      level: String,
    }],
    certifications: [{
      name: String,
      date: String,
    }],
    educationHistory: [{
      degree: String,
      institution: String,
      field: String,
      startDate: Date,
      endDate: Date,
      isCurrent: Boolean,
      description: String,
    }],
    cvUrl: {
      type: String,
    },
    videoCvUrl: {
      type: String,
    },
    profilePhotoUrl: {
      type: String,
      trim: true,
    },
    cvProfile: {
      headline: String,
      summary: String,
      desiredRole: String,
      dateOfBirth: String,
      nationality: String,
      linkedinUrl: String,
      portfolioUrl: String,
      githubUrl: String,
      expectedSalary: String,
      availability: String,
      preferredWorkMode: String,
      strengths: [String],
      achievements: [String],
      projects: [{
        name: String,
        role: String,
        description: String,
        technologies: String,
        link: String,
      }],
    },
    calculatedExperience: {
      type: Number,
      default: 0,
    },
    cvExtractedData: {
      extractedAt: Date,
      skills: [String],
      education: [String],
      experience: [{
        company: String,
        position: String,
        duration: String,
        description: String,
      }],
      languages: [String],
      certifications: [String],
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  const password = this.password as string;
  this.password = await bcrypt.hash(password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  const password = this.password as string;
  return await bcrypt.compare(candidatePassword, password);
};

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

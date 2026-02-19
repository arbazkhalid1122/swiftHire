import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';
import { XMLFeedParser } from '@/lib/xmlFeedParser';

/**
 * POST - Test XML feed parsing
 * Allows admins to test XML feed URLs before adding them as sources
 */
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

    const user = await User.findById(auth.userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { feedUrl, useScrapingBee, scrapingBeeOptions } = body;

    if (!feedUrl) {
      return NextResponse.json(
        { error: 'Feed URL is required' },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(feedUrl);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Test parsing the XML feed
    console.log(`Testing XML feed: ${feedUrl}`);
    const jobs = await XMLFeedParser.fetchXMLFeed(feedUrl, {
      useScrapingBee: useScrapingBee || false,
      scrapingBeeOptions: scrapingBeeOptions,
    });

    if (jobs.length === 0) {
      return NextResponse.json(
        {
          success: true,
          message: 'XML feed parsed successfully but no jobs found',
          jobs: [],
          count: 0,
        },
        { status: 200 }
      );
    }

    // Return sample jobs (limit to 5 for preview)
    const sampleJobs = jobs.slice(0, 5).map(job => ({
      title: job.title,
      company: job.company,
      location: job.location,
      salary: job.salary,
      jobType: job.jobType,
      externalId: job.externalId,
      externalUrl: job.externalUrl,
      description: job.description.substring(0, 200) + (job.description.length > 200 ? '...' : ''),
    }));

    return NextResponse.json(
      {
        success: true,
        message: `Successfully parsed XML feed. Found ${jobs.length} job(s).`,
        jobs: sampleJobs,
        count: jobs.length,
        hasMore: jobs.length > 5,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Test XML feed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to test XML feed',
        message: error.message,
        details: error.stack,
      },
      { status: 500 }
    );
  }
}



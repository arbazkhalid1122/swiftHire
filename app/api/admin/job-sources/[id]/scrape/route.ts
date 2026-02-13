import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import JobSource from '@/models/JobSource';
import { verifyAuth } from '@/middleware/auth';
import User from '@/models/User';
import { JobScraper } from '@/lib/jobScraper';

// POST - Manually trigger scraping for a source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const source = await JobSource.findById(id);

    if (!source) {
      return NextResponse.json(
        { error: 'Job source not found' },
        { status: 404 }
      );
    }

    if (!source.isActive) {
      return NextResponse.json(
        { error: 'Job source is not active' },
        { status: 400 }
      );
    }

    // Trigger scraping (run in background)
    const result = await JobScraper.scrapeSource(id);

    return NextResponse.json(
      {
        message: 'Scraping completed',
        success: result.success,
        errors: result.errors,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Scrape job source error:', error);
    
    try {
      const { id } = await params;
      const source = await JobSource.findById(id);
      
      // If it's a Cloudflare error for Jooble, auto-deactivate and provide helpful message
      const isCloudflareError = error.message?.includes('Cloudflare');
      const isJoobleSource = source?.url?.includes('jooble');
      
      if (isCloudflareError && isJoobleSource) {
        // Auto-deactivate Jooble sources that fail due to Cloudflare
        await JobSource.findByIdAndUpdate(id, {
          lastError: error.message,
          isActive: false,
        });
        
        return NextResponse.json(
          { 
            error: error.message || 'Failed to scrape job source',
            suggestion: 'Jooble is blocked by Cloudflare. The source has been deactivated. Please use Indeed RSS feeds instead (more reliable).',
            autoDeactivated: true,
          },
          { status: 500 }
        );
      } else if (error.message && source) {
        // Just update error message for other errors
        await JobSource.findByIdAndUpdate(id, {
          lastError: error.message,
        });
      }
    } catch (dbError) {
      // If we can't update the source, just return the error
      console.error('Error updating source:', dbError);
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to scrape job source',
      },
      { status: 500 }
    );
  }
}


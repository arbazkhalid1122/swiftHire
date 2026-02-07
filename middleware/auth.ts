import { NextRequest } from 'next/server';
import { verifyJWT } from '@/lib/utils';

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

export function verifyAuth(request: NextRequest): { userId: string; email: string } | null {
  const token = getAuthToken(request);
  if (!token) {
    return null;
  }

  const decoded = verifyJWT(token);
  if (!decoded || !decoded.userId) {
    return null;
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
  };
}


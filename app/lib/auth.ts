import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './jwt';

export interface AuthUser {
  userId: number;
  email: string;
}

/**
 * Middleware to verify JWT token from request headers
 * Returns the authenticated user or null
 */
export async function verifyAuth(req: NextRequest): Promise<{ user: AuthUser | null; error?: string }> {
  try {
    const authHeader = req.headers.get('authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return { user: null, error: 'No token provided' };
    }

    const payload = verifyToken(token);

    if (!payload) {
      return { user: null, error: 'Invalid or expired token' };
    }

    return {
      user: {
        userId: payload.userId,
        email: payload.email,
      },
    };
  } catch (error: any) {
    return { user: null, error: error.message || 'Authentication failed' };
  }
}

/**
 * Require authentication - returns error response if not authenticated
 */
export async function requireAuth(req: NextRequest): Promise<{ user: AuthUser | null; error?: string }> {
  const { user, error } = await verifyAuth(req);

  if (!user) {
    return { user: null, error: error || 'Authentication required' };
  }

  return { user };
}

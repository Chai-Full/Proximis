# JWT Authentication Usage

## Overview
The application now uses JWT tokens for authentication. After login, a token is generated and stored in localStorage.

## Client-Side Usage

### Getting the Token
```typescript
import { getLocalToken, getAuthHeader, isAuthenticated } from '@/app/(base)/lib/auth';

// Check if user is authenticated
if (isAuthenticated()) {
  // User is logged in
}

// Get the token
const token = getLocalToken();

// Get Authorization header for API requests
const headers = {
  ...getAuthHeader(),
  'Content-Type': 'application/json',
};
```

### Making Authenticated API Requests
```typescript
import { getAuthHeader } from '@/app/(base)/lib/auth';

const response = await fetch('/api/some-endpoint', {
  method: 'POST',
  headers: {
    ...getAuthHeader(),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

## Server-Side Usage

### Verifying Authentication in API Routes
```typescript
import { verifyAuth, requireAuth } from '@/app/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// Option 1: Verify and handle manually
export async function GET(req: NextRequest) {
  const { user, error } = await verifyAuth(req);
  
  if (!user) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Use user.userId and user.email
  return NextResponse.json({ data: '...' });
}

// Option 2: Require authentication (throws error if not authenticated)
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(req);
  
  if (!user) {
    return NextResponse.json(
      { error: error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Use user.userId and user.email
  return NextResponse.json({ ok: true });
}
```

## Token Storage
- Token is stored in `localStorage` as `proximis_token`
- User ID is stored in `localStorage` as `proximis_userId`
- Both are removed on logout

## Environment Variables
- `JWT_SECRET`: Secret key for signing tokens (default: 'your-secret-key-change-in-production')
- `JWT_EXPIRES_IN`: Token expiration time (default: '7d')

Set these in `.env.local`:
```
JWT_SECRET=your-production-secret-key-here
JWT_EXPIRES_IN=7d
```


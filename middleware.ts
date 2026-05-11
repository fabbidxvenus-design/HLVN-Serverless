import { NextResponse, type NextRequest } from 'next/server';
import { buildCorsHeaders } from './lib/api/cors';

export function middleware(request: NextRequest) {
  const corsHeaders = buildCorsHeaders(request.headers.get('Origin'));

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: '/api/:path*',
};

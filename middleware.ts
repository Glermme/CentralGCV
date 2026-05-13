import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/login')) return NextResponse.next();

  const cookies = request.cookies.getAll();
  const hasAuth = cookies.some(c =>
    c.name.includes('auth-token') ||
    c.name.includes('sb-access-token') ||
    c.name.startsWith('sb-')
  );

  if (!hasAuth) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',],
};

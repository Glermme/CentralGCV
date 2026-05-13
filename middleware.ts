import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Deixa /login e assets passarem sempre
  if (pathname.startsWith('/login')) return NextResponse.next();

  // Verifica cookie de sessão do Supabase
  const token =
    request.cookies.get('sb-access-token')?.value ||
    request.cookies.get('sb-skevzcdrhpblifzdkydj-auth-token')?.value ||
    [...request.cookies.getAll()].find(c => c.name.includes('auth-token'))?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',],
};

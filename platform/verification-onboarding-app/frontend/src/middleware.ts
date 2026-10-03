import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/** Routes that are fully public — no session required */
const PUBLIC_ROUTES = ['/login', '/apply'];

/** Roles permitted to access the dashboard */
const ALLOWED_ROLES = ['admin', 'insurer'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes without auth check
  if (PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Check role from user_metadata or app_metadata
  const role: string =
    (user.app_metadata?.role as string) ??
    (user.user_metadata?.role as string) ??
    '';

  if (!ALLOWED_ROLES.includes(role)) {
    // Authenticated but wrong role — redirect to login with error
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files with extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

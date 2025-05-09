import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = 
    path === "/" || 
    path === "/login" || 
    path === "/register" ||
    path.startsWith("/api/auth") ||
    path.startsWith("/products");
  
  // Get the session token
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET 
  });

  // Redirect unauthenticated users from protected routes to login
  if (!token && !isPublicPath) {
    return NextResponse.redirect(
      new URL(`/login?redirectTo=${path}`, request.url)
    );
  }

  // Check for admin routes
  if (path.startsWith("/admin")) {
    // If user is not an admin, redirect to homepage
    if (token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return NextResponse.next();
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

export type Permission = "USER" | "ADMIN";

/**
 * Checks if the current user has the required permission
 */
export async function checkPermission(
  req: NextRequest,
  requiredPermission: Permission = "USER" 
): Promise<{ 
  authorized: boolean;
  response?: NextResponse;
}> {
  const session = await getServerSession(authOptions);

  // Check if user is authenticated
  if (!session?.user?.id) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    };
  }

  // For admin endpoints, verify the user is an admin
  if (requiredPermission === "ADMIN" && session.user.role !== "ADMIN") {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      )
    };
  }

  // User is authorized
  return { authorized: true };
}

/**
 * Higher-order function to protect API routes with permission checks
 */
export function withPermission(
  handler: (req: NextRequest, context: any) => Promise<NextResponse>,
  requiredPermission: Permission = "USER"
) {
  return async function(req: NextRequest, context: any) {
    const { authorized, response } = await checkPermission(req, requiredPermission);
    
    if (!authorized && response) {
      return response;
    }
    
    return handler(req, context);
  };
} 
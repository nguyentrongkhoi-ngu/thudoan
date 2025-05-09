'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: ReactNode;
  adminOnly?: boolean;
  fallbackUrl?: string;
}

export default function ProtectedRoute({ 
  children, 
  adminOnly = false,
  fallbackUrl = '/login'
}: ProtectedRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading
    if (isLoading) return;

    // Redirect if not authenticated
    if (!isAuthenticated) {
      router.push(`${fallbackUrl}?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Redirect if not admin but route requires admin
    if (adminOnly && !isAdmin) {
      router.push('/');
    }
  }, [isAuthenticated, isAdmin, isLoading, adminOnly, router, fallbackUrl]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show content only if authenticated and has proper permissions
  if (!isAuthenticated || (adminOnly && !isAdmin)) {
    return null;
  }

  return <>{children}</>;
} 
'use client';

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if not an admin (this is a backup for the middleware)
  if (!isLoading && !isAdmin) {
    router.push('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white p-4">
        <div className="text-xl font-bold mb-6">Quản Trị Hệ Thống</div>
        <nav className="space-y-2">
          <Link 
            href="/admin" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Tổng Quan
          </Link>
          <Link 
            href="/admin/users" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Quản Lý Người Dùng
          </Link>
          <Link 
            href="/admin/categories" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Quản Lý Danh Mục
          </Link>
          <Link 
            href="/admin/products" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Quản Lý Sản Phẩm
          </Link>
          <Link 
            href="/admin/orders" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Quản Lý Đơn Hàng
          </Link>
          <Link 
            href="/admin/coupons" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors"
          >
            Quản Lý Mã Giảm Giá
          </Link>
          <Link 
            href="/" 
            className="block p-2 rounded hover:bg-gray-700 transition-colors mt-8"
          >
            Quay Lại Website
          </Link>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
} 
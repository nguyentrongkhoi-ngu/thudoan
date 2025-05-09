'use client';

import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

type Order = {
  id: string;
  customer: string;
  total: number;
  status: string;
}

type Stats = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  recentOrders: Order[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        
        // Lấy dữ liệu tổng quan từ API
        const response = await axios.get('/api/admin/dashboard');
        const data = response.data;
        
        if (data) {
          setStats({
            totalUsers: data.totalUsers || 0,
            totalProducts: data.totalProducts || 0,
            totalOrders: data.totalOrders || 0,
            recentOrders: data.recentOrders || [],
          });
        } else {
          console.warn('Dữ liệu API không đúng cấu trúc mong đợi:', data);
          setError('Cấu trúc dữ liệu không đúng định dạng');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu tổng quan:', err);
        setError('Không thể tải dữ liệu tổng quan');
        setLoading(false);
      }
    }
    
    fetchDashboardData();
  }, []);

  const handleViewOrder = (orderId: string) => {
    router.push(`/admin/orders/${orderId}`);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold mb-6">Tổng Quan Quản Trị</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            title="Tổng Người Dùng" 
            value={stats.totalUsers} 
            icon="👤"
            color="bg-blue-500" 
          />
          <StatCard 
            title="Tổng Sản Phẩm" 
            value={stats.totalProducts} 
            icon="📦"
            color="bg-green-500" 
          />
          <StatCard 
            title="Tổng Đơn Hàng" 
            value={stats.totalOrders} 
            icon="🛒"
            color="bg-purple-500" 
          />
        </div>
        
        {/* Recent Orders */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Đơn Hàng Gần Đây</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left border-b">Mã Đơn Hàng</th>
                  <th className="py-2 px-4 text-left border-b">Khách Hàng</th>
                  <th className="py-2 px-4 text-left border-b">Tổng Tiền</th>
                  <th className="py-2 px-4 text-left border-b">Trạng Thái</th>
                  <th className="py-2 px-4 text-left border-b">Hành Động</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.length > 0 ? (
                  stats.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="py-2 px-4 border-b">{order.id}</td>
                      <td className="py-2 px-4 border-b">{order.customer}</td>
                      <td className="py-2 px-4 border-b">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-2 px-4 border-b">
                        <button 
                          className="text-blue-500 hover:text-blue-700"
                          onClick={() => handleViewOrder(order.id)}
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-4 px-4 text-center text-gray-500">
                      Không có đơn hàng nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`${color} text-white p-3 rounded-lg mr-4`}>
          <span className="text-2xl">{icon}</span>
        </div>
        <div>
          <div className="text-gray-500 text-sm">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let color = "";
  let text = "";
  
  switch (status) {
    case "COMPLETED":
      color = "bg-green-100 text-green-800";
      text = "Hoàn Thành";
      break;
    case "PROCESSING":
      color = "bg-blue-100 text-blue-800";
      text = "Đang Xử Lý";
      break;
    case "PENDING":
      color = "bg-yellow-100 text-yellow-800";
      text = "Chờ Xử Lý";
      break;
    case "CANCELLED":
      color = "bg-red-100 text-red-800";
      text = "Đã Hủy";
      break;
    default:
      color = "bg-gray-100 text-gray-800";
      text = status;
  }

  return (
    <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
      {text}
    </span>
  );
} 
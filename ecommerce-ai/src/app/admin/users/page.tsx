'use client';

import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import axios from "axios";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const response = await axios.get('/api/admin/users');
        const data = response.data;
        
        if (data.users) {
          setUsers(data.users);
        } else {
          // Phòng trường hợp API trả về cấu trúc khác
          console.warn('Dữ liệu API không đúng cấu trúc mong đợi:', data);
          setError('Cấu trúc dữ liệu không đúng định dạng');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi tải danh sách người dùng:', err);
        setError('Không thể tải danh sách người dùng');
        setLoading(false);
      }
    }
    
    fetchUsers();
  }, []);

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const response = await axios.patch(`/api/admin/users/${userId}`, { 
        role: newRole 
      });
      
      if (response.status === 200) {
        // Cập nhật state local với dữ liệu mới từ server
        const updatedUser = response.data.user;
        setUsers(users.map(user => 
          user.id === userId ? updatedUser : user
        ));
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật vai trò người dùng:', err);
      alert('Không thể cập nhật vai trò người dùng. Vui lòng thử lại.');
    }
  }

  async function handleDeleteUser(userId: string) {
    if (confirm('Bạn có chắc chắn muốn xóa người dùng này không?')) {
      try {
        const response = await axios.delete(`/api/admin/users/${userId}`);
        
        if (response.status === 200) {
          // Xóa người dùng khỏi state local nếu xóa thành công trên server
          setUsers(users.filter(user => user.id !== userId));
        }
      } catch (err) {
        console.error('Lỗi khi xóa người dùng:', err);
        alert('Không thể xóa người dùng. Vui lòng thử lại.');
      }
    }
  }

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản Lý Người Dùng</h1>
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded">
            Thêm Người Dùng Mới
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left border-b">Tên</th>
                <th className="py-3 px-4 text-left border-b">Email</th>
                <th className="py-3 px-4 text-left border-b">Vai Trò</th>
                <th className="py-3 px-4 text-left border-b">Ngày Tạo</th>
                <th className="py-3 px-4 text-left border-b">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map(user => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">{user.name}</td>
                    <td className="py-3 px-4 border-b">{user.email}</td>
                    <td className="py-3 px-4 border-b">
                      <select 
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="border rounded py-1 px-2"
                      >
                        <option value="USER">Người Dùng</option>
                        <option value="ADMIN">Quản Trị Viên</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 border-b">
                      {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <button className="text-blue-500 hover:text-blue-700 mr-3">
                        Sửa
                      </button>
                      <button 
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-4 px-4 text-center text-gray-500">
                    Không có người dùng nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
} 
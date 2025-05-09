'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Tag, Edit, Trash2, Plus, AlertTriangle, Check, X, Calendar, Percent, DollarSign, Activity, Clock, CheckCircle2, Info, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Định nghĩa kiểu dữ liệu
type Coupon = {
  id: string;
  code: string;
  description?: string;
  discountPercent?: number;
  discountAmount?: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
  usageLimit?: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
};

// Định nghĩa kiểu dữ liệu cho toast
type ToastType = {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
} | null;

export default function CouponsPage() {
  const { isAdmin, isLoading } = useAuth();
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCoupon, setCurrentCoupon] = useState<Partial<Coupon>>({
    code: '',
    description: '',
    isActive: true,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [error, setError] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [toast, setToast] = useState<ToastType>(null);

  // Kiểm tra quyền admin
  useEffect(() => {
    if (!isLoading) {
      if (!isAdmin) {
        router.push('/');
        return;
      }
      
      fetchCoupons();
    }
  }, [isAdmin, isLoading, router, filter]);

  // Lấy danh sách mã giảm giá
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      let url = '/api/admin/coupons';
      
      if (filter === 'active') {
        url += '?isActive=true';
      } else if (filter === 'inactive') {
        url += '?isActive=false';
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Không thể lấy danh sách mã giảm giá');
      }
      
      const data = await response.json();
      
      // Chuyển đổi ngày thành định dạng chuỗi
      const formattedData = data.map((coupon: any) => ({
        ...coupon,
        startDate: new Date(coupon.startDate).toISOString(),
        endDate: new Date(coupon.endDate).toISOString(),
        createdAt: new Date(coupon.createdAt).toISOString(),
        updatedAt: new Date(coupon.updatedAt).toISOString(),
      }));
      
      setCoupons(formattedData);
    } catch (error) {
      console.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Mở modal để tạo mã giảm giá mới
  const handleCreateNew = () => {
    try {
      // Tạo đối tượng Date cho ngày hiện tại và ngày kết thúc (30 ngày sau)
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);
      
      // Format dates to YYYY-MM-DD for input[type=date]
      const formatDateForInput = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Reset form về giá trị mặc định
      setCurrentCoupon({
        code: '',
        description: '',
        isActive: true,
        startDate: formatDateForInput(today),
        endDate: formatDateForInput(thirtyDaysLater),
        // Các trường số để undefined để tránh lỗi validation
        discountPercent: undefined,
        discountAmount: undefined,
        minOrderAmount: undefined,
        maxDiscount: undefined,
        usageLimit: undefined,
        usageCount: 0
      });
      
      console.log('Initial coupon state:', {
        startDate: formatDateForInput(today),
        endDate: formatDateForInput(thirtyDaysLater)
      });
      
      setIsEditing(false);
      setShowModal(true);
      setError({}); // Reset lỗi
    } catch (error) {
      console.error('Error in handleCreateNew:', error);
      setToast({
        show: true,
        message: 'Có lỗi xảy ra khi khởi tạo form tạo mã giảm giá',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Mở modal để chỉnh sửa mã giảm giá
  const handleEdit = (coupon: Coupon) => {
    try {
      // Format date to YYYY-MM-DD for input[type=date]
      const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // Create a copy of the coupon with properly formatted dates
      setCurrentCoupon({
        ...coupon,
        startDate: formatDateForInput(coupon.startDate),
        endDate: formatDateForInput(coupon.endDate),
      });
      
      console.log('Editing coupon:', {
        ...coupon,
        startDate: formatDateForInput(coupon.startDate),
        endDate: formatDateForInput(coupon.endDate),
      });
      
      setIsEditing(true);
      setShowModal(true);
      setError({});
    } catch (error) {
      console.error('Error in handleEdit:', error);
      setToast({
        show: true,
        message: 'Có lỗi xảy ra khi tải thông tin mã giảm giá',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Xử lý thay đổi trạng thái active/inactive
  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const response = await fetch('/api/admin/coupons', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: coupon.id,
          isActive: !coupon.isActive,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Không thể cập nhật trạng thái mã giảm giá');
      }
      
      // Cập nhật trạng thái trong danh sách
      setCoupons(coupons.map(c => 
        c.id === coupon.id ? { ...c, isActive: !c.isActive } : c
      ));
      
      setToast({
        show: true,
        message: `Đã ${!coupon.isActive ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá ${coupon.code}`,
        type: 'success',
      });
      
      // Tự động ẩn toast sau 3 giây
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái:', error);
      setToast({
        show: true,
        message: error instanceof Error ? error.message : 'Không thể cập nhật trạng thái mã giảm giá',
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  // Xử lý xóa mã giảm giá
  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/coupons/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Có lỗi xảy ra khi xóa mã giảm giá');
      }
      
      fetchCoupons();
      setDeleteConfirm(null);
      
      setToast({
        show: true,
        message: 'Đã xóa mã giảm giá thành công',
        type: 'success',
      });
      
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      setToast({
        show: true,
        message: error instanceof Error ? error.message : 'Có lỗi xảy ra khi xóa mã giảm giá',
        type: 'error',
      });
      
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Xử lý cập nhật thông tin form
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setCurrentCoupon({ ...currentCoupon, [name]: checked });
    } else if (type === 'number') {
      // Xử lý trường hợp giá trị số
      if (value === '') {
        // Nếu trường input trống, đặt giá trị là undefined để loại bỏ giá trị cũ
        setCurrentCoupon({ ...currentCoupon, [name]: undefined });
      } else {
        // Nếu có giá trị, chuyển đổi thành số
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          // Giới hạn discountPercent không vượt quá 100
          if (name === 'discountPercent' && numValue > 100) {
            setCurrentCoupon({ ...currentCoupon, [name]: 100 });
          } else {
            setCurrentCoupon({ ...currentCoupon, [name]: numValue });
          }
        }
      }
    } else {
      // Xử lý các trường khác (text, date, ...)
      setCurrentCoupon({ ...currentCoupon, [name]: value });
    }
    
    // Log để debug
    setTimeout(() => {
      console.log('Updated coupon state after change:', currentCoupon);
    }, 100);
  };

  // Kiểm tra form hợp lệ
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    // Validate mã giảm giá
    if (!currentCoupon.code) {
      newErrors.code = 'Mã giảm giá không được để trống';
    } else if (currentCoupon.code.length < 3) {
      newErrors.code = 'Mã giảm giá phải có ít nhất 3 ký tự';
    }
    
    // Validate giảm giá (phải có ít nhất một loại)
    if (
      (currentCoupon.discountPercent === undefined || currentCoupon.discountPercent === null || currentCoupon.discountPercent === 0) && 
      (currentCoupon.discountAmount === undefined || currentCoupon.discountAmount === null || currentCoupon.discountAmount === 0)
    ) {
      newErrors.discount = 'Phải có ít nhất một loại giảm giá (phần trăm hoặc số tiền cố định)';
    }
    
    // Validate phần trăm giảm giá
    if (currentCoupon.discountPercent !== undefined && currentCoupon.discountPercent !== null) {
      if (currentCoupon.discountPercent <= 0) {
        newErrors.discountPercent = 'Phần trăm giảm giá phải lớn hơn 0';
      } else if (currentCoupon.discountPercent > 100) {
        newErrors.discountPercent = 'Phần trăm giảm giá không được vượt quá 100%';
      }
    }
    
    // Validate số tiền giảm giá
    if (currentCoupon.discountAmount !== undefined && currentCoupon.discountAmount !== null && currentCoupon.discountAmount <= 0) {
      newErrors.discountAmount = 'Số tiền giảm giá phải lớn hơn 0';
    }
    
    // Validate ngày bắt đầu
    if (!currentCoupon.startDate) {
      newErrors.startDate = 'Ngày bắt đầu không được để trống';
    } else {
      try {
        // Kiểm tra định dạng và hợp lệ của ngày bắt đầu
        const startDate = new Date(currentCoupon.startDate);
        if (isNaN(startDate.getTime())) {
          newErrors.startDate = 'Ngày bắt đầu không hợp lệ';
        }
        console.log('Start date validation:', currentCoupon.startDate, startDate);
      } catch (err) {
        console.error('Error validating start date:', err);
        newErrors.startDate = 'Ngày bắt đầu không hợp lệ';
      }
    }
    
    // Validate ngày kết thúc
    if (!currentCoupon.endDate) {
      newErrors.endDate = 'Ngày kết thúc không được để trống';
    } else {
      try {
        // Kiểm tra định dạng và hợp lệ của ngày kết thúc
        const endDate = new Date(currentCoupon.endDate);
        if (isNaN(endDate.getTime())) {
          newErrors.endDate = 'Ngày kết thúc không hợp lệ';
        }
        console.log('End date validation:', currentCoupon.endDate, endDate);
        
        // Kiểm tra ngày kết thúc phải sau ngày bắt đầu
        if (currentCoupon.startDate && !newErrors.startDate && !newErrors.endDate) {
          const startDate = new Date(currentCoupon.startDate);
          if (startDate >= endDate) {
            newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
          }
        }
      } catch (err) {
        console.error('Error validating end date:', err);
        newErrors.endDate = 'Ngày kết thúc không hợp lệ';
      }
    }
    
    console.log('Form validation errors:', newErrors);
    console.log('Current coupon state:', currentCoupon);
    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý lưu mã giảm giá
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    // Prevent multiple submissions
    if (loading) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Xử lý định dạng ngày tháng
      const formatDateForServer = (dateString: string) => {
        if (!dateString) return null;
        
        try {
          // Tạo đối tượng Date từ chuỗi ngày (format YYYY-MM-DD)
          const parts = dateString.split('-');
          if (parts.length !== 3) {
            throw new Error(`Invalid date format: ${dateString}`);
          }
          
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Tháng trong JS Date là từ 0-11
          const day = parseInt(parts[2]);
          
          if (isNaN(year) || isNaN(month) || isNaN(day)) {
            throw new Error(`Invalid date parts: ${year}-${month+1}-${day}`);
          }
          
          // Tạo ngày ở định dạng UTC
          const date = new Date(Date.UTC(year, month, day));
          console.log(`Created date object for ${dateString}:`, date.toISOString());
          return date.toISOString();
        } catch (err) {
          console.error(`Error formatting date ${dateString}:`, err);
          throw new Error(`Ngày không hợp lệ: ${dateString}`);
        }
      };
      
      // Format ngày
      const startDate = formatDateForServer(currentCoupon.startDate as string);
      const endDate = formatDateForServer(currentCoupon.endDate as string);
      
      console.log('Formatted dates:', { startDate, endDate });
      
      // Chuẩn bị dữ liệu payload
      const payload = {
        code: currentCoupon.code?.trim().toUpperCase(),
        description: currentCoupon.description || '',
        isActive: currentCoupon.isActive !== undefined ? currentCoupon.isActive : true,
        startDate,
        endDate,
        discountPercent: typeof currentCoupon.discountPercent === 'number' && currentCoupon.discountPercent > 0 
          ? currentCoupon.discountPercent 
          : null,
        discountAmount: typeof currentCoupon.discountAmount === 'number' && currentCoupon.discountAmount > 0
          ? currentCoupon.discountAmount
          : null,
        minOrderAmount: typeof currentCoupon.minOrderAmount === 'number' && currentCoupon.minOrderAmount > 0
          ? currentCoupon.minOrderAmount
          : null,
        maxDiscount: typeof currentCoupon.maxDiscount === 'number' && currentCoupon.maxDiscount > 0
          ? currentCoupon.maxDiscount
          : null,
        usageLimit: typeof currentCoupon.usageLimit === 'number' && currentCoupon.usageLimit > 0
          ? currentCoupon.usageLimit
          : null
      };
      
      // Thêm ID và usageCount tùy theo trường hợp tạo mới hay cập nhật
      if (isEditing && currentCoupon.id) {
        (payload as any).id = currentCoupon.id;
      } else {
        (payload as any).usageCount = 0;
      }
      
      // Kiểm tra dữ liệu cần thiết
      if (!payload.startDate || !payload.endDate) {
        throw new Error("Ngày bắt đầu và ngày kết thúc là bắt buộc");
      }
      
      if (!payload.discountPercent && !payload.discountAmount) {
        throw new Error("Phải có ít nhất một loại giảm giá (phần trăm hoặc số tiền cố định)");
      }
      
      // Log payload
      console.log(`Final payload to server:`, JSON.stringify(payload, null, 2));
      
      // Gửi request
      const response = await fetch('/api/admin/coupons', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });
      
      console.log('Response status:', response.status);
      
      // Đọc response dưới dạng text trước
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Parse JSON nếu có thể
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('Error parsing response JSON:', e);
        throw new Error('Lỗi khi xử lý phản hồi từ máy chủ');
      }
      
      // Kiểm tra nếu có lỗi
      if (!response.ok) {
        const errorMessage = responseData?.error || 'Có lỗi xảy ra khi lưu mã giảm giá';
        throw new Error(errorMessage);
      }
      
      // Xử lý thành công
      fetchCoupons();
      setShowModal(false);
      setToast({
        show: true,
        message: isEditing ? 'Cập nhật mã giảm giá thành công' : 'Thêm mã giảm giá mới thành công',
        type: 'success',
      });
      setTimeout(() => setToast(null), 3000);
    } catch (error) {
      console.error('Error saving coupon:', error);
      
      // Xử lý lỗi
      let errorMessage = 'Có lỗi xảy ra khi lưu mã giảm giá';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      setToast({
        show: true,
        message: errorMessage,
        type: 'error',
      });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Format tiền tệ
  const formatCurrency = (amount?: number) => {
    if (amount === undefined) return '';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Format ngày tháng
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: vi });
  };

  // Kiểm tra mã giảm giá có còn hiệu lực không
  const isExpired = (endDate: string) => {
    return new Date(endDate) < new Date();
  };

  // Render toast notification
  const renderToast = () => {
    if (!toast?.show) return null;
    
    const icons = {
      success: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      error: <XCircle className="h-5 w-5 text-red-500" />,
      info: <Info className="h-5 w-5 text-blue-500" />
    };
    
    const bgColors = {
      success: 'bg-green-50',
      error: 'bg-red-50',
      info: 'bg-blue-50'
    };
    
    const borderColors = {
      success: 'border-green-200',
      error: 'border-red-200',
      info: 'border-blue-200'
    };
    
    return (
      <div className="fixed top-4 right-4 z-50 animate-in fade-in slide-in-from-top duration-300">
        <div className={`flex items-center gap-2 rounded-md border p-4 shadow-sm ${bgColors[toast.type]} ${borderColors[toast.type]}`}>
          {icons[toast.type]}
          <span className="text-sm font-medium">{toast.message}</span>
          <button 
            onClick={() => setToast(null)} 
            className="ml-4 rounded-full p-1 hover:bg-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  // Nếu đang loading
  if (loading || isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Quản lý mã giảm giá</h1>
          <button
            onClick={handleCreateNew}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center"
          >
            <Plus size={18} className="mr-1" />
            Tạo mã giảm giá mới
          </button>
        </div>
        
        {/* Bộ lọc */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 rounded ${filter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-3 py-2 rounded ${filter === 'active' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Đang hoạt động
          </button>
          <button
            onClick={() => setFilter('inactive')}
            className={`px-3 py-2 rounded ${filter === 'inactive' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Không hoạt động
          </button>
        </div>
        
        {coupons.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Tag size={48} className="mx-auto mb-4 text-gray-300" />
            <h2 className="text-xl font-semibold mb-2">Không có mã giảm giá nào</h2>
            <p className="text-gray-500 mb-4">
              Hãy tạo mã giảm giá đầu tiên của bạn để thu hút khách hàng
            </p>
            <button
              onClick={handleCreateNew}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center mx-auto"
            >
              <Plus size={18} className="mr-1" />
              Tạo mã giảm giá
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mã</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Mô tả</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Giảm giá</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Thời gian</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Sử dụng</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Trạng thái</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {coupons.map((coupon) => (
                    <tr key={coupon.id} className={`hover:bg-gray-50 ${isExpired(coupon.endDate) ? 'text-gray-400' : ''}`}>
                      <td className="px-5 py-4 whitespace-nowrap font-medium">{coupon.code}</td>
                      <td className="px-5 py-4 whitespace-nowrap truncate max-w-xs">{coupon.description}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {coupon.discountPercent ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <Percent size={14} className="mr-1" />
                            {coupon.discountPercent}%
                          </span>
                        ) : coupon.discountAmount ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <DollarSign size={14} className="mr-1" />
                            {formatCurrency(coupon.discountAmount)}
                          </span>
                        ) : null}
                        {coupon.minOrderAmount && (
                          <div className="text-xs mt-1">
                            Min: {formatCurrency(coupon.minOrderAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col text-xs">
                          <div className="flex items-center">
                            <Calendar size={12} className="mr-1" />
                            <span>{formatDate(coupon.startDate)}</span>
                          </div>
                          <div className="flex items-center mt-1">
                            <Calendar size={12} className="mr-1" />
                            <span>{formatDate(coupon.endDate)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <div className="flex items-center text-xs">
                            <Activity size={12} className="mr-1" />
                            <span>
                              {coupon.usageCount}/{coupon.usageLimit || '∞'}
                            </span>
                          </div>
                          {coupon.usageLimit && (
                            <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                              <div 
                                className="bg-blue-600 h-1.5 rounded-full" 
                                style={{ width: `${Math.min(100, (coupon.usageCount / coupon.usageLimit) * 100)}%` }}
                              ></div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {isExpired(coupon.endDate) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Hết hạn
                          </span>
                        ) : coupon.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Check size={12} className="mr-1" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <X size={12} className="mr-1" />
                            Vô hiệu
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(coupon)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Chỉnh sửa"
                          >
                            <Edit size={16} />
                          </button>
                          
                          {!isExpired(coupon.endDate) && (
                            <button
                              onClick={() => handleToggleActive(coupon)}
                              className={`${coupon.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              title={coupon.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                            >
                              {coupon.isActive ? <X size={16} /> : <Check size={16} />}
                            </button>
                          )}
                          
                          <button
                            onClick={() => setDeleteConfirm(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Modal tạo/chỉnh sửa mã giảm giá */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">
                    {isEditing ? 'Chỉnh sửa mã giảm giá' : 'Tạo mã giảm giá mới'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="form-control">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mã giảm giá
                    </label>
                    <input
                      type="text"
                      name="code"
                      value={currentCoupon.code || ''}
                      onChange={handleChange}
                      placeholder="Nhập mã giảm giá (ví dụ: SUMMER20)"
                      className={`w-full px-3 py-2 border ${error.code ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      disabled={isEditing}
                    />
                    {error.code && <span className="text-xs text-red-500 mt-1">{error.code}</span>}
                    {isEditing && <span className="text-xs text-gray-500 mt-1">Không thể chỉnh sửa mã giảm giá sau khi đã tạo</span>}
                  </div>
                  
                  <div className="form-control">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mô tả
                    </label>
                    <textarea
                      name="description"
                      value={currentCoupon.description || ''}
                      onChange={handleChange}
                      placeholder="Mô tả ngắn gọn về mã giảm giá"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giảm theo phần trăm (%)
                      </label>
                      <input
                        type="number"
                        name="discountPercent"
                        value={currentCoupon.discountPercent || ''}
                        onChange={handleChange}
                        placeholder="Nhập % giảm giá"
                        className={`w-full px-3 py-2 border ${error.discountPercent ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="0"
                        max="100"
                      />
                      {error.discountPercent && <span className="text-xs text-red-500 mt-1">{error.discountPercent}</span>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giảm theo số tiền (VNĐ)
                      </label>
                      <input
                        type="number"
                        name="discountAmount"
                        value={currentCoupon.discountAmount || ''}
                        onChange={handleChange}
                        placeholder="Nhập số tiền giảm giá"
                        className={`w-full px-3 py-2 border ${error.discountAmount ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                        min="0"
                      />
                      {error.discountAmount && <span className="text-xs text-red-500 mt-1">{error.discountAmount}</span>}
                    </div>
                  </div>
                  
                  {error.discount && (
                    <div className="text-red-500 text-sm">
                      {error.discount}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giá trị đơn hàng tối thiểu (VNĐ)
                      </label>
                      <input
                        type="number"
                        name="minOrderAmount"
                        value={currentCoupon.minOrderAmount || ''}
                        onChange={handleChange}
                        placeholder="Để trống nếu không yêu cầu"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giảm tối đa (VNĐ)
                      </label>
                      <input
                        type="number"
                        name="maxDiscount"
                        value={currentCoupon.maxDiscount || ''}
                        onChange={handleChange}
                        placeholder="Để trống nếu không giới hạn"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày bắt đầu
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={currentCoupon.startDate || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${error.startDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {error.startDate && <span className="text-xs text-red-500 mt-1">{error.startDate}</span>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ngày kết thúc
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={currentCoupon.endDate || ''}
                        onChange={handleChange}
                        className={`w-full px-3 py-2 border ${error.endDate ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {error.endDate && <span className="text-xs text-red-500 mt-1">{error.endDate}</span>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Giới hạn số lần sử dụng
                      </label>
                      <input
                        type="number"
                        name="usageLimit"
                        value={currentCoupon.usageLimit || ''}
                        onChange={handleChange}
                        placeholder="Để trống nếu không giới hạn"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Trạng thái
                      </label>
                      <div className="flex items-center space-x-2 h-12 py-2">
                        <div className="relative inline-block w-10 mr-2 align-middle select-none">
                          <input
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            checked={currentCoupon.isActive || false}
                            onChange={(e) => setCurrentCoupon({ ...currentCoupon, isActive: e.target.checked })}
                            className="absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer focus:outline-none transition-transform duration-200 ease-in"
                            style={{
                              transform: currentCoupon.isActive ? 'translateX(100%)' : 'translateX(0)',
                              borderColor: currentCoupon.isActive ? '#3b82f6' : '#d1d5db',
                              backgroundColor: 'white',
                            }}
                          />
                          <label
                            htmlFor="isActive"
                            className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in ${
                              currentCoupon.isActive ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                          ></label>
                        </div>
                        <span className="text-sm">
                          {currentCoupon.isActive ? 'Hoạt động' : 'Không hoạt động'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {isEditing ? 'Cập nhật' : 'Tạo mới'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Modal xác nhận xóa */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <div className="flex items-center text-red-600 mb-4">
                <AlertTriangle size={24} className="mr-2" />
                <h2 className="text-xl font-bold">Xác nhận xóa</h2>
              </div>
              
              <p className="mb-6 text-gray-700">
                Bạn có chắc chắn muốn xóa mã giảm giá này? Hành động này không thể hoàn tác.
              </p>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Hủy
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {renderToast()}
      </div>
    </AdminLayout>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import axios from 'axios';
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrderPDF from '@/components/admin/reports/OrderPDF';

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';

type OrderItem = {
  id: string;
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
};

type Order = {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
};

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(`/api/admin/orders/${orderId}`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.data && response.data.order) {
          setOrder(response.data.order);
        } else {
          setError('Cấu trúc dữ liệu không đúng định dạng');
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin đơn hàng:', err);
        
        // Phân tích lỗi chi tiết hơn
        if (axios.isAxiosError(err)) {
          if (err.response) {
            // Máy chủ trả về lỗi
            const statusCode = err.response.status;
            const errorData = err.response.data;
            
            if (statusCode === 401) {
              setError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn');
              // Redirect to login
              router.push(`/login?redirectTo=/admin/orders/${orderId}`);
            } else if (statusCode === 403) {
              setError('Bạn không có quyền truy cập trang này');
            } else if (statusCode === 404) {
              setError(`Không tìm thấy đơn hàng #${orderId}`);
            } else if (statusCode === 500) {
              setError(`Lỗi máy chủ: ${errorData?.error || 'Không xác định'}`);
              console.error('Server error details:', errorData);
            } else {
              setError(`Lỗi (${statusCode}): ${errorData?.error || 'Không xác định'}`);
            }
          } else if (err.request) {
            // Không nhận được phản hồi
            setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
          } else {
            // Lỗi trong quá trình thiết lập request
            setError(`Lỗi gửi yêu cầu: ${err.message}`);
          }
        } else {
          // Lỗi không phải từ Axios
          setError(`Lỗi không xác định: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId, router]);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!order) return;
    
    try {
      setSaving(true);
      setError(null);
      const response = await axios.patch(`/api/admin/orders/${orderId}`, { 
        status: newStatus 
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 200) {
        setOrder(response.data.order);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', err);
      
      if (axios.isAxiosError(err)) {
        if (err.response) {
          const statusCode = err.response.status;
          const errorData = err.response.data;
          
          if (statusCode === 401) {
            setError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn');
          } else if (statusCode === 403) {
            setError('Bạn không có quyền thực hiện thao tác này');
          } else if (statusCode === 404) {
            setError(`Không tìm thấy đơn hàng #${orderId}`);
          } else {
            setError(`Lỗi (${statusCode}): ${errorData?.error || 'Không thể cập nhật trạng thái đơn hàng'}`);
          }
        } else {
          setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
        }
      } else {
        setError('Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.');
      }
    } finally {
      setSaving(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusText = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'Chờ Xử Lý';
      case 'PROCESSING': return 'Đang Xử Lý';
      case 'COMPLETED': return 'Hoàn Thành';
      case 'CANCELLED': return 'Đã Hủy';
      default: return status;
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <p>{error || 'Không tìm thấy thông tin đơn hàng'}</p>
          <button 
            onClick={() => router.push('/admin/orders')} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay lại danh sách đơn hàng
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">Chi tiết đơn hàng #{order.id}</h1>
            <p className="text-gray-600">Ngày đặt: {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => router.push('/admin/orders')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Quay lại
            </button>
            <PDFDownloadLink 
              document={<OrderPDF order={order} />}
              fileName={`don-hang-${order.id}.pdf`}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
            >
              {({ loading }) => 
                loading ? 'Đang tạo PDF...' : 'Xuất PDF'
              }
            </PDFDownloadLink>
          </div>
        </div>

        <div className="mt-8 border-t pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <h2 className="text-lg font-bold mb-4">Thông tin khách hàng</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p className="mb-2"><span className="font-semibold">Tên khách hàng:</span> {order.customerName}</p>
                <p><span className="font-semibold">Email:</span> {order.customerEmail}</p>
              </div>
            </div>
            <div>
              <h2 className="text-lg font-bold mb-4">Thông tin đơn hàng</h2>
              <div className="bg-gray-50 p-4 rounded">
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Trạng thái:</span>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                <p className="mb-2"><span className="font-semibold">Ngày đặt:</span> {formatDate(order.createdAt)}</p>
                <p><span className="font-semibold">Cập nhật:</span> {formatDate(order.updatedAt)}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-lg font-bold mb-4">Cập nhật trạng thái</h2>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => handleStatusChange('PENDING')}
                disabled={order.status === 'PENDING' || saving}
                className={`px-4 py-2 rounded ${order.status === 'PENDING' 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' 
                  : 'bg-white border border-gray-300 hover:bg-yellow-50'}`}
              >
                Chờ xử lý
              </button>
              <button 
                onClick={() => handleStatusChange('PROCESSING')}
                disabled={order.status === 'PROCESSING' || saving}
                className={`px-4 py-2 rounded ${order.status === 'PROCESSING' 
                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                  : 'bg-white border border-gray-300 hover:bg-blue-50'}`}
              >
                Đang xử lý
              </button>
              <button 
                onClick={() => handleStatusChange('COMPLETED')}
                disabled={order.status === 'COMPLETED' || saving}
                className={`px-4 py-2 rounded ${order.status === 'COMPLETED' 
                  ? 'bg-green-100 text-green-800 border border-green-300' 
                  : 'bg-white border border-gray-300 hover:bg-green-50'}`}
              >
                Hoàn thành
              </button>
              <button 
                onClick={() => handleStatusChange('CANCELLED')}
                disabled={order.status === 'CANCELLED' || saving}
                className={`px-4 py-2 rounded ${order.status === 'CANCELLED' 
                  ? 'bg-red-100 text-red-800 border border-red-300' 
                  : 'bg-white border border-gray-300 hover:bg-red-50'}`}
              >
                Hủy đơn
              </button>
              {saving && (
                <span className="inline-flex items-center ml-2">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full mr-2"></div>
                  Đang cập nhật...
                </span>
              )}
            </div>
          </div>

          <h2 className="text-lg font-bold mb-4">Chi tiết sản phẩm</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left border-b">Sản phẩm</th>
                  <th className="py-3 px-4 text-right border-b">Đơn giá</th>
                  <th className="py-3 px-4 text-right border-b">Số lượng</th>
                  <th className="py-3 px-4 text-right border-b">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-gray-500">Mã SP: {item.productId}</div>
                    </td>
                    <td className="py-3 px-4 text-right border-b">{formatPrice(item.price)}</td>
                    <td className="py-3 px-4 text-right border-b">{item.quantity}</td>
                    <td className="py-3 px-4 text-right border-b font-medium">{formatPrice(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={3} className="py-3 px-4 text-right font-bold">Tổng giá trị đơn hàng:</td>
                  <td className="py-3 px-4 text-right font-bold text-lg">{formatPrice(order.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 
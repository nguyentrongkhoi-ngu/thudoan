'use client';

import AdminLayout from "@/components/admin/AdminLayout";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { PDFDownloadLink } from '@react-pdf/renderer';
import OrdersReportPDF from "@/components/admin/reports/OrdersReportPDF";

type OrderStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'ALL';

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

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const router = useRouter();

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        
        // Lấy dữ liệu đơn hàng từ API với xử lý lỗi chi tiết
        const response = await axios.get('/api/admin/orders', {
          // Ensure credentials are sent with the request
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (response.data && response.data.orders) {
          setOrders(response.data.orders);
          setFilteredOrders(response.data.orders);
        } else {
          console.warn('Dữ liệu API không đúng cấu trúc mong đợi:', response.data);
          setError('Cấu trúc dữ liệu không đúng định dạng');
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Lỗi khi tải đơn hàng:', err);
        
        // Phân tích lỗi chi tiết hơn
        if (axios.isAxiosError(err)) {
          if (err.response) {
            // Máy chủ trả về lỗi
            const statusCode = err.response.status;
            const errorData = err.response.data;
            
            if (statusCode === 401) {
              setError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn');
              // Redirect to login
              router.push('/login?redirectTo=/admin/orders');
            } else if (statusCode === 403) {
              setError('Bạn không có quyền truy cập trang này');
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
        
        setLoading(false);
      }
    }
    
    fetchOrders();
  }, [router]);

  useEffect(() => {
    filterOrders();
  }, [statusFilter, searchTerm, dateRange, orders]);

  const filterOrders = () => {
    let result = [...orders];
    
    // Filter by status
    if (statusFilter !== 'ALL') {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(order => 
        order.id.toLowerCase().includes(term) ||
        order.customerName.toLowerCase().includes(term) ||
        order.customerEmail.toLowerCase().includes(term)
      );
    }
    
    // Filter by date range
    if (dateRange.startDate) {
      const startDate = new Date(dateRange.startDate);
      startDate.setHours(0, 0, 0, 0);
      result = result.filter(order => new Date(order.createdAt) >= startDate);
    }
    
    if (dateRange.endDate) {
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter(order => new Date(order.createdAt) <= endDate);
    }
    
    setFilteredOrders(result);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'ALL') return; // 'ALL' is only for filtering, not a valid status
    
    try {
      // Hiển thị loading state trên giao diện nếu cần
      const response = await axios.patch(`/api/admin/orders/${orderId}`, { 
        status: newStatus 
      });
      
      if (response.status === 200) {
        // Cập nhật state local với dữ liệu mới từ server
        const updatedOrder = response.data.order;
        
        // Cập nhật mảng orders
        setOrders(orders.map(order => 
          order.id === orderId ? updatedOrder : order
        ));
        
        // Cập nhật mảng filteredOrders 
        setFilteredOrders(filteredOrders.map(order => 
          order.id === orderId ? updatedOrder : order
        ));
        
        // Thông báo thành công
        alert(`Đã cập nhật trạng thái đơn hàng thành ${getStatusText(newStatus)}`);
      }
    } catch (err) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng:', err);
      
      // Cung cấp thông báo lỗi cụ thể hơn
      let errorMessage = 'Không thể cập nhật trạng thái đơn hàng. Vui lòng thử lại.';
      
      if (axios.isAxiosError(err) && err.response) {
        // Lấy lỗi từ response API nếu có
        errorMessage = err.response.data?.error || errorMessage;
      }
      
      alert(errorMessage);
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
      case 'PENDING':
        return 'Chờ Xử Lý';
      case 'PROCESSING':
        return 'Đang Xử Lý';
      case 'COMPLETED':
        return 'Hoàn Thành';
      case 'CANCELLED':
        return 'Đã Hủy';
      case 'ALL':
        return 'Tất cả';
      default:
        return status;
    }
  };

  const getStatusClass = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'ALL':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Calculate summary statistics for report
  const countByStatus = {
    PENDING: orders.filter(order => order.status === 'PENDING').length,
    PROCESSING: orders.filter(order => order.status === 'PROCESSING').length,
    COMPLETED: orders.filter(order => order.status === 'COMPLETED').length,
    CANCELLED: orders.filter(order => order.status === 'CANCELLED').length,
  };
  
  const totalRevenue = orders
    .filter(order => order.status !== 'CANCELLED')
    .reduce((sum, order) => sum + order.total, 0);

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
          <h1 className="text-2xl font-bold">Quản Lý Đơn Hàng</h1>
          
          <PDFDownloadLink 
            document={
              <OrdersReportPDF 
                orders={filteredOrders}
                fromDate={dateRange.startDate ? new Date(dateRange.startDate) : undefined}
                toDate={dateRange.endDate ? new Date(dateRange.endDate) : undefined}
                statusFilter={statusFilter !== 'ALL' ? statusFilter : undefined}
              />
            }
            fileName="bao-cao-don-hang.pdf"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center"
          >
            {({ loading }) => 
              loading ? 'Đang tạo PDF...' : 'Xuất báo cáo (PDF)'
            }
          </PDFDownloadLink>
        </div>

        {/* Bộ lọc và tìm kiếm */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
              <input
                type="text"
                placeholder="Tìm theo mã đơn, tên khách hàng..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="w-full md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as OrderStatus)}
              >
                <option value="ALL">Tất cả</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="PROCESSING">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            
            <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Từ ngày</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đến ngày</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Thống kê tổng quan */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Tổng đơn hàng</h3>
            <p className="text-2xl font-bold">{orders.length}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Chờ xử lý</h3>
            <p className="text-2xl font-bold text-yellow-600">{countByStatus.PENDING}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Đang xử lý</h3>
            <p className="text-2xl font-bold text-blue-600">{countByStatus.PROCESSING}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Hoàn thành</h3>
            <p className="text-2xl font-bold text-green-600">{countByStatus.COMPLETED}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Tổng doanh thu</h3>
            <p className="text-xl font-bold">{formatPrice(totalRevenue)}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="py-3 px-4 text-left border-b">Mã Đơn Hàng</th>
                <th className="py-3 px-4 text-left border-b">Khách Hàng</th>
                <th className="py-3 px-4 text-left border-b">Ngày Đặt</th>
                <th className="py-3 px-4 text-left border-b">Tổng Tiền</th>
                <th className="py-3 px-4 text-left border-b">Trạng Thái</th>
                <th className="py-3 px-4 text-left border-b">Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 border-b">{order.id}</td>
                    <td className="py-3 px-4 border-b">
                      <div>{order.customerName}</div>
                      <div className="text-sm text-gray-500">{order.customerEmail}</div>
                    </td>
                    <td className="py-3 px-4 border-b">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="py-3 px-4 border-b font-medium">
                      {formatPrice(order.total)}
                    </td>
                    <td className="py-3 px-4 border-b">
                      <select 
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}
                      >
                        <option value="PENDING">Chờ Xử Lý</option>
                        <option value="PROCESSING">Đang Xử Lý</option>
                        <option value="COMPLETED">Hoàn Thành</option>
                        <option value="CANCELLED">Đã Hủy</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 border-b">
                      <button 
                        className="text-blue-500 hover:text-blue-700"
                        onClick={() => router.push(`/admin/orders/${order.id}`)}
                      >
                        Chi Tiết
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 px-4 text-center text-gray-500">
                    {filteredOrders.length === 0 && orders.length > 0 
                      ? 'Không tìm thấy đơn hàng nào phù hợp với bộ lọc' 
                      : 'Không có đơn hàng nào'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Chi tiết đơn hàng */}
        {orders.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">Chi Tiết Đơn Hàng Gần Đây</h2>
            {orders.map(order => (
              <div key={`detail-${order.id}`} className="mt-8 bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Chi tiết đơn hàng #{order.id}</h2>
                  <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusClass(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Thông tin khách hàng</h3>
                    <p className="mt-1">{order.customerName}</p>
                    <p className="text-gray-600">{order.customerEmail}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Thông tin đơn hàng</h3>
                    <p className="mt-1">Ngày đặt: {formatDate(order.createdAt)}</p>
                    <p>Cập nhật: {formatDate(order.updatedAt)}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Sản phẩm</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">Sản phẩm</th>
                          <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Đơn giá</th>
                          <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Số lượng</th>
                          <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {order.items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="py-4 px-4">{item.productName}</td>
                            <td className="py-4 px-4 text-right">{formatPrice(item.price)}</td>
                            <td className="py-4 px-4 text-right">{item.quantity}</td>
                            <td className="py-4 px-4 text-right">{formatPrice(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} className="py-4 px-4 text-right font-medium">Tổng cộng:</td>
                          <td className="py-4 px-4 text-right font-bold">{formatPrice(order.total)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AvatarPlaceholder from '@/components/AvatarPlaceholder';
import { isValidURL, customImageLoader } from '@/lib/imageLoader';
import OrderDetails from '@/components/OrderDetails';
import { formatDistanceToNow, parseISO, format, subMonths, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';

// Define UI states
type ProfileTab = 'info' | 'orders' | 'password';

// Define response types
interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    name: string;
    imageUrl: string;
  };
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // User information form state
  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    image: ''
  });
  
  // Password change form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);

  // Add the new state variables for order management
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [orderFilter, setOrderFilter] = useState<string>('all');
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Add new states for date range filtering
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [customDateRange, setCustomDateRange] = useState<{
    startDate: string;
    endDate: string;
  }>({
    startDate: '',
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Initialize user data from session
  useEffect(() => {
    if (session?.user) {
      setUserInfo({
        name: session.user.name || '',
        email: session.user.email || '',
        image: session.user.image || ''
      });
    }
  }, [session]);

  // Fetch orders when tab changes or on initial load
  useEffect(() => {
    if (activeTab === 'orders' && session?.user?.id && status === 'authenticated') {
      fetchOrders();
    }
  }, [activeTab, session, status]);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirectTo=/profile');
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      if (isFirstLoad) {
        // Don't show loading indicator on first load if we already have orders
        setIsLoading(orders.length === 0);
        setIsFirstLoad(false);
      } else {
        setIsLoading(true);
      }
      
      setError('');
      const response = await fetch('/api/orders');
      
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const data = await response.json();
      setOrders(data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Không thể tải lịch sử đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserInfo({ ...userInfo, [name]: value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm({ ...passwordForm, [name]: value });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: userInfo.name,
          image: userInfo.image
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update profile');
      }
      
      setSuccess('Thông tin cá nhân đã được cập nhật thành công!');
      
      // Update session
      if (session && session.user) {
        session.user.name = userInfo.name;
        session.user.image = userInfo.image;
      }
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi khi cập nhật thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate passwords
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError('Mật khẩu mới không khớp với mật khẩu xác nhận');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }
      
      setSuccess('Mật khẩu đã được thay đổi thành công!');
      
      // Reset form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error: any) {
      setError(error.message || 'Đã xảy ra lỗi khi thay đổi mật khẩu.');
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to view order details
  const handleViewOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
    setShowOrderDetails(true);
  };
  
  // Add function to close order details modal
  const handleCloseOrderDetails = () => {
    setShowOrderDetails(false);
    setSelectedOrderId(null);
  };
  
  // Add function to handle order filtering
  const getFilteredOrders = () => {
    if (orderFilter === 'all') return orders;
    return orders.filter(order => order.status === orderFilter);
  };
  
  // Add function to filter orders by date range
  const getFilteredOrdersByDate = (orders: Order[]) => {
    if (!orders.length) return [];
    
    // Filter by status first
    let filtered = orders;
    if (orderFilter !== 'all') {
      filtered = orders.filter(order => order.status === orderFilter);
    }
    
    // Then filter by date
    if (dateFilter === 'all') {
      return filtered;
    }
    
    const today = new Date();
    let startDate: Date;
    
    switch (dateFilter) {
      case '7days':
        startDate = subMonths(today, 0.25); // ~7 days
        break;
      case '30days':
        startDate = subMonths(today, 1);
        break;
      case '3months':
        startDate = subMonths(today, 3);
        break;
      case '6months':
        startDate = subMonths(today, 6);
        break;
      case '1year':
        startDate = subMonths(today, 12);
        break;
      case 'custom':
        if (!customDateRange.startDate) {
          return filtered;
        }
        startDate = startOfDay(new Date(customDateRange.startDate));
        const endDate = customDateRange.endDate 
          ? endOfDay(new Date(customDateRange.endDate)) 
          : endOfDay(today);
        
        return filtered.filter(order => {
          const orderDate = new Date(order.createdAt);
          return isWithinInterval(orderDate, { start: startDate, end: endDate });
        });
      default:
        return filtered;
    }
    
    // Filter by date for preset ranges
    return filtered.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate && orderDate <= today;
    });
  };
  
  // Add function to format relative time
  const formatRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(parseISO(dateString), { 
        addSuffix: true,
        locale: vi 
      });
    } catch (e) {
      return new Date(dateString).toLocaleDateString('vi-VN');
    }
  };

  // Replace the Orders tab content with enhanced version
  const renderOrderHistory = () => {
    if (isLoading && orders.length === 0) {
      return (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Đang tải đơn hàng...</p>
        </div>
      );
    }
    
    const filteredOrders = getFilteredOrdersByDate(orders);
    
    return (
      <div>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Lịch sử đơn hàng</h2>
            <div className="flex gap-2">
              <Link 
                href="/profile/returns" 
                className="btn btn-sm btn-outline"
                title="Xem yêu cầu trả hàng"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1m0 0l-3-3m3 3l3-3m-3 9v-1m0 0l-3-3m3 3l3-3m-12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Trả hàng
              </Link>
              <button 
                onClick={fetchOrders}
                className="btn btn-sm btn-circle"
                title="Làm mới"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Lọc theo trạng thái</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={orderFilter}
                onChange={(e) => setOrderFilter(e.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="PENDING">Đang xử lý</option>
                <option value="PROCESSING">Đang chuẩn bị</option>
                <option value="SHIPPED">Đang giao hàng</option>
                <option value="DELIVERED">Đã giao hàng</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
                <option value="RETURN_REQUESTED">Yêu cầu trả hàng</option>
              </select>
            </div>
            
            {/* Date range filter */}
            <div className="form-control">
              <label className="label">
                <span className="label-text">Lọc theo thời gian</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Tất cả thời gian</option>
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="3months">3 tháng qua</option>
                <option value="6months">6 tháng qua</option>
                <option value="1year">1 năm qua</option>
                <option value="custom">Tùy chỉnh</option>
              </select>
            </div>
          </div>
          
          {/* Custom date range picker */}
          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Từ ngày</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered" 
                  value={customDateRange.startDate}
                  onChange={(e) => setCustomDateRange({
                    ...customDateRange,
                    startDate: e.target.value
                  })}
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Đến ngày</span>
                </label>
                <input 
                  type="date" 
                  className="input input-bordered" 
                  value={customDateRange.endDate}
                  onChange={(e) => setCustomDateRange({
                    ...customDateRange,
                    endDate: e.target.value
                  })}
                />
              </div>
            </div>
          )}
        </div>
        
        {isLoading && orders.length > 0 && (
          <div className="alert alert-info mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>Đang cập nhật dữ liệu đơn hàng...</span>
          </div>
        )}
        
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div 
                key={order.id} 
                className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-300 cursor-pointer"
                onClick={() => handleViewOrder(order.id)}
              >
                <div className="card-body p-4">
                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h3 className="text-lg font-medium flex items-center gap-2">
                        <span>Đơn hàng #{order.id.substring(0, 8)}</span>
                        {order.status === 'PENDING' && (
                          <span className="badge badge-sm badge-warning">Mới</span>
                        )}
                      </h3>
                      <p className="text-sm text-base-content/70">
                        {formatRelativeTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">
                        {new Intl.NumberFormat('vi-VN', { 
                          style: 'currency', 
                          currency: 'VND' 
                        }).format(order.total)}
                      </span>
                      <span className={`badge ${
                        order.status === 'COMPLETED' ? 'badge-success' : 
                        order.status === 'PENDING' ? 'badge-warning' : 
                        order.status === 'PROCESSING' ? 'badge-info' :
                        order.status === 'SHIPPED' ? 'badge-info' :
                        order.status === 'DELIVERED' ? 'badge-success' :
                        order.status === 'CANCELLED' ? 'badge-error' : 'badge-ghost'
                      }`}>
                        {order.status === 'COMPLETED' ? 'Hoàn thành' : 
                         order.status === 'PENDING' ? 'Đang xử lý' : 
                         order.status === 'PROCESSING' ? 'Đang chuẩn bị' :
                         order.status === 'SHIPPED' ? 'Đang giao hàng' :
                         order.status === 'DELIVERED' ? 'Đã giao hàng' :
                         order.status === 'CANCELLED' ? 'Đã hủy' : order.status}
                      </span>
                    </div>
                  </div>
                  
                  {/* Mini product preview */}
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="avatar flex-shrink-0">
                        <div className="w-12 h-12 rounded bg-base-200">
                          {item.product.imageUrl && isValidURL(item.product.imageUrl) ? (
                            <Image 
                              loader={customImageLoader}
                              src={item.product.imageUrl} 
                              alt={item.product.name}
                              width={48}
                              height={48}
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="bg-base-300 flex items-center justify-center w-full h-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="avatar flex-shrink-0">
                        <div className="w-12 h-12 rounded bg-base-200 flex items-center justify-center text-sm font-medium">
                          +{order.items.length - 4}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="card-actions justify-end mt-2">
                    <button 
                      className="btn btn-sm btn-ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewOrder(order.id);
                      }}
                    >
                      Chi tiết
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-base-200 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="mt-4 text-lg">Không tìm thấy đơn hàng nào phù hợp với bộ lọc</p>
            <button 
              className="btn btn-primary mt-4"
              onClick={() => {
                setOrderFilter('all');
                setDateFilter('all');
              }}
            >
              Xem tất cả đơn hàng
            </button>
          </div>
        )}
        
        {/* Order Details Modal */}
        {showOrderDetails && selectedOrderId && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <OrderDetails 
                orderId={selectedOrderId} 
                onClose={handleCloseOrderDetails} 
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show a message (redirection is handled by useEffect)
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto p-4 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Vui lòng đăng nhập để xem thông tin cá nhân</p>
          <Link href="/login?redirectTo=/profile" className="btn btn-primary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Thông tin cá nhân</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar with tabs */}
        <div className="md:col-span-1">
          <div className="card bg-base-100 shadow-sm border border-base-300">
            <div className="p-4 space-y-4">
              <button 
                onClick={() => setActiveTab('info')} 
                className={`flex items-center p-3 rounded-lg text-left ${activeTab === 'info' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Thông tin cá nhân
              </button>
              
              <Link 
                href="/profile/orders"
                className="flex items-center p-3 rounded-lg text-left hover:bg-base-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                Lịch sử đơn hàng
              </Link>
              
              <Link href="/profile/returns" 
                className="flex items-center p-3 rounded-lg text-left hover:bg-base-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 15v-1m0 0V9.344M16 8.344V8v-.656M16 15h.656a2 2 0 011.297.047l.047.047a2 2 0 001.505.742 2 2 0 001.578-.736l.048-.048A2 2 0 0123 14.344v-3.22a2 2 0 00-.753-1.578l-.048-.048a2 2 0 00-1.484-.49 2 2 0 00-1.297.047l-.047.047A2 2 0 0018 9.844V9v-.656M16 8.344l-1.953-1.953a2 2 0 00-2.828 0L9.266 8.344M16 8.344V9v.656M9.266 8.344L7.313 6.391a2 2 0 00-2.828 0L2.532 8.344M9.266 8.344V9v.656M2.532 8.344V9v.656m0 0V13.5a2 2 0 001.046 1.767l.011.006a2 2 0 002.064-.021l.032-.02a2 2 0 01.021-.004 2 2 0 011.725.207l.045.03A2 2 0 009.266 14.656v-3.3a2 2 0 00-.513-1.351l-.047-.047a2 2 0 01-.021-.021 2 2 0 00-1.764-.598h-.052a2 2 0 01-.579-.034 2 2 0 00-1.432.336L4.313 9.9v.001a2 2 0 00-.546 1.352v.764a2 2 0 00.83 1.621l.022.016a2 2 0 002.375.17" />
                </svg>
                Yêu cầu trả hàng
              </Link>
              
              <button 
                onClick={() => setActiveTab('password')} 
                className={`flex items-center p-3 rounded-lg text-left ${activeTab === 'password' ? 'bg-primary text-primary-content' : 'hover:bg-base-200'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Đổi mật khẩu
              </button>
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="md:col-span-3">
          <div className="bg-base-100 rounded-lg shadow p-6">
            {/* Show error message if any */}
            {error && (
              <div className="alert alert-error mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}
            
            {/* Show success message if any */}
            {success && (
              <div className="alert alert-success mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{success}</span>
              </div>
            )}
            
            {/* Personal Information Tab */}
            {activeTab === 'info' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6">Thông tin cá nhân</h2>
                <form onSubmit={handleUpdateProfile}>
                  <div className="space-y-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Email</span>
                      </label>
                      <input 
                        type="email" 
                        value={userInfo.email} 
                        className="input input-bordered" 
                        disabled 
                      />
                      <label className="label">
                        <span className="label-text-alt text-base-content/60">Email không thể thay đổi</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Họ tên</span>
                      </label>
                      <input 
                        type="text" 
                        name="name"
                        value={userInfo.name} 
                        onChange={handleInfoChange}
                        className="input input-bordered" 
                        placeholder="Nhập họ tên của bạn"
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">URL Hình đại diện</span>
                      </label>
                      <input 
                        type="text" 
                        name="image"
                        value={userInfo.image || ''} 
                        onChange={handleInfoChange}
                        className="input input-bordered" 
                        placeholder="https://example.com/your-image.jpg"
                      />
                      <label className="label">
                        <span className="label-text-alt">Nhập URL hình ảnh đại diện của bạn</span>
                      </label>
                    </div>
                    
                    {userInfo.image && isValidURL(userInfo.image) ? (
                      <div className="mt-4 flex justify-center">
                        <div className="avatar">
                          <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <Image 
                              loader={customImageLoader}
                              src={userInfo.image} 
                              alt="Avatar preview" 
                              width={96}
                              height={96}
                              className="object-cover w-full h-full"
                              priority
                              unoptimized
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-center">
                        <div className="avatar">
                          <div className="w-24 h-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <AvatarPlaceholder />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="form-control mt-6">
                      <button 
                        type="submit" 
                        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Đang cập nhật...' : 'Cập nhật thông tin'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
            
            {/* Order History Tab with Enhanced UI */}
            {activeTab === 'orders' && renderOrderHistory()}
            
            {/* Change Password Tab */}
            {activeTab === 'password' && (
              <div>
                <h2 className="text-2xl font-semibold mb-6">Đổi mật khẩu</h2>
                <form onSubmit={handleChangePassword}>
                  <div className="space-y-6">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Mật khẩu hiện tại</span>
                      </label>
                      <input 
                        type="password" 
                        name="currentPassword"
                        value={passwordForm.currentPassword} 
                        onChange={handlePasswordChange}
                        className="input input-bordered" 
                        placeholder="Nhập mật khẩu hiện tại"
                        required
                      />
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Mật khẩu mới</span>
                      </label>
                      <input 
                        type="password" 
                        name="newPassword"
                        value={passwordForm.newPassword} 
                        onChange={handlePasswordChange}
                        className="input input-bordered" 
                        placeholder="Nhập mật khẩu mới"
                        required
                      />
                      <label className="label">
                        <span className="label-text-alt">Mật khẩu phải có ít nhất 6 ký tự</span>
                      </label>
                    </div>
                    
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Xác nhận mật khẩu mới</span>
                      </label>
                      <input 
                        type="password" 
                        name="confirmPassword"
                        value={passwordForm.confirmPassword} 
                        onChange={handlePasswordChange}
                        className="input input-bordered" 
                        placeholder="Nhập lại mật khẩu mới"
                        required
                      />
                    </div>
                    
                    <div className="form-control mt-6">
                      <button 
                        type="submit" 
                        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 
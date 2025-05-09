'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { isValidURL, customImageLoader } from '@/lib/imageLoader';
import { formatDistanceToNow, parseISO, format } from 'date-fns';
import { vi } from 'date-fns/locale';

// Định nghĩa các kiểu dữ liệu
interface ReturnItem {
  id: string;
  orderItemId: string;
  quantity: number;
  reason?: string;
  status: string;
  orderItem: {
    product: {
      name: string;
      imageUrl?: string;
    }
  };
}

interface ReturnRequest {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  createdAt: string;
  updatedAt: string;
  items: ReturnItem[];
  order: {
    id: string;
    total: number;
    status: string;
  };
}

export default function ReturnsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?redirectTo=/profile/returns');
    }
  }, [status, router]);

  // Fetch returns when component loads
  useEffect(() => {
    if (session?.user?.id && status === 'authenticated') {
      fetchReturns();
    }
  }, [session, status]);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/returns');
      
      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu yêu cầu trả hàng');
      }
      
      const data = await response.json();
      setReturns(data);
    } catch (err: any) {
      console.error('Error fetching returns:', err);
      setError(err.message || 'Đã xảy ra lỗi khi tải danh sách yêu cầu trả hàng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDetails = async (returnId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/returns/${returnId}`);
      
      if (!response.ok) {
        throw new Error('Không thể tải chi tiết yêu cầu trả hàng');
      }
      
      const data = await response.json();
      setSelectedReturn(data);
      setShowDetailsModal(true);
    } catch (err: any) {
      console.error('Error fetching return details:', err);
      setError(err.message || 'Đã xảy ra lỗi khi tải chi tiết yêu cầu trả hàng');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelReturn = async (returnId: string) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      const response = await fetch(`/api/returns/${returnId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Không thể hủy yêu cầu trả hàng');
      }
      
      // Refresh the list after cancellation
      await fetchReturns();
      setShowDetailsModal(false);
      setSuccessMessage('Yêu cầu trả hàng đã được hủy thành công');
      
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err: any) {
      console.error('Error cancelling return:', err);
      setError(err.message || 'Đã xảy ra lỗi khi hủy yêu cầu trả hàng');
    } finally {
      setIsUpdating(false);
    }
  };

  // Helper function to format relative time
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
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  // Helper function to get status text and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Đang xử lý', color: 'badge-warning' };
      case 'APPROVED':
        return { text: 'Đã duyệt', color: 'badge-success' };
      case 'REJECTED':
        return { text: 'Từ chối', color: 'badge-error' };
      case 'COMPLETED':
        return { text: 'Hoàn thành', color: 'badge-success' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: 'badge-error' };
      default:
        return { text: status, color: 'badge-neutral' };
    }
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
          <p className="mb-4">Vui lòng đăng nhập để xem thông tin trả hàng</p>
          <Link href="/login?redirectTo=/profile/returns" className="btn btn-primary">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Yêu cầu trả hàng</h1>
        <Link href="/profile" className="btn btn-outline btn-sm">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Quay lại hồ sơ
        </Link>
      </div>
      
      {/* Success message */}
      {successMessage && (
        <div className="alert alert-success mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="alert alert-error mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
          <button 
            className="btn btn-sm btn-ghost" 
            onClick={() => setError(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      
      {/* Return list */}
      {isLoading && returns.length === 0 ? (
        <div className="text-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="mt-4">Đang tải yêu cầu trả hàng...</p>
        </div>
      ) : returns.length > 0 ? (
        <div className="grid gap-4">
          {returns.map(returnRequest => (
            <div 
              key={returnRequest.id}
              className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-300 cursor-pointer"
              onClick={() => handleViewDetails(returnRequest.id)}
            >
              <div className="card-body p-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <h3 className="text-lg font-medium flex items-center gap-2">
                      <span>Yêu cầu trả hàng #{returnRequest.id.substring(0, 8)}</span>
                      {returnRequest.status === 'PENDING' && (
                        <span className="badge badge-sm badge-warning">Mới</span>
                      )}
                    </h3>
                    <p className="text-sm text-base-content/70">
                      Đơn hàng: #{returnRequest.orderId.substring(0, 8)} - {formatRelativeTime(returnRequest.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`badge ${getStatusInfo(returnRequest.status).color}`}>
                      {getStatusInfo(returnRequest.status).text}
                    </span>
                  </div>
                </div>
                
                {/* Item preview */}
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {returnRequest.items.slice(0, 4).map((item) => (
                    <div key={item.id} className="avatar flex-shrink-0">
                      <div className="w-12 h-12 rounded bg-base-200">
                        {item.orderItem.product.imageUrl && isValidURL(item.orderItem.product.imageUrl) ? (
                          <Image 
                            loader={customImageLoader}
                            src={item.orderItem.product.imageUrl} 
                            alt={item.orderItem.product.name}
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
                  {returnRequest.items.length > 4 && (
                    <div className="avatar flex-shrink-0">
                      <div className="w-12 h-12 rounded bg-base-200 flex items-center justify-center text-sm font-medium">
                        +{returnRequest.items.length - 4}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="card-actions justify-end mt-2">
                  <button 
                    className="btn btn-sm btn-ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(returnRequest.id);
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
          <p className="mt-4 text-lg">Bạn chưa có yêu cầu trả hàng nào</p>
          <Link href="/profile" className="btn btn-primary mt-4">
            Quay lại trang hồ sơ
          </Link>
        </div>
      )}
      
      {/* Return Details Modal */}
      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-base-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-base-300">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold">
                  Chi tiết yêu cầu trả hàng #{selectedReturn.id.substring(0, 8)}
                </h3>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="btn btn-sm btn-circle"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h4 className="text-lg font-medium mb-2">Thông tin yêu cầu</h4>
                  <div className="space-y-2 text-sm">
                    <p><strong>Mã yêu cầu:</strong> #{selectedReturn.id}</p>
                    <p><strong>Mã đơn hàng:</strong> #{selectedReturn.orderId}</p>
                    <p><strong>Ngày tạo:</strong> {formatDate(selectedReturn.createdAt)}</p>
                    <p>
                      <strong>Trạng thái:</strong> 
                      <span className={`badge ${getStatusInfo(selectedReturn.status).color} ml-2`}>
                        {getStatusInfo(selectedReturn.status).text}
                      </span>
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium mb-2">Lý do trả hàng</h4>
                  <div className="space-y-2">
                    <p>{selectedReturn.reason}</p>
                  </div>
                </div>
              </div>
              
              <h4 className="text-lg font-medium mb-4">Sản phẩm trả lại</h4>
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Sản phẩm</th>
                      <th className="text-right">Số lượng</th>
                      <th>Lý do</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReturn.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="flex items-center space-x-3">
                            <div className="avatar">
                              <div className="w-12 h-12 mask mask-squircle">
                                {item.orderItem.product.imageUrl && isValidURL(item.orderItem.product.imageUrl) ? (
                                  <Image 
                                    loader={customImageLoader}
                                    src={item.orderItem.product.imageUrl} 
                                    alt={item.orderItem.product.name}
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
                            <div>
                              {item.orderItem.product.name}
                            </div>
                          </div>
                        </td>
                        <td className="text-right">{item.quantity}</td>
                        <td>{item.reason || 'Không có lý do cụ thể'}</td>
                        <td>
                          <span className={`badge ${getStatusInfo(item.status).color}`}>
                            {getStatusInfo(item.status).text}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-4 mt-8">
                {selectedReturn.status === 'PENDING' && (
                  <button 
                    className="btn btn-error"
                    onClick={() => handleCancelReturn(selectedReturn.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Đang xử lý...
                      </>
                    ) : 'Hủy yêu cầu trả hàng'}
                  </button>
                )}
                
                <button 
                  className="btn btn-outline" 
                  onClick={() => setShowDetailsModal(false)}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
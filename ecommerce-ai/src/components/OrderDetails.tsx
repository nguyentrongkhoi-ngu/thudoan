'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { isValidURL, customImageLoader } from '@/lib/imageLoader';

// Define types
interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    imageUrl: string;
    description?: string;
    price?: number;
  };
}

interface ShippingAddress {
  id: string;
  fullName: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  trackingNumber?: string;
  paymentMethod?: string;
  notes?: string;
}

interface OrderDetailsProps {
  orderId: string;
  onClose?: () => void;
}

export default function OrderDetails({ orderId, onClose }: OrderDetailsProps) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Add new states for modal dialogs and actions
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [returnItems, setReturnItems] = useState<{
    orderItemId: string;
    quantity: number;
    maxQuantity: number;
    reason: string;
    selected: boolean;
  }[]>([]);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    async function fetchOrderDetails() {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${orderId}`);
        
        if (!response.ok) {
          throw new Error('Could not fetch order details');
        }
        
        const data = await response.json();
        setOrder(data.order);
        
        // Initialize return items if order is loaded successfully
        if (data.order && data.order.items) {
          setReturnItems(
            data.order.items.map((item: OrderItem) => ({
              orderItemId: item.id,
              quantity: 0,
              maxQuantity: item.quantity,
              reason: '',
              selected: false
            }))
          );
        }
      } catch (err) {
        console.error('Error fetching order details:', err);
        setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    }
    
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);
  
  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!order) return;
    
    try {
      setIsCancelling(true);
      
      const response = await fetch(`/api/orders/${order.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cancel',
          reason: cancelReason,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to cancel order');
      }
      
      const data = await response.json();
      setOrder(data.order);
      setShowCancelModal(false);
      setActionSuccess('Đơn hàng đã được hủy thành công!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi hủy đơn hàng.');
    } finally {
      setIsCancelling(false);
    }
  };
  
  // Handle return order
  const handleReturnOrder = async () => {
    if (!order) return;
    
    // Check if any items are selected
    const selectedItems = returnItems.filter(item => item.selected && item.quantity > 0);
    
    if (selectedItems.length === 0) {
      setError('Vui lòng chọn ít nhất một sản phẩm để trả lại.');
      return;
    }
    
    try {
      setIsReturning(true);
      
      const response = await fetch(`/api/orders/${order.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'return',
          reason: returnReason,
          returnItems: selectedItems.map(item => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: item.reason,
          })),
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit return request');
      }
      
      const data = await response.json();
      
      // Refresh order data
      const orderResponse = await fetch(`/api/orders/${order.id}`);
      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        setOrder(orderData.order);
      }
      
      setShowReturnModal(false);
      setActionSuccess('Yêu cầu trả hàng đã được gửi thành công! Bạn có thể xem chi tiết tại trang "Yêu cầu trả hàng".');
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setActionSuccess(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi gửi yêu cầu trả hàng.');
    } finally {
      setIsReturning(false);
    }
  };
  
  // Handle reorder
  const handleReorder = async () => {
    if (!order) return;
    
    try {
      setIsReordering(true);
      
      const response = await fetch(`/api/orders/${order.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'reorder',
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reorder');
      }
      
      const data = await response.json();
      
      setActionSuccess('Đơn hàng mới đã được tạo thành công!');
      
      // Redirect to the new order after a brief pause
      setTimeout(() => {
        window.location.href = `/orders/${data.newOrder.id}`;
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi đặt lại đơn hàng.');
    } finally {
      setIsReordering(false);
    }
  };
  
  // Handle download invoice
  const handleDownloadInvoice = () => {
    if (!order) return;
    
    // Open the invoice download URL in a new tab
    window.open(`/api/orders/${order.id}/invoice/download`, '_blank');
  };
  
  // Toggle item selection for return
  const toggleItemSelection = (orderItemId: string) => {
    setReturnItems(
      returnItems.map(item => 
        item.orderItemId === orderItemId 
          ? { ...item, selected: !item.selected } 
          : item
      )
    );
  };
  
  // Handle item quantity change for return
  const handleReturnQuantityChange = (orderItemId: string, quantity: number) => {
    setReturnItems(
      returnItems.map(item => 
        item.orderItemId === orderItemId 
          ? { ...item, quantity: Math.min(Math.max(1, quantity), item.maxQuantity) } 
          : item
      )
    );
  };
  
  // Handle item reason change for return
  const handleReturnReasonChange = (orderItemId: string, reason: string) => {
    setReturnItems(
      returnItems.map(item => 
        item.orderItemId === orderItemId 
          ? { ...item, reason } 
          : item
      )
    );
  };

  if (loading) {
    return (
      <div className="text-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
        <p className="mt-4">Đang tải thông tin đơn hàng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="alert alert-warning">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Không tìm thấy thông tin đơn hàng.</span>
      </div>
    );
  }

  // Helper function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { 
      style: 'currency', 
      currency: 'VND' 
    }).format(amount);
  };

  // Get status text and color
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Đang xử lý', color: 'badge-warning' };
      case 'PROCESSING':
        return { text: 'Đang chuẩn bị', color: 'badge-info' };
      case 'SHIPPED':
        return { text: 'Đang giao hàng', color: 'badge-info' };
      case 'DELIVERED':
        return { text: 'Đã giao hàng', color: 'badge-success' };
      case 'COMPLETED':
        return { text: 'Hoàn thành', color: 'badge-success' };
      case 'CANCELLED':
        return { text: 'Đã hủy', color: 'badge-error' };
      default:
        return { text: status, color: 'badge-neutral' };
    }
  };
  
  const statusInfo = getStatusInfo(order.status);

  // Modify the action buttons section
  const renderActionButtons = () => {
    if (!order) return null;
    
    return (
      <div className="mt-8 flex flex-wrap justify-end gap-4">
        {/* Only show cancel button for PENDING or PROCESSING orders */}
        {["PENDING", "PROCESSING"].includes(order.status) && (
          <button 
            className="btn btn-error"
            onClick={() => setShowCancelModal(true)}
          >
            Hủy đơn hàng
          </button>
        )}
        
        {/* Only show return button for DELIVERED or COMPLETED orders */}
        {["DELIVERED", "COMPLETED"].includes(order.status) && (
          <button 
            className="btn btn-warning"
            onClick={() => setShowReturnModal(true)}
          >
            Yêu cầu trả hàng
          </button>
        )}
        
        {/* Invoice download button available for all order states */}
        <button 
          className="btn btn-accent"
          onClick={handleDownloadInvoice}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Tải hóa đơn
        </button>
        
        {/* Reorder button for any completed, delivered, or cancelled order */}
        {["DELIVERED", "COMPLETED", "CANCELLED"].includes(order.status) && (
          <button 
            className="btn btn-primary"
            onClick={handleReorder}
            disabled={isReordering}
          >
            {isReordering ? (
              <>
                <span className="loading loading-spinner loading-xs"></span>
                Đang xử lý...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Đặt lại đơn hàng
              </>
            )}
          </button>
        )}
        
        <button className="btn btn-outline" onClick={onClose}>
          Đóng
        </button>
      </div>
    );
  };

  return (
    <div className="bg-base-100 rounded-lg shadow-lg">
      {/* Order header with close button */}
      <div className="p-6 border-b border-base-300">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold">
            Chi tiết đơn hàng #{order.id.substring(0, 8)}
          </h3>
          {onClose && (
            <button 
              onClick={onClose}
              className="btn btn-sm btn-circle"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Success message */}
      {actionSuccess && (
        <div className="p-4">
          <div className="alert alert-success">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {actionSuccess}
              {actionSuccess.includes('trả hàng') && (
                <Link href="/profile/returns" className="btn btn-xs btn-ghost ml-2">
                  Xem ngay
                </Link>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="p-4">
          <div className="alert alert-error">
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
        </div>
      )}

      {/* Order info */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h4 className="text-lg font-medium mb-2">Thông tin đơn hàng</h4>
            <div className="space-y-2 text-sm">
              <p><strong>Mã đơn hàng:</strong> #{order.id}</p>
              <p><strong>Ngày đặt:</strong> {formatDate(order.createdAt)}</p>
              <p>
                <strong>Trạng thái:</strong> 
                <span className={`badge ${statusInfo.color} ml-2`}>{statusInfo.text}</span>
              </p>
              {order.trackingNumber && (
                <p><strong>Mã vận đơn:</strong> {order.trackingNumber}</p>
              )}
              {order.paymentMethod && (
                <p><strong>Phương thức thanh toán:</strong> {order.paymentMethod}</p>
              )}
            </div>
          </div>

          {order.shippingAddress && (
            <div>
              <h4 className="text-lg font-medium mb-2">Địa chỉ giao hàng</h4>
              <div className="space-y-2 text-sm">
                <p><strong>Người nhận:</strong> {order.shippingAddress.fullName}</p>
                <p><strong>Địa chỉ:</strong> {order.shippingAddress.address}</p>
                <p><strong>Thành phố:</strong> {order.shippingAddress.city}</p>
                <p><strong>Số điện thoại:</strong> {order.shippingAddress.phoneNumber}</p>
              </div>
            </div>
          )}
        </div>

        {/* Order status tracker */}
        <div className="mb-8">
          <h4 className="text-lg font-medium mb-4">Theo dõi đơn hàng</h4>
          <div className="flex justify-between mb-2">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300'
              }`}>
                1
              </div>
              <span className="text-xs mt-1">Đặt hàng</span>
            </div>
            <div className="flex-1 border-t-2 self-start mt-4 border-dashed border-base-300 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300'
              }`}>
                2
              </div>
              <span className="text-xs mt-1">Xác nhận</span>
            </div>
            <div className="flex-1 border-t-2 self-start mt-4 border-dashed border-base-300 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['SHIPPED', 'DELIVERED', 'COMPLETED'].includes(order.status) 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300'
              }`}>
                3
              </div>
              <span className="text-xs mt-1">Vận chuyển</span>
            </div>
            <div className="flex-1 border-t-2 self-start mt-4 border-dashed border-base-300 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                ['DELIVERED', 'COMPLETED'].includes(order.status) 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300'
              }`}>
                4
              </div>
              <span className="text-xs mt-1">Giao hàng</span>
            </div>
            <div className="flex-1 border-t-2 self-start mt-4 border-dashed border-base-300 mx-2"></div>
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                order.status === 'COMPLETED' 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300'
              }`}>
                5
              </div>
              <span className="text-xs mt-1">Hoàn thành</span>
            </div>
          </div>
        </div>

        {/* Order items */}
        <h4 className="text-lg font-medium mb-4">Sản phẩm</h4>
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th className="text-right">Đơn giá</th>
                <th className="text-right">Số lượng</th>
                <th className="text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="flex items-center space-x-3">
                      <div className="avatar">
                        <div className="w-12 h-12 mask mask-squircle">
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
                      <div>
                        <Link href={`/products/${item.product.id}`} className="font-medium hover:underline">
                          {item.product.name}
                        </Link>
                      </div>
                    </div>
                  </td>
                  <td className="text-right">{formatCurrency(item.price)}</td>
                  <td className="text-right">{item.quantity}</td>
                  <td className="text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="text-right font-bold">Tổng cộng</td>
                <td className="text-right font-bold text-lg">{formatCurrency(order.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Order notes */}
        {order.notes && (
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-2">Ghi chú</h4>
            <div className="bg-base-200 p-4 rounded-lg">
              <p>{order.notes}</p>
            </div>
          </div>
        )}

        {/* Replace the action buttons with the new ones */}
        {renderActionButtons()}
      </div>
      
      {/* Cancel Order Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Xác nhận hủy đơn hàng</h3>
            
            <p className="mb-4">Bạn có chắc chắn muốn hủy đơn hàng này không? Hành động này không thể hoàn tác.</p>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Lý do hủy đơn hàng</span>
              </label>
              <select 
                className="select select-bordered w-full"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              >
                <option value="">-- Chọn lý do --</option>
                <option value="Tôi muốn thay đổi địa chỉ giao hàng">Tôi muốn thay đổi địa chỉ giao hàng</option>
                <option value="Tôi muốn thay đổi phương thức thanh toán">Tôi muốn thay đổi phương thức thanh toán</option>
                <option value="Tôi không còn muốn sản phẩm này nữa">Tôi không còn muốn sản phẩm này nữa</option>
                <option value="Tôi đặt nhầm sản phẩm">Tôi đặt nhầm sản phẩm</option>
                <option value="Thời gian giao hàng quá lâu">Thời gian giao hàng quá lâu</option>
                <option value="Lý do khác">Lý do khác</option>
              </select>
            </div>
            
            {cancelReason === 'Lý do khác' && (
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Chi tiết lý do</span>
                </label>
                <textarea 
                  className="textarea textarea-bordered h-24"
                  placeholder="Nhập lý do của bạn"
                  onChange={(e) => setCancelReason(e.target.value)}
                ></textarea>
              </div>
            )}
            
            <div className="flex justify-end space-x-4">
              <button 
                className="btn btn-outline"
                onClick={() => setShowCancelModal(false)}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn-error"
                onClick={handleCancelOrder}
                disabled={isCancelling || !cancelReason}
              >
                {isCancelling ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Đang xử lý...
                  </>
                ) : 'Xác nhận hủy đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Return Order Modal */}
      {showReturnModal && order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-base-100 rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Yêu cầu trả hàng</h3>
            
            <p className="mb-4">Vui lòng chọn các sản phẩm bạn muốn trả lại và cung cấp lý do.</p>
            
            <div className="overflow-x-auto mb-4">
              <table className="table w-full">
                <thead>
                  <tr>
                    <th></th>
                    <th>Sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Lý do</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => {
                    const returnItem = returnItems.find(ri => ri.orderItemId === item.id);
                    if (!returnItem) return null;
                    
                    return (
                      <tr key={item.id}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="checkbox" 
                            checked={returnItem.selected}
                            onChange={() => toggleItemSelection(item.id)}
                          />
                        </td>
                        <td>
                          <div className="flex items-center space-x-3">
                            <div className="avatar">
                              <div className="w-12 h-12 mask mask-squircle">
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
                            <div>
                              <div className="font-bold">{item.product.name}</div>
                              <div className="text-sm opacity-50">Đã mua: {item.quantity}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input 
                            type="number" 
                            className="input input-bordered w-24" 
                            min="1" 
                            max={returnItem.maxQuantity}
                            value={returnItem.quantity}
                            onChange={(e) => handleReturnQuantityChange(item.id, parseInt(e.target.value))}
                            disabled={!returnItem.selected}
                          />
                        </td>
                        <td>
                          <select 
                            className="select select-bordered w-full max-w-xs"
                            value={returnItem.reason}
                            onChange={(e) => handleReturnReasonChange(item.id, e.target.value)}
                            disabled={!returnItem.selected}
                          >
                            <option value="">-- Chọn lý do --</option>
                            <option value="Sản phẩm bị lỗi">Sản phẩm bị lỗi</option>
                            <option value="Không đúng kích thước">Không đúng kích thước</option>
                            <option value="Không như mô tả">Không như mô tả</option>
                            <option value="Nhận sai sản phẩm">Nhận sai sản phẩm</option>
                            <option value="Chất lượng kém">Chất lượng kém</option>
                            <option value="Lý do khác">Lý do khác</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">Lý do trả hàng chung (tùy chọn)</span>
              </label>
              <textarea 
                className="textarea textarea-bordered h-24"
                placeholder="Thêm thông tin chi tiết về lý do trả hàng"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              ></textarea>
            </div>
            
            <div className="flex justify-end space-x-4 mt-4">
              <button 
                className="btn btn-outline"
                onClick={() => setShowReturnModal(false)}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn-warning"
                onClick={handleReturnOrder}
                disabled={isReturning || returnItems.every(item => !item.selected || item.quantity === 0)}
              >
                {isReturning ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Đang xử lý...
                  </>
                ) : 'Gửi yêu cầu trả hàng'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
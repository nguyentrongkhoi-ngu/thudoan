'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, DollarSign, Tag, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useCart } from '@/context/CartProvider';

// Định nghĩa kiểu dữ liệu
type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  imageUrl?: string;
  category: {
    id: string;
    name: string;
  };
};

type CartItem = {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: Product;
};

type CartData = {
  items: CartItem[];
  subtotal: number;
  discount: number;
  total: number;
  appliedCoupon: {
    code: string;
    discountPercent?: number;
    discountAmount?: number;
    discountValue: number;
  } | null;
};

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cartItems, cartTotal, updateCartItem, removeFromCart } = useCart();
  const [cartData, setCartData] = useState<CartData>({ 
    items: [], 
    subtotal: 0,
    discount: 0,
    total: 0,
    appliedCoupon: null
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponError, setCouponError] = useState<string>('');
  const [applyingCoupon, setApplyingCoupon] = useState<boolean>(false);
  const [processingCheckout, setProcessingCheckout] = useState<boolean>(false);
  const [removingItem, setRemovingItem] = useState<string | null>(null);

  // Load cart data
  useEffect(() => {
    if (status === 'authenticated') {
      fetchCart();
    }
  }, [status]);

  // Update local cartData when cartItems changes
  useEffect(() => {
    if (cartItems.length > 0) {
      setCartData(prev => ({
        ...prev,
        items: cartItems,
        // Nếu cartData.discount đã có (từ mã giảm giá), áp dụng discount vào total
        // Nếu không, cập nhật theo cartTotal từ context
        subtotal: cartTotal,
        total: prev.discount > 0 ? cartTotal - prev.discount : cartTotal
      }));
      setLoading(false);
    }
  }, [cartItems, cartTotal]);

  // Fetch cart data from API
  const fetchCart = async (couponToApply?: string) => {
    try {
      setLoading(true);
      let url = '/api/cart';
      
      if (couponToApply) {
        url += `?couponCode=${encodeURIComponent(couponToApply)}`;
      } else if (cartData?.appliedCoupon?.code) {
        url += `?couponCode=${encodeURIComponent(cartData.appliedCoupon.code)}`;
      }
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        
        // Xử lý trường hợp chưa đăng nhập (401 Unauthorized)
        if (response.status === 401) {
          console.log('Người dùng chưa đăng nhập:', errorData);
          // Không hiển thị toast khi chưa đăng nhập, để tránh gây phiền người dùng
          setLoading(false);
          return;
        }
        
        // Xử lý các lỗi khác
        throw new Error(errorData.message || errorData.error || 'Lỗi khi lấy giỏ hàng');
      }
      
      const data = await response.json();
      setCartData(data);
      
      if (couponToApply && data.appliedCoupon) {
        toast.success(`Đã áp dụng mã giảm giá ${data.appliedCoupon.code}`);
        setCouponCode('');
        setCouponError('');
      }

      // Thông báo cho các component khác về việc giỏ hàng đã được cập nhật
      // Đảm bảo sự kiện này được kích hoạt sau khi đã cập nhật trạng thái
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }, 100);
    } catch (error) {
      console.error('Lỗi khi lấy giỏ hàng:', error);
      toast.error((error as Error).message || 'Không thể tải giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  // Cập nhật số lượng sản phẩm using CartProvider
  const handleUpdateQuantity = async (cartItemId: string, newQuantity: number) => {
    try {
      setUpdating(prev => ({ ...prev, [cartItemId]: true }));
      
      // Nếu số lượng bằng 0, đánh dấu item đang được xóa
      if (newQuantity === 0) {
        setRemovingItem(cartItemId);
        await removeFromCart(cartItemId);
      } else {
        await updateCartItem(cartItemId, newQuantity);
      }
      
      // UI cleanup
      setTimeout(() => {
        if (newQuantity === 0) {
          setRemovingItem(null);
        }
        setUpdating(prev => ({ ...prev, [cartItemId]: false }));
      }, 300);
      
    } catch (error) {
      console.error('Lỗi khi cập nhật giỏ hàng:', error);
      toast.error((error as Error).message || 'Không thể cập nhật giỏ hàng');
      setRemovingItem(null);
      setUpdating(prev => ({ ...prev, [cartItemId]: false }));
    }
  };

  // Áp dụng mã giảm giá
  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Vui lòng nhập mã giảm giá');
      return;
    }
    
    try {
      setApplyingCoupon(true);
      setCouponError('');
      
      // Gọi API để kiểm tra và áp dụng mã giảm giá
      const response = await fetch('/api/cart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ couponCode: couponCode.trim() }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Mã giảm giá không hợp lệ');
      }
      
      // Cập nhật dữ liệu giỏ hàng với kết quả từ API
      setCartData(data);
      
      if (data.appliedCoupon) {
        toast.success(`Đã áp dụng mã giảm giá ${data.appliedCoupon.code}`);
        setCouponCode('');
        setCouponError('');
        
        // Thông báo cho các component khác về việc giỏ hàng đã được cập nhật
        window.dispatchEvent(new CustomEvent('cart-updated'));
      }
    } catch (error) {
      console.error('Lỗi khi áp dụng mã giảm giá:', error);
      setCouponError((error as Error).message || 'Mã giảm giá không hợp lệ');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Xóa mã giảm giá
  const removeCoupon = async () => {
    try {
      setApplyingCoupon(true);
      
      // Gọi API để lấy giỏ hàng mà không áp dụng mã giảm giá
      const response = await fetch('/api/cart', {
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Không thể hủy mã giảm giá');
      }
      
      // Cập nhật dữ liệu giỏ hàng sau khi hủy mã giảm giá
      setCartData({
        ...data,
        appliedCoupon: null,
        discount: 0,
        total: data.subtotal // Đặt lại total = subtotal khi xóa mã giảm giá
      });
      
      toast.success('Đã hủy mã giảm giá');
      
      // Thông báo cho các component khác về việc giỏ hàng đã được cập nhật
      window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
      console.error('Lỗi khi hủy mã giảm giá:', error);
      toast.error('Không thể hủy mã giảm giá');
    } finally {
      setApplyingCoupon(false);
    }
  };

  // Xử lý thanh toán
  const handleCheckout = async () => {
    if (!cartData?.items?.length) {
      toast.error('Giỏ hàng của bạn đang trống');
      return;
    }
    
    try {
      setProcessingCheckout(true);
      
      // Lưu dữ liệu giỏ hàng hiện tại vào localStorage để sử dụng ở trang thanh toán
      if (cartData) {
        const checkoutData = {
          items: cartData.items,
          subtotal: cartData.subtotal || 0,
          discount: cartData.discount || 0,
          total: cartData.total || 0,
          appliedCoupon: cartData.appliedCoupon || null
        };
        
        localStorage.setItem('checkout_data', JSON.stringify(checkoutData));
      }
      
      // Điều hướng đến trang thanh toán
      router.push('/checkout');
    } catch (error) {
      console.error('Lỗi khi chuyển đến trang thanh toán:', error);
      toast.error('Có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setProcessingCheckout(false);
    }
  };

  // Hiển thị khi đang đăng nhập
  if (status === 'loading' || (status === 'authenticated' && loading)) {
    return (
      <div className="container mx-auto px-4 py-10 min-h-[70vh] flex flex-col items-center justify-center">
        <div className="w-full max-w-4xl p-8 border border-primary/10 rounded-xl bg-primary/5 backdrop-blur-lg shadow-xl">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-primary/20 rounded-lg w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-20 w-20 bg-primary/20 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-primary/20 rounded w-3/4"></div>
                    <div className="h-4 bg-primary/20 rounded w-1/4"></div>
                    <div className="h-4 bg-primary/20 rounded w-1/2"></div>
                  </div>
                  <div className="w-24 h-8 bg-primary/20 rounded-lg"></div>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-4">
              <div className="h-4 bg-primary/20 rounded w-1/3"></div>
              <div className="h-4 bg-primary/20 rounded w-1/4"></div>
              <div className="h-4 bg-primary/20 rounded w-2/5"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Hiển thị khi chưa đăng nhập
  if (status === 'unauthenticated') {
    return (
      <div className="container mx-auto px-4 py-12 min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-10 rounded-xl bg-base-200 shadow-lg max-w-md w-full"
        >
          <ShoppingBag size={60} className="mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">Giỏ hàng của bạn</h2>
          <p className="mb-6 text-base-content/70">
            Bạn cần đăng nhập để xem và quản lý giỏ hàng của mình. Sau khi đăng nhập, bạn có thể xem các sản phẩm đã thêm vào giỏ hàng và tiến hành thanh toán.
          </p>
          <div className="flex flex-col gap-3">
            <Link 
              href="/login?redirect=/cart"
              className="btn btn-primary btn-block"
            >
              Đăng nhập
            </Link>
            <Link 
              href="/register?redirect=/cart"
              className="btn btn-outline btn-block"
            >
              Đăng ký tài khoản mới
            </Link>
            <Link 
              href="/products?cart=reminder"
              className="text-primary mt-4 inline-flex items-center justify-center hover:underline"
            >
              <ArrowRight size={16} className="mr-1 rotate-180" />
              Tiếp tục mua sắm
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Hiển thị khi giỏ hàng trống
  if (!cartData?.items?.length) {
    return (
      <div className="container mx-auto px-4 py-12 min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center p-10 rounded-xl bg-base-200 shadow-lg max-w-md w-full"
        >
          <ShoppingBag size={60} className="mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-4">Giỏ hàng trống</h2>
          <p className="mb-6 text-base-content/70">
            Bạn chưa có sản phẩm nào trong giỏ hàng
          </p>
          <Link 
            href="/products?cart=reminder"
            className="btn btn-primary btn-block"
          >
            Tiếp tục mua sắm
          </Link>
        </motion.div>
      </div>
    );
  }

  // Format tiền tệ
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="flex items-center mb-6">
        <h1 className="text-3xl font-bold">Giỏ hàng của tôi</h1>
        <span className="ml-3 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm">
          {cartData?.items?.length || 0} sản phẩm
        </span>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh sách sản phẩm */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-base-100 rounded-xl shadow-md overflow-hidden">
            <div className="hidden md:grid grid-cols-12 gap-4 p-4 bg-base-200 font-medium">
              <div className="col-span-6">Sản phẩm</div>
              <div className="col-span-2 text-center">Đơn giá</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2 text-center">Thành tiền</div>
            </div>
            
            {/* Danh sách sản phẩm */}
            <AnimatePresence>
              {Array.isArray(cartData?.items) && cartData.items.map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ 
                    opacity: removingItem === item.id ? 0 : 1, 
                    height: 'auto',
                    scale: removingItem === item.id ? 0.95 : 1 
                  }}
                  exit={{ opacity: 0, height: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border-b border-base-200 items-center ${removingItem === item.id ? 'opacity-50' : ''}`}
                >
                  {/* Thông tin sản phẩm */}
                  <div className="col-span-6 flex gap-4">
                    <div className="relative h-20 w-20 bg-base-200 rounded-lg overflow-hidden group">
                      <Link href={`/products/${item.product?.id || '#'}`} className="block h-full w-full">
                        {item.product?.imageUrl ? (
                          <Image
                            src={item.product?.imageUrl}
                            alt={item.product?.name || 'Sản phẩm'}
                            fill
                            className="object-cover transition-transform group-hover:scale-110"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-base-content/30">
                            <ShoppingBag size={24} />
                          </div>
                        )}
                      </Link>
                    </div>
                    <div className="flex flex-col justify-between py-1">
                      <Link href={`/products/${item.product?.id || '#'}`} className="font-medium hover:text-primary transition-colors line-clamp-2">
                        {item.product?.name || 'Sản phẩm không xác định'}
                      </Link>
                      <div className="text-sm text-base-content/70">
                        Danh mục: {item.product?.category?.name || 'Không xác định'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Đơn giá */}
                  <div className="md:col-span-2 flex md:block items-center">
                    <span className="md:hidden mr-2 font-medium">Đơn giá:</span>
                    <span className="text-primary font-medium md:text-center block">
                      {formatCurrency(item.product?.price || 0)}
                    </span>
                  </div>
                  
                  {/* Số lượng */}
                  <div className="md:col-span-2 md:flex md:justify-center">
                    <div className="flex items-center">
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={updating[item.id] || item.quantity <= 1}
                        className="btn btn-sm btn-square btn-ghost"
                        aria-label="Giảm số lượng"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="text"
                        value={updating[item.id] ? '...' : item.quantity}
                        readOnly
                        className="input input-sm w-12 text-center bg-base-100"
                      />
                      <button 
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={updating[item.id] || item.quantity >= (item.product?.stock || 0)}
                        className="btn btn-sm btn-square btn-ghost"
                        aria-label="Tăng số lượng"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Thành tiền và nút xóa */}
                  <div className="md:col-span-2 flex justify-between md:justify-center items-center">
                    <div className="flex items-center md:block">
                      <span className="md:hidden mr-2 font-medium">Thành tiền:</span>
                      <span className="font-bold text-primary md:text-center block">
                        {formatCurrency((item.product?.price || 0) * item.quantity)}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, 0)}
                      disabled={updating[item.id]}
                      className="btn btn-sm btn-square md:hidden"
                      aria-label="Xóa sản phẩm"
                    >
                      {updating[item.id] ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} className="text-error" />
                      )}
                    </button>
                  </div>
                  
                  {/* Nút xóa (chỉ hiển thị trên màn hình lớn) */}
                  <div className="hidden md:flex justify-end">
                    <button 
                      onClick={() => handleUpdateQuantity(item.id, 0)}
                      disabled={updating[item.id]}
                      className="btn btn-sm btn-square btn-ghost text-error"
                      title="Xóa sản phẩm"
                      aria-label="Xóa sản phẩm"
                    >
                      {updating[item.id] ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Trash2 size={16} />
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          {/* Liên kết trở về trang sản phẩm */}
          <div className="flex justify-start py-2">
            <Link 
              href="/products?cart=reminder"
              className="text-primary flex items-center hover:underline"
            >
              <ArrowRight size={16} className="mr-1 rotate-180" />
              Tiếp tục mua sắm
            </Link>
          </div>
        </div>
        
        {/* Thông tin thanh toán */}
        <div className="lg:col-span-1">
          <div className="bg-base-100 rounded-xl shadow-md p-6 space-y-6 sticky top-24">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <DollarSign size={20} className="mr-2 text-primary" />
              Thông tin thanh toán
            </h2>
            
            {/* Mã giảm giá */}
            <div className="space-y-3">
              <label className="font-medium flex items-center">
                <Tag size={16} className="mr-2 text-primary" />
                Mã giảm giá
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã giảm giá"
                  disabled={applyingCoupon || !!cartData.appliedCoupon}
                  className="input input-bordered flex-1"
                />
                {!cartData.appliedCoupon ? (
                  <button
                    onClick={applyCoupon}
                    disabled={applyingCoupon || !couponCode.trim()}
                    className="btn btn-primary min-w-[90px]"
                  >
                    {applyingCoupon ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : 'Áp dụng'}
                  </button>
                ) : (
                  <button
                    onClick={removeCoupon}
                    disabled={applyingCoupon}
                    className="btn btn-outline btn-error min-w-[90px]"
                  >
                    {applyingCoupon ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : 'Hủy'}
                  </button>
                )}
              </div>
              
              {/* Hiển thị thông báo lỗi */}
              {couponError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-error text-sm flex items-start mt-1"
                >
                  <AlertCircle size={14} className="mr-1 mt-0.5" /> 
                  {couponError}
                </motion.div>
              )}
              
              {/* Hiển thị coupon đang áp dụng */}
              {cartData?.appliedCoupon && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-start bg-success/10 text-success p-2 rounded"
                >
                  <Check size={16} className="mr-1 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium">{cartData.appliedCoupon.code}</span>
                    {cartData.appliedCoupon.discountPercent && (
                      <span> - Giảm {cartData.appliedCoupon.discountPercent}%</span>
                    )}
                    {cartData.appliedCoupon.discountAmount && (
                      <span> - Giảm {formatCurrency(cartData.appliedCoupon.discountAmount)}</span>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
            
            {/* Tính toán giá trị đơn hàng */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between">
                <span className="text-base-content/70">Tạm tính:</span>
                <span>{formatCurrency(cartData?.subtotal || 0)}</span>
              </div>
              
              <motion.div 
                className="flex justify-between"
                animate={{ 
                  scale: (cartData?.discount || 0) > 0 ? [1, 1.05, 1] : 1
                }}
                transition={{ duration: 0.5 }}
              >
                <span className="text-base-content/70">Giảm giá:</span>
                <span className={(cartData?.discount || 0) > 0 ? "text-success font-medium" : ""}>
                  {(cartData?.discount || 0) > 0 ? `- ${formatCurrency(cartData.discount)}` : formatCurrency(0)}
                </span>
              </motion.div>
              
              <div className="border-t border-base-300 my-2 pt-2"></div>
              
              <motion.div 
                className="flex justify-between font-bold text-lg"
                animate={{ 
                  scale: [1, 1.02, 1]
                }}
                transition={{ 
                  duration: 0.5,
                  repeat: 0,
                  repeatType: "reverse"
                }}
              >
                <span>Tổng cộng:</span>
                <span className="text-primary">{formatCurrency(cartData?.total || 0)}</span>
              </motion.div>
            </div>
            
            {/* Nút thanh toán */}
            <motion.button
              onClick={handleCheckout}
              disabled={processingCheckout}
              className="btn btn-primary btn-block"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {processingCheckout ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  Thanh toán
                  <ArrowRight size={16} className="ml-2" />
                </>
              )}
            </motion.button>
            
            {/* Thông tin thanh toán an toàn */}
            <div className="text-center text-xs text-base-content/60 pt-2 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Thanh toán an toàn & bảo mật
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2, CreditCard, BadgeCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Province, 
  District, 
  Ward, 
  fetchProvinces, 
  fetchDistrictsForProvince, 
  fetchWardsForDistrict 
} from '@/lib/administrativeData';

// Define checkout steps
type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

// Shipping address type
type ShippingAddress = {
  fullName: string;
  phoneNumber: string;
  address: string;
  ward: string;
  district: string;
  city: string;
  country: string;
  shippingNote: string;
};

// Payment method type
type PaymentMethod = 'creditCard' | 'bankTransfer' | 'cashOnDelivery' | 'eWallet';

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cartItems, cartTotal, clearCart } = useCart();
  
  // State for checkout process
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('shipping');
  const [loading, setLoading] = useState<boolean>(true);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [orderComplete, setOrderComplete] = useState<boolean>(false);
  const [orderId, setOrderId] = useState<string>('');
  
  // Thêm state cho thông tin giảm giá
  const [subtotal, setSubtotal] = useState<number>(cartTotal);
  const [discount, setDiscount] = useState<number>(0);
  const [total, setTotal] = useState<number>(cartTotal);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  
  // State for location data
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loadingLocations, setLoadingLocations] = useState<boolean>(false);
  
  // State for checkout data
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    phoneNumber: '',
    address: '',
    ward: '',
    district: '',
    city: '',
    country: 'Vietnam',
    shippingNote: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cashOnDelivery');
  
  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Tải dữ liệu tỉnh/thành phố khi component được mount
  useEffect(() => {
    loadProvinces();
  }, []);
  
  // Load cart data on component mount
  useEffect(() => {
    if (status === 'authenticated') {
      if (cartItems.length === 0) {
        // Redirect to cart page if cart is empty
        toast.error('Giỏ hàng của bạn đang trống');
        router.push('/cart');
        return;
      }
      
      // Đọc dữ liệu đã lưu từ localStorage
      try {
        const savedCheckoutData = localStorage.getItem('checkout_data');
        if (savedCheckoutData) {
          const checkoutData = JSON.parse(savedCheckoutData);
          if (checkoutData.appliedCoupon) {
            setAppliedCoupon(checkoutData.appliedCoupon);
            setSubtotal(checkoutData.subtotal || cartTotal);
            setDiscount(checkoutData.discount || 0);
            setTotal(checkoutData.total || cartTotal);
          }
        }
      } catch (error) {
        console.error('Lỗi khi đọc dữ liệu từ localStorage:', error);
      }
      
      setLoading(false);
    } else if (status === 'unauthenticated') {
      // Redirect to login page if not authenticated
      router.push('/login?redirectTo=/checkout');
    }
  }, [status, cartItems, router, cartTotal]);
  
  // Handle window unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Không cần làm gì vì dữ liệu đã được lưu trong localStorage
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Handle input change for shipping form
  const handleShippingInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Xử lý khi thay đổi tỉnh/thành phố, quận/huyện hoặc phường/xã
    if (name === 'city') {
      // Tìm tỉnh/thành phố được chọn để lấy mã
      const selectedProvince = provinces.find(p => p.name === value);
      if (selectedProvince) {
        // Cập nhật state và tải quận/huyện mới
        setShippingAddress(prev => ({
          ...prev,
          city: value,
          district: '',
          ward: ''
        }));
        loadDistricts(selectedProvince.code);
      }
    } else if (name === 'district') {
      // Tìm quận/huyện được chọn để lấy mã
      const selectedDistrict = districts.find(d => d.name === value);
      if (selectedDistrict) {
        // Cập nhật state và tải phường/xã mới
        setShippingAddress(prev => ({
          ...prev,
          district: value,
          ward: ''
        }));
        loadWards(selectedDistrict.code);
      }
    } else if (name === 'ward') {
      // Đơn giản chỉ cập nhật giá trị phường/xã
      setShippingAddress(prev => ({
        ...prev,
        ward: value
      }));
    } else {
      // Cập nhật các trường khác một cách bình thường
      setShippingAddress(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Xóa lỗi cho trường đang được cập nhật
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  // Load provinces data
  const loadProvinces = async () => {
    try {
      setLoadingLocations(true);
      
      // Fetch provinces từ API
      const provincesData = await fetchProvinces();
      setProvinces(provincesData);
      
      // Reset các trường liên quan
      setDistricts([]);
      setWards([]);
      
    } catch (error) {
      console.error('Lỗi khi tải tỉnh/thành phố:', error);
      toast.error('Không thể tải danh sách tỉnh/thành phố');
    } finally {
      setLoadingLocations(false);
    }
  };
  
  // Load districts data for a province
  const loadDistricts = async (provinceCode: string) => {
    try {
      setLoadingLocations(true);
      
      // Fetch districts từ API
      const districtsData = await fetchDistrictsForProvince(provinceCode);
      setDistricts(districtsData);
      
      // Reset phường/xã khi thay đổi quận/huyện
      setWards([]);
      
    } catch (error) {
      console.error('Lỗi khi tải quận/huyện:', error);
      toast.error('Không thể tải danh sách quận/huyện');
    } finally {
      setLoadingLocations(false);
    }
  };
  
  // Load wards data for a district
  const loadWards = async (districtCode: string) => {
    try {
      setLoadingLocations(true);
      
      // Fetch wards từ API
      const wardsData = await fetchWardsForDistrict(districtCode);
      
      if (wardsData.length === 0) {
        console.log(`Không có dữ liệu phường/xã cho quận/huyện có mã: ${districtCode}`);
        toast.error('Không có dữ liệu phường/xã cho quận/huyện này');
        
        // Hiển thị gợi ý để người dùng nhập phường/xã vào ghi chú
        setShippingAddress(prev => ({
          ...prev,
          shippingNote: prev.shippingNote ? prev.shippingNote : 'Phường/xã: '
        }));
        
        // Thêm một tùy chọn thông báo cho người dùng
        setWards([
          { code: `${districtCode}00`, name: "-- Vui lòng nhập tên phường/xã vào ghi chú --", districtCode }
        ]);
      } else {
        setWards(wardsData);
      }
      
    } catch (error) {
      console.error('Lỗi khi tải phường/xã:', error);
      toast.error('Không thể tải danh sách phường/xã');
    } finally {
      setLoadingLocations(false);
    }
  };
  
  // Handle payment method selection
  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
  };
  
  // Validate shipping form
  const validateShippingForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!shippingAddress.fullName.trim()) {
      newErrors.fullName = 'Vui lòng nhập họ tên người nhận';
    }
    
    if (!shippingAddress.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Vui lòng nhập số điện thoại';
    } else if (!/^(0|\+84)[3|5|7|8|9][0-9]{8}$/.test(shippingAddress.phoneNumber.trim())) {
      newErrors.phoneNumber = 'Số điện thoại không đúng định dạng';
    }
    
    if (!shippingAddress.address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ cụ thể';
    }
    
    // Kiểm tra xem danh sách phường/xã có phải là danh sách giả không
    const hasPlaceholderWard = wards.length === 1 && wards[0].code.endsWith('00');
    
    if (!shippingAddress.ward.trim() && !hasPlaceholderWard) {
      newErrors.ward = 'Vui lòng chọn phường/xã';
    }
    
    // Nếu đang sử dụng ward giả thì kiểm tra xem đã nhập thông tin phường/xã vào ghi chú chưa
    if (hasPlaceholderWard && !shippingAddress.shippingNote.includes('Phường') && 
        !shippingAddress.shippingNote.includes('phường') && 
        !shippingAddress.shippingNote.includes('Xã') && 
        !shippingAddress.shippingNote.includes('xã')) {
      newErrors.shippingNote = 'Vui lòng nhập tên phường/xã vào ghi chú';
    }
    
    if (!shippingAddress.district.trim()) {
      newErrors.district = 'Vui lòng chọn quận/huyện';
    }
    
    if (!shippingAddress.city.trim()) {
      newErrors.city = 'Vui lòng chọn tỉnh/thành phố';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Navigate to next step
  const goToNextStep = () => {
    if (currentStep === 'shipping') {
      if (validateShippingForm()) {
        setCurrentStep('payment');
      }
    } else if (currentStep === 'payment') {
      setCurrentStep('confirmation');
    }
  };
  
  // Navigate to previous step
  const goToPreviousStep = () => {
    if (currentStep === 'payment') {
      setCurrentStep('shipping');
    } else if (currentStep === 'confirmation') {
      setCurrentStep('payment');
    }
  };
  
  // Submit order
  const submitOrder = async () => {
    try {
      setProcessingOrder(true);
      
      // Chuẩn bị dữ liệu đơn hàng bao gồm thông tin giảm giá
      const orderData = {
        items: cartItems.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress,
        paymentMethod,
        total: total,
        // Thêm thông tin mã giảm giá nếu có
        coupon: appliedCoupon ? {
          code: appliedCoupon.code,
          discountValue: discount
        } : null
      };
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Có lỗi xảy ra khi tạo đơn hàng');
      }
      
      const data = await response.json();
      
      // Clear cart after successful order
      clearCart();
      
      // Xóa dữ liệu từ localStorage
      localStorage.removeItem('checkout_data');
      
      // Set order complete state
      setOrderComplete(true);
      setOrderId(data.order.id);
      
      // Send confirmation email
      await fetch('/api/orders/send-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ orderId: data.order.id })
      });
      
      toast.success('Đặt hàng thành công!');
    } catch (error) {
      console.error('Error submitting order:', error);
      toast.error('Có lỗi xảy ra khi đặt hàng. Vui lòng thử lại sau.');
    } finally {
      setProcessingOrder(false);
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Show order complete page
  if (orderComplete) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body items-center text-center p-8">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-success" />
            </div>
            <h2 className="card-title text-2xl mb-2">Đặt hàng thành công!</h2>
            <p className="text-base-content/70 mb-6">
              Đơn hàng của bạn đã được đặt thành công. Một email xác nhận đã được gửi đến địa chỉ email của bạn.
            </p>
            <div className="bg-base-200 p-4 rounded-lg mb-6 w-full max-w-md">
              <p className="font-semibold">Mã đơn hàng: <span className="font-mono">{orderId}</span></p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/profile" className="btn btn-primary">
                Xem đơn hàng của tôi
              </Link>
              <Link href="/" className="btn btn-outline">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">Thanh toán</h1>
      
      {/* Checkout progress */}
      <div className="mb-8">
        <ul className="steps steps-horizontal w-full">
          <li className={`step ${currentStep === 'shipping' || currentStep === 'payment' || currentStep === 'confirmation' ? 'step-primary' : ''}`}>
            Thông tin giao hàng
          </li>
          <li className={`step ${currentStep === 'payment' || currentStep === 'confirmation' ? 'step-primary' : ''}`}>
            Phương thức thanh toán
          </li>
          <li className={`step ${currentStep === 'confirmation' ? 'step-primary' : ''}`}>
            Xác nhận đơn hàng
          </li>
        </ul>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentStep === 'shipping' && (
              <motion.div
                key="shipping"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card bg-base-100 shadow-lg"
              >
                <div className="card-body">
                  <h2 className="card-title mb-4">Thông tin giao hàng</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Họ và tên người nhận <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={shippingAddress.fullName}
                        onChange={handleShippingInputChange}
                        placeholder="Nguyễn Văn A"
                        className={`input input-bordered w-full ${errors.fullName ? 'input-error' : ''}`}
                      />
                      {errors.fullName && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.fullName}</span>
                        </label>
                      )}
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Số điện thoại <span className="text-error">*</span></span>
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={shippingAddress.phoneNumber}
                        onChange={handleShippingInputChange}
                        placeholder="0912345678"
                        className={`input input-bordered w-full ${errors.phoneNumber ? 'input-error' : ''}`}
                      />
                      {errors.phoneNumber && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.phoneNumber}</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Tỉnh/Thành phố <span className="text-error">*</span></span>
                    </label>
                    <select
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleShippingInputChange}
                      className={`select select-bordered w-full ${errors.city ? 'select-error' : ''}`}
                      disabled={loadingLocations}
                    >
                      <option value="" disabled>Chọn Tỉnh/Thành phố</option>
                      {provinces.map(province => (
                        <option key={province.code} value={province.name}>
                          {province.name}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.city}</span>
                      </label>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Quận/Huyện <span className="text-error">*</span></span>
                      </label>
                      <select
                        name="district"
                        value={shippingAddress.district}
                        onChange={handleShippingInputChange}
                        className={`select select-bordered w-full ${errors.district ? 'select-error' : ''}`}
                        disabled={!shippingAddress.city || loadingLocations}
                      >
                        <option value="" disabled>Chọn Quận/Huyện</option>
                        {districts.map(district => (
                          <option key={district.code} value={district.name}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                      {errors.district && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.district}</span>
                        </label>
                      )}
                    </div>
                    
                    <div className="form-control w-full">
                      <label className="label">
                        <span className="label-text font-medium">Phường/Xã <span className="text-error">*</span></span>
                      </label>
                      <select
                        name="ward"
                        value={shippingAddress.ward}
                        onChange={handleShippingInputChange}
                        className={`select select-bordered w-full ${errors.ward ? 'select-error' : ''}`}
                        disabled={!shippingAddress.district || loadingLocations}
                      >
                        <option value="" disabled>Chọn Phường/Xã</option>
                        {wards.map(ward => (
                          <option key={ward.code} value={ward.name}>
                            {ward.name}
                          </option>
                        ))}
                      </select>
                      {errors.ward && (
                        <label className="label">
                          <span className="label-text-alt text-error">{errors.ward}</span>
                        </label>
                      )}
                      {loadingLocations && (
                        <div className="mt-2 text-sm text-primary flex items-center">
                          <Loader2 size={14} className="animate-spin mr-2" />
                          <span>Đang tải dữ liệu...</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className="label-text font-medium">Địa chỉ cụ thể <span className="text-error">*</span></span>
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={shippingAddress.address}
                      onChange={handleShippingInputChange}
                      placeholder="Số nhà, tên đường, tòa nhà, căn hộ..."
                      className={`input input-bordered w-full ${errors.address ? 'input-error' : ''}`}
                    />
                    {errors.address && (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.address}</span>
                      </label>
                    )}
                  </div>
                  
                  <div className="form-control w-full">
                    <label className="label">
                      <span className={`label-text font-medium ${!wards.length || (wards.length === 1 && wards[0].code.endsWith('00')) ? 'text-warning font-bold' : ''}`}>
                        Ghi chú giao hàng {!wards.length || (wards.length === 1 && wards[0].code.endsWith('00')) ? '(Vui lòng nhập tên phường/xã vào đây)' : ''}
                      </span>
                    </label>
                    <textarea
                      name="shippingNote"
                      value={shippingAddress.shippingNote}
                      onChange={handleShippingInputChange}
                      placeholder={!wards.length || (wards.length === 1 && wards[0].code.endsWith('00')) 
                        ? "Vui lòng nhập tên phường/xã của bạn vào đây và các ghi chú khác (nếu có)"
                        : "Ghi chú thêm cho đơn vị vận chuyển (không bắt buộc)"}
                      className={`textarea ${
                        errors.shippingNote ? 'textarea-error' : 
                        (!wards.length || (wards.length === 1 && wards[0].code.endsWith('00'))) 
                          ? 'textarea-warning focus:textarea-warning' 
                          : 'textarea-bordered'} w-full`}
                      rows={3}
                    ></textarea>
                    {errors.shippingNote ? (
                      <label className="label">
                        <span className="label-text-alt text-error">{errors.shippingNote}</span>
                      </label>
                    ) : (!wards.length || (wards.length === 1 && wards[0].code.endsWith('00'))) && (
                      <label className="label">
                        <span className="label-text-alt text-warning">Vui lòng ghi rõ tên phường/xã vào ô ghi chú này</span>
                      </label>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            
            {currentStep === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card bg-base-100 shadow-lg"
              >
                <div className="card-body">
                  <h2 className="card-title mb-4">Phương thức thanh toán</h2>
                  
                  <div className="space-y-4">
                    <div className={`p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'creditCard' ? 'border-primary bg-primary/5' : 'border-base-300'}`}
                      onClick={() => handlePaymentMethodChange('creditCard')}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'creditCard'}
                          onChange={() => handlePaymentMethodChange('creditCard')}
                          className="radio radio-primary"
                        />
                        <div className="ml-3 flex items-center">
                          <CreditCard className="w-5 h-5 mr-2" />
                          <span className="font-medium">Thẻ tín dụng / Thẻ ghi nợ</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'bankTransfer' ? 'border-primary bg-primary/5' : 'border-base-300'}`}
                      onClick={() => handlePaymentMethodChange('bankTransfer')}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'bankTransfer'}
                          onChange={() => handlePaymentMethodChange('bankTransfer')}
                          className="radio radio-primary"
                        />
                        <div className="ml-3">
                          <span className="font-medium">Chuyển khoản ngân hàng</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'cashOnDelivery' ? 'border-primary bg-primary/5' : 'border-base-300'}`}
                      onClick={() => handlePaymentMethodChange('cashOnDelivery')}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'cashOnDelivery'}
                          onChange={() => handlePaymentMethodChange('cashOnDelivery')}
                          className="radio radio-primary"
                        />
                        <div className="ml-3">
                          <span className="font-medium">Thanh toán khi nhận hàng (COD)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`p-4 border rounded-lg cursor-pointer transition-all ${paymentMethod === 'eWallet' ? 'border-primary bg-primary/5' : 'border-base-300'}`}
                      onClick={() => handlePaymentMethodChange('eWallet')}>
                      <div className="flex items-center">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'eWallet'}
                          onChange={() => handlePaymentMethodChange('eWallet')}
                          className="radio radio-primary"
                        />
                        <div className="ml-3">
                          <span className="font-medium">Ví điện tử (Momo, ZaloPay, VNPay)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {currentStep === 'confirmation' && (
              <motion.div
                key="confirmation"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="card bg-base-100 shadow-lg"
              >
                <div className="card-body">
                  <h2 className="card-title mb-4">Xác nhận đơn hàng</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-medium text-lg mb-2">Thông tin giao hàng</h3>
                      <div className="bg-base-200 p-4 rounded-lg">
                        <div className="flex flex-row justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{shippingAddress.fullName}</span>
                          </div>
                          <span className="text-sm">{shippingAddress.phoneNumber}</span>
                        </div>
                        <p className="text-sm">
                          {shippingAddress.address}, {shippingAddress.ward}, {shippingAddress.district}, {shippingAddress.city}
                        </p>
                        {shippingAddress.shippingNote && (
                          <div className="mt-2 text-sm italic">
                            <span className="font-medium">Ghi chú: </span>
                            {shippingAddress.shippingNote}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-lg mb-2">Phương thức thanh toán</h3>
                      <div className="bg-base-200 p-4 rounded-lg">
                        <p>{paymentMethod === 'creditCard' && 'Thẻ tín dụng / Thẻ ghi nợ'}
                          {paymentMethod === 'bankTransfer' && 'Chuyển khoản ngân hàng'}
                          {paymentMethod === 'cashOnDelivery' && 'Thanh toán khi nhận hàng (COD)'}
                          {paymentMethod === 'eWallet' && 'Ví điện tử'}
                        </p>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium text-lg mb-2">Chi tiết thanh toán</h3>
                      <div className="bg-base-200 p-4 rounded-lg">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Tạm tính:</span>
                            <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
                          </div>
                          
                          {discount > 0 && (
                            <div className="flex justify-between text-success">
                              <div className="flex items-center">
                                <span>Giảm giá:</span>
                                {appliedCoupon && (
                                  <span className="bg-success/10 text-success text-xs ml-2 px-2 py-1 rounded">
                                    {appliedCoupon.code}
                                  </span>
                                )}
                              </div>
                              <span>- {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discount)}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between">
                            <span>Phí vận chuyển:</span>
                            <span>Miễn phí</span>
                          </div>
                          
                          <div className="border-t border-base-300 my-2 pt-2"></div>
                          
                          <div className="flex justify-between font-bold">
                            <span>Tổng cộng:</span>
                            <span className="text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="alert alert-info">
                      <BadgeCheck className="h-5 w-5" />
                      <span>Vui lòng kiểm tra thông tin đơn hàng trước khi xác nhận.</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex justify-between mt-6">
            {currentStep !== 'shipping' ? (
              <button
                onClick={goToPreviousStep}
                className="btn btn-outline"
              >
                <ArrowLeft size={16} className="mr-2" />
                Quay lại
              </button>
            ) : (
              <Link href="/cart" className="btn btn-outline">
                <ArrowLeft size={16} className="mr-2" />
                Quay lại giỏ hàng
              </Link>
            )}
            
            {currentStep !== 'confirmation' ? (
              <button
                onClick={goToNextStep}
                className="btn btn-primary"
              >
                Tiếp tục
                <ArrowRight size={16} className="ml-2" />
              </button>
            ) : (
              <button
                onClick={submitOrder}
                disabled={processingOrder}
                className="btn btn-primary"
              >
                {processingOrder ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    Đặt hàng
                    <CheckCircle2 size={16} className="ml-2" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">Tóm tắt đơn hàng</h3>
              
              <div className="max-h-80 overflow-y-auto mb-4">
                {cartItems.map((item) => (
                  <div key={item.product.id} className="flex items-center py-2 border-b">
                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-base-200 flex-shrink-0">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-base-content/30">
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 flex-grow">
                      <p className="font-medium">{item.product.name}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-base-content/60">Số lượng: {item.quantity}</p>
                        <p className="font-medium">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.product.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between">
                  <span>Tạm tính</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</span>
                </div>
                
                {discount > 0 && (
                  <div className="flex justify-between text-success">
                    <div className="flex items-center">
                      <span>Giảm giá</span>
                      {appliedCoupon && (
                        <span className="bg-success/10 text-success text-xs ml-2 px-2 py-1 rounded">
                          {appliedCoupon.code}
                        </span>
                      )}
                    </div>
                    <span>- {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discount)}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Phí vận chuyển</span>
                  <span>Miễn phí</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Tổng cộng</span>
                  <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
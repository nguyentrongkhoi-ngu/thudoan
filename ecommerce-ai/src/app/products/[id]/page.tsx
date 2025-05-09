'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import React from 'react';
import useUserBehavior from '@/hooks/useUserBehavior';
import ProductRecommendations from '@/components/ProductRecommendations';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import ProductImageSlider from '@/components/ProductImageSlider';
import ProductReviews from '@/components/ProductReviews';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartProvider';

interface ProductImage {
  id: string;
  productId: string;
  imageUrl: string;
  order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  images: ProductImage[];
  category: {
    id: string;
    name: string;
  };
}

// Main product page component that extracts ID from the URL path
export default function ProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const { trackProductView } = useUserBehavior();
  const { addToCart } = useCart();
  
  // Get the product ID from the URL path instead of params
  const pathname = usePathname();
  const productId = pathname ? pathname.split('/').pop() || '' : '';
  
  // Prepare safe product ID (trim any whitespace)
  const safeProductId = productId && typeof productId === 'string' ? productId.trim() : '';

  // Lấy thông tin sản phẩm và theo dõi hành vi xem
  useEffect(() => {
    // Biến để theo dõi nếu component đã unmount
    let isMounted = true;
    
    // Kiểm tra ID hợp lệ trước khi gọi API
    if (!safeProductId) {
      setError('ID sản phẩm không hợp lệ');
      setLoading(false);
      return;
    }

    // Tách riêng hàm fetchProduct để xử lý lỗi độc lập
    const getProductDetails = async () => {
      try {
        console.log(`Đang gọi API lấy thông tin sản phẩm với ID: ${safeProductId}`);
        setLoading(true);

        // Tạo controller cho yêu cầu API
        const controller = new AbortController();
        
        // Đặt timeout nhưng lưu reference để có thể hủy sau này
        const timeoutId = setTimeout(() => {
          if (isMounted) {
            controller.abort('Request timeout');
          }
        }, 10000); // Tăng timeout lên 10s

        try {
          const response = await axios.get(`/api/products/${safeProductId}`, {
            signal: controller.signal
          });
          
          // Xóa timeout khi request thành công
          clearTimeout(timeoutId);
          
          // Chỉ cập nhật state nếu component vẫn được mount
          if (isMounted) {
            setProduct(response.data);
            setError(null);
          }
        } catch (axiosError: any) {
          // Xóa timeout để tránh cancel nhiều lần
          clearTimeout(timeoutId);
          
          // Bỏ qua lỗi nếu là do component unmount hoặc timeout
          if (!isMounted || axiosError.name === 'CanceledError' || axiosError.name === 'AbortError') {
            console.log('Request was canceled:', axiosError.message);
            return; // Không throw nếu đây là lỗi cancel và component đã unmount
          }
          
          throw axiosError; // Re-throw để xử lý ở catch bên ngoài
        }
      } catch (err: any) {
        console.error('Lỗi khi lấy thông tin sản phẩm:', err);
        
        // Chỉ cập nhật state nếu component vẫn được mount
        if (isMounted) {
          // Xử lý lỗi theo loại cụ thể
          if (err.name === 'CanceledError' || err.name === 'AbortError' || err.code === 'ECONNABORTED') {
            setError('Không thể kết nối tới máy chủ. Vui lòng thử lại sau.');
          } else if (err.response) {
            // Xử lý lỗi theo mã trạng thái
            switch (err.response.status) {
              case 404:
                setError('Không tìm thấy sản phẩm này. Có thể sản phẩm đã bị xóa hoặc không tồn tại.');
                break;
              case 400:
                setError('Yêu cầu không hợp lệ. ID sản phẩm không đúng định dạng.');
                break;
              case 500:
                setError('Lỗi máy chủ khi tải thông tin sản phẩm. Vui lòng thử lại sau.');
                break;
              default:
                setError(`Không thể tải thông tin sản phẩm (lỗi ${err.response.status}). Vui lòng thử lại sau.`);
            }
          } else {
            setError('Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.');
          }
        }
      } finally {
        // Chỉ cập nhật state nếu component vẫn được mount
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Gọi API lấy thông tin sản phẩm
    getProductDetails();

    // Theo dõi hành vi xem sản phẩm trong một luồng riêng biệt
    // để không ảnh hưởng đến việc hiển thị sản phẩm
    const trackBehaviorSafely = () => {
      // Sử dụng Promise.race để không chờ đợi quá lâu
      Promise.race([
        new Promise(resolve => {
          try {
            // Gọi trackProductView (không trả về Promise, không cần catch)
            trackProductView(safeProductId);
            resolve(true);
          } catch (err: unknown) {
            console.error('[SafeTracker] Lỗi khi theo dõi hành vi:', err);
            resolve(false);
          }
        }),
        // Timeout sau 200ms để không ảnh hưởng đến UX
        new Promise(resolve => setTimeout(() => {
          resolve(false);
        }, 200))
      ]).catch((err: unknown) => {
        // Bỏ qua mọi lỗi từ tracking
        console.log('[SafeTracker] Đã bỏ qua lỗi tracking:', err);
      });
    };

    // Trì hoãn việc theo dõi hành vi để ưu tiên hiển thị nội dung
    const trackingTimer = setTimeout(trackBehaviorSafely, 300);

    // Tạo một controller chung để hủy tất cả các yêu cầu khi unmount
    const abortController = new AbortController();

    // Cleanup function
    return () => {
      // Đánh dấu component đã unmount
      isMounted = false;
      
      // Hủy mọi yêu cầu API đang chờ
      abortController.abort('Component unmounted');
      
      // Xóa bỏ các timer
      clearTimeout(trackingTimer);
    };
  }, [safeProductId, trackProductView, router]);

  // Xử lý thêm vào giỏ hàng
  const handleAddToCart = async () => {
    if (!session) {
      // Lưu sản phẩm vào localStorage để sau khi đăng nhập có thể thêm lại
      if (product) {
        localStorage.setItem('pendingCartItem', JSON.stringify({
          productId: safeProductId,
          name: product.name,
          quantity: quantity
        }));
      }
      
      router.push('/login?redirectTo=' + encodeURIComponent(`/products/${safeProductId}`));
      return;
    }

    try {
      await addToCart(safeProductId, quantity);
      toast.success(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
    } catch (err: any) {
      console.error('Lỗi khi thêm vào giỏ hàng:', err);
      
      // Kiểm tra lỗi phiên đăng nhập
      if (err.message && (
          err.message.includes('đăng nhập') || 
          err.message.includes('phiên')
        )) {
        toast.error('Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
        
        // Lưu sản phẩm vào localStorage để sau khi đăng nhập có thể thêm lại
        if (product) {
          localStorage.setItem('pendingCartItem', JSON.stringify({
            productId: safeProductId,
            name: product.name,
            quantity: quantity
          }));
        }
        
        // Chuyển đến trang đăng nhập
        setTimeout(() => {
          router.push(`/login?redirectTo=${encodeURIComponent(`/products/${safeProductId}`)}`);
        }, 1500);
      } else {
        toast.error(err.message || 'Có lỗi xảy ra khi thêm vào giỏ hàng');
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <div className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error || 'Không tìm thấy sản phẩm'}</span>
        </div>
        
        <div className="flex gap-2 mt-4">
          <button onClick={() => router.back()} className="btn btn-outline">
            Quay lại
          </button>
          <button onClick={() => router.push('/products')} className="btn btn-primary">
            Xem tất cả sản phẩm
          </button>
        </div>
        
        <div className="mt-8 w-full">
          <h2 className="text-xl font-semibold mb-4">Có thể bạn quan tâm</h2>
          <ErrorBoundary fallback={<div className="alert alert-info">Không thể tải gợi ý sản phẩm.</div>}>
            <ProductRecommendations />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  // Prepare images for the slider
  const productImages = product.images && product.images.length > 0
    ? product.images.map(img => img.imageUrl)
    : product.imageUrl
      ? [product.imageUrl]
      : [];

  return (
    <div className="space-y-8">
      <nav className="text-sm breadcrumbs">
        <ul>
          <li><a href="/">Trang chủ</a></li>
          <li><a href="/products">Sản phẩm</a></li>
          <li><a href={`/categories/${product.category.id}`}>{product.category.name}</a></li>
          <li>{product.name}</li>
        </ul>
      </nav>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Hình ảnh sản phẩm - Đã thay thế bằng image slider */}
        <ProductImageSlider images={productImages} productName={product.name} />
        
        {/* Thông tin sản phẩm */}
        <div className="space-y-4">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          
          <div className="badge badge-secondary">{product.category.name}</div>
          
          <p className="text-2xl font-bold text-primary">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
          </p>
          
          <div className="divider"></div>
          
          <div className="prose">
            <p>{product.description || 'Không có mô tả cho sản phẩm này.'}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <span>Số lượng:</span>
            <div className="join">
              <button 
                className="btn join-item"
                onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              >-</button>
              <input 
                type="number" 
                className="join-item w-16 text-center" 
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                min="1"
                max={product.stock}
              />
              <button 
                className="btn join-item"
                onClick={() => setQuantity(prev => Math.min(product.stock, prev + 1))}
              >+</button>
            </div>
            <span className="text-sm">({product.stock} sản phẩm có sẵn)</span>
          </div>
          
          <button 
            className="btn btn-primary w-full"
            onClick={handleAddToCart}
            disabled={product.stock <= 0}
          >
            {product.stock > 0 ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </button>
        </div>
      </div>
      
      {/* Đánh giá sản phẩm */}
      <section className="mt-12 card bg-base-100 shadow-sm p-6">
        <ErrorBoundary fallback={<div className="alert alert-error">Không thể tải đánh giá sản phẩm. Vui lòng thử lại sau.</div>}>
          <ProductReviews productId={safeProductId} />
        </ErrorBoundary>
      </section>
      
      {/* Sản phẩm liên quan */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Có thể bạn cũng thích</h2>
        <ErrorBoundary fallback={<div className="alert alert-error">Không thể tải gợi ý sản phẩm. Vui lòng thử lại sau.</div>}>
          <ProductRecommendations />
        </ErrorBoundary>
      </section>
    </div>
  );
} 
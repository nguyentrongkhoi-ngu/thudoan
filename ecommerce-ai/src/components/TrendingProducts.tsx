'use client';

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Star, ShoppingCart, Heart, Eye, Zap, Clock, Check, ArrowUpDown, ArrowDown, ArrowUp } from 'lucide-react';
import axios from 'axios';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useCart } from '@/context/CartProvider';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  category: Category;
  createdAt: string;
  updatedAt: string;
  isNew?: boolean;
  isFavorite?: boolean;
  discount?: number;
}

type SortOption = 'default' | 'price_asc' | 'price_desc' | 'newest';

function TrendingProducts() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [showCart, setShowCart] = useState(false);
  const [cartMessage, setCartMessage] = useState('');
  
  // Refs for the card hover effect
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const { data: session, status } = useSession();
  const { addToCart } = useCart();
  
  useEffect(() => {
    setIsMounted(true);
    // Fetch products from API
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/products');
        
        // Debug logging to see the actual response structure
        console.log('API Response:', response.data);
        
        // Check if response.data is an array
        const productsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.products || []);
        
        // Log the extracted products data
        console.log('Processed products data:', productsData);
        
        if (productsData.length === 0) {
          console.warn('No products returned from API');
        }
        
        // Lấy 4 sản phẩm và đánh dấu các sản phẩm mới (tạo trong vòng 14 ngày)
        const productsWithLabels = productsData.slice(0, 4).map(product => {
          const createdDate = new Date(product.createdAt);
          const now = new Date();
          const daysDifference = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          
          // Tạo giá trị giảm giá ngẫu nhiên cho một số sản phẩm
          const hasDiscount = Math.random() > 0.5;
          const discount = hasDiscount ? Math.floor(Math.random() * 30) + 10 : 0;
          
          return {
            ...product,
            isNew: daysDifference <= 14,
            isFavorite: false,
            discount: discount
          };
        });
        
        setProducts(productsWithLabels);
        setDisplayedProducts(productsWithLabels);
        setError(null);
      } catch (err) {
        console.error('Lỗi khi lấy sản phẩm:', err);
        if (err instanceof Error) {
          console.error('Error details:', err.message);
        }
        setError('Không thể tải sản phẩm. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Sắp xếp sản phẩm dựa trên lựa chọn
  useEffect(() => {
    if (products.length === 0) return;
    
    let sortedProducts = [...products];
    
    switch (sortOption) {
      case 'price_asc':
        sortedProducts.sort((a, b) => {
          const aPrice = a.discount ? a.price * (1 - a.discount / 100) : a.price;
          const bPrice = b.discount ? b.price * (1 - b.discount / 100) : b.price;
          return aPrice - bPrice;
        });
        break;
      case 'price_desc':
        sortedProducts.sort((a, b) => {
          const aPrice = a.discount ? a.price * (1 - a.discount / 100) : a.price;
          const bPrice = b.discount ? b.price * (1 - b.discount / 100) : b.price;
          return bPrice - aPrice;
        });
        break;
      case 'newest':
        sortedProducts.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        break;
      default:
        // Giữ nguyên thứ tự
        break;
    }
    
    setDisplayedProducts(sortedProducts);
  }, [products, sortOption]);
  
  // Card 3D tilt effect
  useEffect(() => {
    if (!isMounted) return;
    
    const handleMouseMove = (e: MouseEvent, index: number) => {
      const card = cardRefs.current[index];
      if (!card) return;
      
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // vị trí chuột X
      const y = e.clientY - rect.top;  // vị trí chuột Y
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;  // Xoay theo trục X
      const rotateY = (centerX - x) / 20;  // Xoay theo trục Y
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
    };
    
    const handleMouseLeave = (index: number) => {
      const card = cardRefs.current[index];
      if (!card) return;
      
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    };
    
    // Add event listeners
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      
      card.addEventListener('mousemove', (e) => handleMouseMove(e, index));
      card.addEventListener('mouseleave', () => handleMouseLeave(index));
    });
    
    // Cleanup
    return () => {
      cardRefs.current.forEach((card, index) => {
        if (!card) return;
        
        card.removeEventListener('mousemove', (e) => handleMouseMove(e as MouseEvent, index));
        card.removeEventListener('mouseleave', () => handleMouseLeave(index));
      });
    };
  }, [isMounted, displayedProducts.length]);
  
  const handleFavoriteToggle = useCallback((productId: string) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, isFavorite: !product.isFavorite } 
          : product
      )
    );
  }, []);
  
  const handleViewProduct = useCallback((productId: string) => {
    router.push(`/products/${productId}`);
  }, [router]);
  
  const handleAddToCart = useCallback(async (product: Product) => {
    // Kiểm tra người dùng đã đăng nhập chưa
    if (status !== 'authenticated' || !session) {
      // Hiển thị thông báo và lưu sản phẩm vào localStorage để sau khi đăng nhập có thể thêm lại
      localStorage.setItem('pendingCartItem', JSON.stringify({
        productId: product.id,
        name: product.name,
        quantity: 1
      }));
      
      // Điều hướng đến trang đăng nhập với tham số redirect
      router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    
    // Hiển thị thông báo trước để UX tốt hơn
    setCartMessage(`Đang thêm "${product.name}" vào giỏ hàng...`);
    setShowCart(true);
    
    try {
      // Sử dụng hàm addToCart từ context
      await addToCart(product.id, 1);
      
      // Cập nhật thông báo sau khi thêm thành công
      setCartMessage(`Đã thêm "${product.name}" vào giỏ hàng`);
      
      setTimeout(() => {
        setShowCart(false);
      }, 3000);
    } catch (error) {
      console.error('Lỗi khi thêm vào giỏ hàng:', error);
      
      // Kiểm tra lỗi phiên đăng nhập
      if ((error as Error).message.includes('đăng nhập') || 
          (error as Error).message.includes('phiên')) {
        toast.error('Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
        
        // Lưu sản phẩm vào localStorage để sau khi đăng nhập có thể thêm lại
        localStorage.setItem('pendingCartItem', JSON.stringify({
          productId: product.id,
          name: product.name,
          quantity: 1
        }));
        
        // Chuyển đến trang đăng nhập
        setTimeout(() => {
          router.push(`/login?redirectTo=${encodeURIComponent(window.location.pathname)}`);
        }, 1500);
      } else {
        // Hiển thị lỗi khác
        setCartMessage(`Không thể thêm vào giỏ hàng: ${(error as Error).message}`);
        setTimeout(() => {
          setShowCart(false);
        }, 3000);
      }
    }
  }, [router, session, status, addToCart]);
  
  const formatPrice = useCallback((price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  }, []);
  
  const calculateDiscountedPrice = useCallback((price: number, discount: number = 0) => {
    if (!discount) return price;
    return price * (1 - discount / 100);
  }, []);
  
  const getSortIcon = (option: SortOption) => {
    if (sortOption !== option) return <ArrowUpDown size={14} />;
    
    switch (option) {
      case 'price_asc':
        return <ArrowUp size={14} />;
      case 'price_desc':
        return <ArrowDown size={14} />;
      default:
        return <ArrowUpDown size={14} />;
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-base-100 rounded-xl shadow-md p-4 animate-pulse h-[420px] relative overflow-hidden">
            {/* Skeleton UI giữ nguyên */}
            <div className="h-60 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded-lg mb-4"></div>
            <div className="h-3 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/4 mb-3"></div>
            <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-5 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-2/4 mb-4"></div>
            <div className="flex items-center gap-2 mb-4">
              <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-16"></div>
            </div>
            <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded w-1/3 mb-8"></div>
            <div className="h-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 rounded"></div>
            <div className="absolute -inset-x-full top-0 h-full opacity-50 animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent transform translate-x-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg rounded-lg p-4 flex items-center gap-3">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h3 className="font-bold">Không thể tải dữ liệu</h3>
          <p className="text-sm">{error}</p>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-sm btn-outline"
        >
          Thử lại
        </button>
      </div>
    );
  }
  
  return (
    <>
      {/* Sorting options */}
      <div className="flex flex-wrap items-center justify-between mb-6 bg-white/50 backdrop-blur-sm p-3 rounded-lg">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sắp xếp theo:</span>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => setSortOption('default')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs ${sortOption === 'default' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <span>Nổi bật</span>
            </button>
            <button 
              onClick={() => setSortOption(sortOption === 'price_asc' ? 'default' : 'price_asc')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs ${sortOption === 'price_asc' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <span>Giá thấp đến cao</span>
              {getSortIcon('price_asc')}
            </button>
            <button 
              onClick={() => setSortOption(sortOption === 'price_desc' ? 'default' : 'price_desc')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs ${sortOption === 'price_desc' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <span>Giá cao đến thấp</span>
              {getSortIcon('price_desc')}
            </button>
            <button 
              onClick={() => setSortOption(sortOption === 'newest' ? 'default' : 'newest')}
              className={`px-3 py-1 rounded-full flex items-center gap-1 text-xs ${sortOption === 'newest' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <span>Mới nhất</span>
              {getSortIcon('newest')}
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          <span>Hiển thị {displayedProducts.length} sản phẩm</span>
        </div>
      </div>
      
      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {displayedProducts.map((product, index) => (
          <div 
            key={product.id} 
            className="bg-base-100 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group overflow-hidden"
            ref={el => cardRefs.current[index] = el}
            style={{ transition: "transform 0.2s ease-out" }}
          >
            <div className="relative overflow-hidden">
              {/* New badge */}
              {isMounted && product.isNew && (
                <div className="absolute top-2 left-2 z-10 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-md uppercase shadow-lg animate-pulse">
                  <span className="flex items-center gap-1">
                    <Zap size={12} className="animate-bounce" />
                    Mới
                  </span>
                </div>
              )}
              
              {/* Low stock warning */}
              {isMounted && product.stock <= 10 && (
                <div className="absolute top-2 right-2 z-10 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Còn {product.stock}
                  </span>
                </div>
              )}
              
              {/* Discount badge */}
              {isMounted && product.discount && product.discount > 0 && (
                <div className="absolute top-14 left-0 z-10 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold px-4 py-1 rounded-r-full shadow-lg">
                  <span className="flex items-center">
                    -{product.discount}%
                  </span>
                </div>
              )}
              
              {/* Product image with link */}
              <Link href={`/products/${product.id}`} className="block relative">
                <div className="bg-gray-100 overflow-hidden h-60 w-full">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name}
                      className="w-full h-full object-cover transform transition-transform duration-500 group-hover:scale-110"
                      loading="lazy"
                      width={300}
                      height={240} 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                      <span className="text-sm">Không có ảnh</span>
                    </div>
                  )}
                </div>
              </Link>
              
              {/* Quick action overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
                <button 
                  onClick={() => handleViewProduct(product.id)}
                  className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-primary hover:text-white transition-colors transform hover:scale-110 shadow-lg"
                  aria-label="Xem chi tiết sản phẩm"
                >
                  <Eye size={18} />
                </button>
                <button 
                  className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-primary hover:text-white transition-colors transform hover:scale-110 shadow-lg"
                  aria-label="Thêm vào giỏ hàng"
                  onClick={() => handleAddToCart(product)}
                >
                  <ShoppingCart size={18} />
                </button>
                <button 
                  className={`w-10 h-10 rounded-full ${isMounted && product.isFavorite ? 'bg-red-500 text-white' : 'bg-white/90'} flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors transform hover:scale-110 shadow-lg`}
                  onClick={() => handleFavoriteToggle(product.id)}
                  aria-label="Thêm vào yêu thích"
                >
                  <Heart size={18} className={isMounted && product.isFavorite ? 'fill-white' : ''} />
                </button>
              </div>
            </div>
            
            <div className="p-4">
              {/* Category */}
              {product.category && (
                <div className="text-xs text-gray-500 mb-1 font-medium">{product.category.name}</div>
              )}
              
              {/* Product name */}
              <Link href={`/products/${product.id}`} className="block group">
                <h3 className="font-semibold text-lg mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name}
                </h3>
              </Link>
              
              {/* Rating */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                  <Star size={14} className="fill-yellow-500 text-yellow-500" />
                  <span className="text-xs font-semibold">4.5</span>
                </div>
                <span className="text-xs text-gray-500">(12 đánh giá)</span>
              </div>
              
              {/* Price */}
              <div className="flex items-center gap-2 mb-1">
                {isMounted && product.discount && product.discount > 0 ? (
                  <>
                    <span className="font-bold text-lg text-primary">
                      {formatPrice(calculateDiscountedPrice(product.price, product.discount))}
                    </span>
                    <span className="text-sm line-through text-gray-400">
                      {formatPrice(product.price)}
                    </span>
                  </>
                ) : (
                  <span className="font-bold text-lg">{formatPrice(product.price)}</span>
                )}
              </div>
              
              {/* Add to cart button */}
              <div className="mt-4">
                <button 
                  className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:translate-y-px"
                  aria-label="Thêm vào giỏ hàng"
                  onClick={() => handleAddToCart(product)}
                >
                  <ShoppingCart size={18} className={showCart ? "animate-bounce" : ""} />
                  <span>Thêm vào giỏ</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Notification toast when adding to cart */}
      {showCart && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg max-w-md animate-fade-in-up z-50 flex items-center gap-3">
          <Check size={20} className="text-white" />
          <span>{cartMessage}</span>
          <button 
            onClick={() => setShowCart(false)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Đóng thông báo"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* Thêm một subtle loader khi người dùng đang cuộn */}
      <div className="mt-8 text-center">
        <button className="px-6 py-2 bg-white border border-gray-300 rounded-full text-gray-600 shadow-sm hover:bg-gray-50">
          Xem thêm sản phẩm
        </button>
      </div>
    </>
  );
}

export default memo(TrendingProducts); 
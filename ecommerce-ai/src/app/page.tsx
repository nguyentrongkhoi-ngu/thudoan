'use client';

import Link from 'next/link';
import { Suspense, useState, useEffect } from 'react';
import ProductRecommendations from '@/components/ProductRecommendations';
import FeaturedCategories from '@/components/FeaturedCategories';
import HeroSection from '@/components/HeroSection';
import CountdownTimer from '@/components/CountdownTimer';
import TrendingProducts from '@/components/TrendingProducts';
import Testimonials from '@/components/Testimonials';
import Image from 'next/image';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Skeleton components
function ProductSkeleton() {
  return (
    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl">
      <div className="relative mb-3">
        <div className="h-48 rounded-lg bg-white/20 animate-pulse"></div>
      </div>
      <div className="h-5 bg-white/20 rounded w-3/4 mb-2 animate-pulse"></div>
      <div className="h-6 bg-white/20 rounded w-1/2 mb-2 animate-pulse"></div>
      <div className="h-2 bg-white/10 rounded-full mt-2 animate-pulse"></div>
    </div>
  );
}

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  
  // Ngày kết thúc đợt Flash Sale (1 tuần từ thời điểm hiện tại)
  const flashSaleEndDate = new Date();
  flashSaleEndDate.setDate(flashSaleEndDate.getDate() + 7);
  
  // Pre-calculate discount percentages, prices and inventory counts to ensure consistency
  const discountPercentages = [25, 30, 40, 35]; // Fixed values instead of random
  const originalPrices = [1200000, 1500000, 1800000, 1350000]; // Fixed original prices
  const salePrices = [900000, 1050000, 1080000, 877500]; // Fixed sale prices (25%, 30%, 40%, 35% off)
  const soldCounts = [28, 42, 34, 19]; // Fixed sold counts
  const remainingCounts = [12, 8, 25, 16]; // Fixed remaining counts
  const progressWidths = ['75%', '60%', '85%', '45%']; // Fixed progress widths
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="space-y-16 animate-fade-in">
      {/* Hero Section với backdrop blur khi scroll */}
      <section className="mb-8">
        <div className="container mx-auto px-4">
          <HeroSection />
        </div>
      </section>
      
      {/* Flash Sale Section với hiệu ứng đếm ngược */}
      <section className="bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-xl rounded-xl transform hover:-translate-y-1 transition-all duration-300">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="animate-fade-in-up">
              <h2 className="text-3xl md:text-4xl font-extrabold mb-2 flex items-center">
                <span className="mr-2 animate-pulse">⚡</span> FLASH SALE
              </h2>
              <p className="text-white/80">Ưu đãi khủng - Thời gian có hạn</p>
            </div>
            <div className="mt-4 md:mt-0 animate-fade-in-up animation-delay-200">
              <CountdownTimer targetDate={flashSaleEndDate} />
            </div>
          </div>
          
          {/* Flash Sale Products với skeleton loading */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Suspense fallback={Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Link 
                  href={`/products/flash-sale-${index + 1}`} 
                  key={index}
                  className="bg-white/10 backdrop-blur-sm p-4 rounded-xl hover:bg-white/20 transition-all group overflow-hidden shadow-lg hover:shadow-xl"
                >
                  <div className="relative mb-3">
                    {isMounted && (
                      <div className="absolute top-0 right-0 bg-yellow-500 text-black font-bold px-2 py-1 rounded-bl-lg text-xs z-10">
                        -{discountPercentages[index]}%
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-lg text-xs uppercase font-bold animate-pulse">
                      Hot
                    </div>
                    <div className="overflow-hidden rounded-lg">
                      <img 
                        src={`https://placehold.co/300x300?text=Sale+Item+${index + 1}`} 
                        alt={`Flash Sale Item ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg transition-transform duration-500 group-hover:scale-110"
                        loading="lazy"
                      />
                    </div>
                  </div>
                  <h3 className="font-bold text-md mb-1 line-clamp-1">Sản phẩm Flash Sale #{index + 1}</h3>
                  {isMounted && (
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(salePrices[index])}</span>
                      <span className="text-sm line-through text-white/60">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(originalPrices[index])}</span>
                    </div>
                  )}
                  <div className="mt-2 h-2 bg-white/30 rounded-full overflow-hidden">
                    {isMounted && (
                      <div 
                        className="h-full bg-yellow-500 rounded-full" 
                        style={{ width: progressWidths[index] }}
                      ></div>
                    )}
                  </div>
                  {isMounted && (
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs">Đã bán: {soldCounts[index]}</div>
                      <div className="text-xs bg-white/20 px-2 py-1 rounded-full">Còn lại: {remainingCounts[index]}</div>
                    </div>
                  )}
                </Link>
              ))}
            </Suspense>
          </div>
          
          <div className="text-center mt-8">
            <Link 
              href="/flash-sale" 
              className="inline-block px-8 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Xem tất cả sản phẩm giảm giá
            </Link>
          </div>
        </div>
      </section>
      
      {/* Banner quảng cáo xu hướng */}
      <section className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/products/trending" className="relative h-80 rounded-2xl overflow-hidden group shadow-lg">
            <img 
              src="https://images.unsplash.com/photo-1555421689-491a97ff2040?q=80&w=2070&auto=format&fit=crop" 
              alt="Xu hướng công nghệ mới"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
              <span className="bg-indigo-600 text-white text-xs uppercase font-bold px-2 py-1 rounded-md mb-2 w-fit">Xu hướng</span>
              <h3 className="text-white text-2xl font-bold mb-2">Công Nghệ Mới Nhất</h3>
              <p className="text-white/80 mb-4">Khám phá những sản phẩm công nghệ đang làm mưa làm gió trên thị trường</p>
              <span className="text-white underline text-sm group-hover:text-indigo-300 transition-colors">Khám phá ngay</span>
            </div>
          </Link>
          
          <Link href="/products/bestseller" className="relative h-80 rounded-2xl overflow-hidden group shadow-lg">
            <img 
              src="https://images.unsplash.com/photo-1583394838336-acd977736f90?q=80&w=2071&auto=format&fit=crop" 
              alt="Sản phẩm bán chạy"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
              <span className="bg-rose-600 text-white text-xs uppercase font-bold px-2 py-1 rounded-md mb-2 w-fit">Bán chạy</span>
              <h3 className="text-white text-2xl font-bold mb-2">Top Sản Phẩm Bán Chạy</h3>
              <p className="text-white/80 mb-4">Những sản phẩm được yêu thích và lựa chọn nhiều nhất</p>
              <span className="text-white underline text-sm group-hover:text-rose-300 transition-colors">Xem ngay</span>
            </div>
          </Link>
        </div>
      </section>
      
      {/* Sản phẩm trending mới */}
      <section className="bg-base-100 shadow-xl rounded-xl">
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-between items-center mb-8">
            <div className="animate-fade-in-up">
              <h2 className="text-3xl font-bold">Sản phẩm nổi bật</h2>
              <p className="text-base-content/70 mt-1">Những sản phẩm đang được săn đón nhiều nhất</p>
            </div>
            <Link href="/products/trending" className="btn btn-primary">
              Xem tất cả
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}</div>}>
            <ErrorBoundary fallback={<div className="alert alert-error">Không thể tải sản phẩm nổi bật. Vui lòng thử lại sau.</div>}>
              <TrendingProducts />
            </ErrorBoundary>
          </Suspense>
        </div>
      </section>
      
      {/* Sản phẩm gợi ý dựa trên AI */}
      <section className="bg-base-100 shadow-xl rounded-xl">
        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-between items-center mb-8">
            <div className="animate-fade-in-up">
              <h2 className="text-3xl font-bold">Gợi ý cho bạn</h2>
              <div className="flex items-center mt-1">
                <span className="text-base-content/70">Dựa trên công nghệ AI phân tích hành vi người dùng</span>
                <div className="ml-2 tooltip" data-tip="Chúng tôi sử dụng công nghệ AI để phân tích hành vi duyệt web và lịch sử mua hàng để đề xuất sản phẩm phù hợp nhất với bạn">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <Link href="/products" className="btn btn-primary">
              Xem tất cả
            </Link>
          </div>
          <Suspense fallback={<div className="grid grid-cols-2 md:grid-cols-4 gap-6">{Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)}</div>}>
            <ErrorBoundary fallback={<div className="alert alert-error">Không thể tải gợi ý sản phẩm. Vui lòng thử lại sau.</div>}>
              <ProductRecommendations />
            </ErrorBoundary>
          </Suspense>
        </div>
      </section>
      
      {/* Danh mục nổi bật */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center">
            <span className="mr-2">🔍</span>
            Danh mục nổi bật
          </h2>
          <ErrorBoundary fallback={<div className="alert alert-error">Không thể tải danh mục sản phẩm</div>}>
            <FeaturedCategories />
          </ErrorBoundary>
        </div>
      </section>
      
      {/* Testimonials - Đánh giá khách hàng */}
      <section className="bg-base-100 shadow-xl rounded-xl">
        <div className="container mx-auto px-4 py-10">
          <div className="text-center mb-10 animate-fade-in-up">
            <h2 className="text-3xl font-bold mb-2">Khách hàng nói gì về chúng tôi</h2>
            <p className="text-base-content/70 max-w-2xl mx-auto">Niềm tin của khách hàng là động lực để chúng tôi không ngừng nâng cao chất lượng dịch vụ</p>
          </div>
          <Suspense fallback={<div className="flex gap-6 overflow-x-auto pb-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-w-[300px] h-64 rounded-xl bg-base-200 animate-pulse"></div>
            ))}
          </div>}>
            <Testimonials />
          </Suspense>
        </div>
      </section>
      
      {/* Banner quảng cáo ở giữa */}
      <section className="relative h-80 overflow-hidden rounded-2xl shadow-2xl group">
        <img 
          src="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=80&w=2070&auto=format&fit=crop" 
          alt="Khuyến mãi đặc biệt"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-transparent flex items-center">
          <div className="container mx-auto px-4">
            <div className="text-white p-8 md:p-16 max-w-xl animate-fade-in-up">
              <span className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold mb-4 animate-pulse">
                Chỉ dành cho thành viên
              </span>
              <h2 className="text-4xl font-bold mb-4">Ưu đãi đặc quyền</h2>
              <p className="text-lg mb-6">Đăng ký thành viên ngay hôm nay để nhận ưu đãi lên đến 25% cho đơn hàng đầu tiên!</p>
              <Link 
                href="/register" 
                className="px-8 py-3 bg-white text-blue-900 font-bold rounded-full hover:bg-blue-100 transition-colors inline-block shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Đăng ký ngay
              </Link>
            </div>
          </div>
        </div>
      </section>
      
      {/* Các thương hiệu đối tác với hiệu ứng carousel */}
      <section className="bg-base-100 shadow-lg rounded-xl">
        <div className="container mx-auto px-4 py-10">
          <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in-up">Thương hiệu nổi bật</h2>
          <div className="flex gap-8 justify-between items-center overflow-hidden">
            <div className="flex gap-8 animate-marquee">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="flex items-center justify-center p-4 grayscale hover:grayscale-0 transition-all duration-300 min-w-[120px]">
                  <img 
                    src={`https://placehold.co/200x80?text=Brand+${index + 1}`}
                    alt={`Brand ${index + 1}`}
                    className="max-h-12 object-contain"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Thông tin bổ sung */}
      <section>
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
              <div className="card-body flex flex-row items-center">
                <div className="rounded-full bg-indigo-100 p-4 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="card-title text-lg">Giao hàng nhanh chóng</h3>
                  <p className="text-sm text-base-content/70">Giao hàng toàn quốc trong vòng 2-3 ngày làm việc.</p>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
              <div className="card-body flex flex-row items-center">
                <div className="rounded-full bg-green-100 p-4 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="card-title text-lg">Thanh toán an toàn</h3>
                  <p className="text-sm text-base-content/70">Hỗ trợ nhiều phương thức thanh toán an toàn.</p>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
              <div className="card-body flex flex-row items-center">
                <div className="rounded-full bg-yellow-100 p-4 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h3 className="card-title text-lg">Đổi trả dễ dàng</h3>
                  <p className="text-sm text-base-content/70">Chính sách đổi trả trong vòng 30 ngày.</p>
                </div>
              </div>
            </div>
            
            <div className="card bg-base-100 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 duration-300">
              <div className="card-body flex flex-row items-center">
                <div className="rounded-full bg-rose-100 p-4 mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="card-title text-lg">Hỗ trợ 24/7</h3>
                  <p className="text-sm text-base-content/70">Đội ngũ hỗ trợ khách hàng luôn sẵn sàng giúp đỡ bạn.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Đăng ký nhận thông báo */}
      <section className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 -mt-10 -mr-10">
          <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" opacity="0.3">
            <circle cx="100" cy="100" r="100" fill="white"/>
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10">
          <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" opacity="0.2">
            <circle cx="100" cy="100" r="100" fill="white"/>
          </svg>
        </div>
        <div className="container mx-auto px-4 py-12 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4 animate-fade-in-up">Đăng ký nhận thông báo</h2>
            <p className="mb-6 animate-fade-in-up animation-delay-200">Nhận thông báo về khuyến mãi và sản phẩm mới nhất từ chúng tôi.</p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto animate-fade-in-up animation-delay-300">
              <input
                type="email"
                placeholder="Địa chỉ email của bạn"
                className="px-4 py-3 rounded-full flex-grow text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-300 shadow-xl"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-bold rounded-full hover:from-amber-500 hover:to-yellow-600 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 whitespace-nowrap"
              >
                Đăng ký
              </button>
            </form>
            <p className="text-xs mt-4 text-white/80 animate-fade-in-up animation-delay-400">Bằng cách đăng ký, bạn đồng ý với <Link href="/privacy" className="underline hover:text-white">Chính sách bảo mật</Link> của chúng tôi</p>
          </div>
        </div>
      </section>
      
      {/* Thêm CSS cho animation */}
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          min-width: 200%;
        }
      `}</style>
    </div>
  );
}

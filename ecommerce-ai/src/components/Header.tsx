'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import AvatarPlaceholder from './AvatarPlaceholder';
import { isValidURL, customImageLoader } from '@/lib/imageLoader';
import SearchField from './SearchField';
import { ShoppingBag } from 'lucide-react';
import MiniCart from './MiniCart';
import { useCart } from '@/context/CartProvider';

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount } = useCart();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMiniCartOpen, setIsMiniCartOpen] = useState(false);
  const miniCartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Thêm hiệu ứng thay đổi header khi cuộn
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Xử lý hiển thị mini cart với delay để tránh đóng ngay khi di chuyển chuột
  const handleCartMouseEnter = () => {
    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
      miniCartTimeoutRef.current = null;
    }
    setIsMiniCartOpen(true);
  };

  const handleCartMouseLeave = () => {
    miniCartTimeoutRef.current = setTimeout(() => {
      setIsMiniCartOpen(false);
    }, 300);
  };

  const handleMiniCartMouseEnter = () => {
    if (miniCartTimeoutRef.current) {
      clearTimeout(miniCartTimeoutRef.current);
      miniCartTimeoutRef.current = null;
    }
  };

  const handleMiniCartMouseLeave = () => {
    miniCartTimeoutRef.current = setTimeout(() => {
      setIsMiniCartOpen(false);
    }, 300);
  };

  // Kiểm tra xem một đường dẫn có đang được active không
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-base-100/95 backdrop-blur-md shadow-md py-2' : 'bg-base-100 py-4'}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          {/* Logo và Menu Mobile */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent hover:scale-105 transition-transform">
                E-Shop AI
              </span>
            </Link>

            {/* Menu Desktop */}
            <nav className="hidden md:flex ml-10 space-x-1">
              {['products', 'categories', 'about'].map((item) => (
                <Link 
                  key={item} 
                  href={`/${item}`}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    isActive(`/${item}`) 
                      ? 'bg-primary/10 text-primary' 
                      : 'hover:bg-base-200'
                  }`}
                >
                  {item === 'products' ? 'Sản phẩm' : 
                   item === 'categories' ? 'Danh mục' : 
                   item === 'about' ? 'Giới thiệu' : item}
                </Link>
              ))}
            </nav>
          </div>

          {/* Tìm kiếm và Actions */}
          <div className="flex items-center gap-2">
            {/* Tìm kiếm Desktop */}
            <div className="hidden md:block max-w-md mx-4">
              <SearchField 
                size="sm"
                className="w-full"
                placeholder="Tìm kiếm sản phẩm..."
              />
            </div>

            {/* Giỏ hàng */}
            <div 
              className="relative" 
              onMouseEnter={handleCartMouseEnter}
              onMouseLeave={handleCartMouseLeave}
            >
              <Link 
                href="/cart" 
                className="relative block p-2 rounded-full hover:bg-base-200 transition-colors"
                aria-label="Giỏ hàng"
              >
                <ShoppingBag className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-content text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              
              {status === 'authenticated' && (
                <div 
                  className="relative"
                  onMouseEnter={handleMiniCartMouseEnter}
                  onMouseLeave={handleMiniCartMouseLeave}
                >
                  <MiniCart 
                    isOpen={isMiniCartOpen && cartCount > 0} 
                    onClose={() => setIsMiniCartOpen(false)} 
                  />
                </div>
              )}
            </div>

            {/* Đăng nhập/Tài khoản */}
            {session ? (
              <div className="relative group">
                <button 
                  className="flex items-center space-x-1 p-2 rounded-full hover:bg-base-200 transition-colors"
                  aria-label="Tài khoản"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 group-hover:border-primary transition-colors">
                    {session.user?.image && isValidURL(session.user.image) ? (
                      <Image 
                        loader={customImageLoader}
                        src={session.user.image} 
                        alt={session.user?.name || 'User'} 
                        width={32}
                        height={32}
                        className="w-full h-full object-cover"
                        priority
                        unoptimized
                      />
                    ) : (
                      <AvatarPlaceholder />
                    )}
                  </div>
                  <span className="hidden md:inline text-sm font-medium max-w-[100px] truncate">
                    {session.user?.name || session.user?.email}
                  </span>
                </button>

                {/* Dropdown menu với hiệu ứng */}
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-base-100 shadow-lg ring-1 ring-black/5 transition-all origin-top-right opacity-0 scale-95 invisible group-hover:opacity-100 group-hover:scale-100 group-hover:visible duration-200">
                  <div className="p-2">
                    <div className="px-4 py-2">
                      <p className="text-sm font-medium">{session.user?.name || 'Người dùng'}</p>
                      <p className="text-xs text-base-content/70 truncate">{session.user?.email}</p>
                    </div>
                    <div className="h-px bg-base-content/10 my-1"></div>
                    <Link 
                      href="/profile" 
                      className="flex items-center px-4 py-2 text-sm hover:bg-base-200 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Hồ sơ
                    </Link>
                    <Link 
                      href="/profile/orders" 
                      className="flex items-center px-4 py-2 text-sm hover:bg-base-200 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      Đơn hàng
                    </Link>
                    {session.user?.role === 'ADMIN' && (
                      <Link 
                        href="/admin" 
                        className="flex items-center px-4 py-2 text-sm hover:bg-base-200 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Quản trị
                      </Link>
                    )}
                    <div className="h-px bg-base-content/10 my-1"></div>
                    <button 
                      onClick={() => signOut()} 
                      className="flex w-full items-center px-4 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link 
                  href="/login" 
                  className="hidden md:inline-flex items-center px-4 py-2 border border-primary/20 hover:border-primary rounded-full text-sm font-medium transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link 
                  href="/register" 
                  className="inline-flex items-center px-4 py-2 bg-primary hover:bg-primary-focus text-primary-content rounded-full text-sm font-medium transition-colors"
                >
                  <span className="hidden md:inline">Đăng ký</span>
                  <span className="md:hidden">Đăng nhập</span>
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-full hover:bg-base-200 transition-colors ml-1"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMobileMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <div className="py-2 space-y-1 border-t border-base-content/10">
            <div className="pb-2">
              <SearchField 
                size="sm"
                className="w-full"
                placeholder="Tìm kiếm sản phẩm..."
              />
            </div>

            {['products', 'categories', 'about'].map((item) => (
              <Link 
                key={item} 
                href={`/${item}`}
                className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive(`/${item}`) 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-base-200'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {item === 'products' ? 'Sản phẩm' : 
                 item === 'categories' ? 'Danh mục' : 
                 item === 'about' ? 'Giới thiệu' : item}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
} 
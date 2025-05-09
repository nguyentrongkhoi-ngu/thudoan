'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      // Giả lập API call
      setSubscribeStatus('success');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
      setEmail('');
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-neutral text-neutral-content relative">
      {/* Wave design at top of footer */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none transform translate-y-[-100%]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none" className="h-[60px] w-full bg-transparent fill-neutral">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V0C0,0,47.31,19.48,321.39,56.44z"></path>
        </svg>
      </div>

      {/* Newsletter Subscription */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-500 text-white p-8 lg:p-12 text-center">
        <div className="container mx-auto max-w-3xl">
          <h3 className="text-2xl md:text-3xl font-bold mb-2">Đăng ký nhận thông tin ưu đãi</h3>
          <p className="mb-6 opacity-90">Nhận thông báo về khuyến mãi và sản phẩm mới nhất ngay trong hộp thư của bạn.</p>
          
          <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row max-w-md mx-auto gap-2">
            <div className="relative flex-grow">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Địa chỉ email của bạn" 
                className="w-full px-4 py-3 rounded-full text-neutral focus:outline-none focus:ring-2 focus:ring-base-content/20"
                required
              />
              {subscribeStatus === 'success' && (
                <div className="absolute top-full left-0 mt-1 text-xs font-medium text-success bg-success/10 px-3 py-1 rounded-full">
                  Đăng ký thành công!
                </div>
              )}
              {subscribeStatus === 'error' && (
                <div className="absolute top-full left-0 mt-1 text-xs font-medium text-error bg-error/10 px-3 py-1 rounded-full">
                  Có lỗi xảy ra. Vui lòng thử lại.
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="px-6 py-3 bg-base-100 hover:bg-base-200 text-base-content rounded-full font-medium transition-colors"
            >
              Đăng ký
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container mx-auto py-12 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand and About */}
          <div className="lg:col-span-2">
            <Link href="/" className="text-2xl font-bold flex items-center mb-4">
              <span className="bg-gradient-to-r from-indigo-600 to-violet-500 bg-clip-text text-transparent">
                E-Shop AI
              </span>
            </Link>
            <p className="mb-4 text-neutral-content/70 max-w-md">
              Nền tảng mua sắm thông minh với công nghệ AI gợi ý sản phẩm. Chúng tôi phân tích hành vi người dùng để đề xuất những sản phẩm phù hợp nhất với nhu cầu của bạn.
            </p>
            <div className="flex space-x-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center transition-colors" aria-label="Facebook">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-facebook" viewBox="0 0 16 16">
                  <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center transition-colors" aria-label="Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-twitter-x" viewBox="0 0 16 16">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center transition-colors" aria-label="Instagram">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-instagram" viewBox="0 0 16 16">
                  <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                </svg>
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-content/10 hover:bg-neutral-content/20 flex items-center justify-center transition-colors" aria-label="Youtube">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-youtube" viewBox="0 0 16 16">
                  <path d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.007 2.007 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.007 2.007 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31.4 31.4 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.007 2.007 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A99.788 99.788 0 0 1 7.858 2h.193zM6.4 5.209v4.818l4.157-2.408L6.4 5.209z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-wider mb-4">Mua sắm</h3>
            <ul className="space-y-2">
              <li><Link href="/products" className="text-neutral-content/70 hover:text-primary transition-colors">Sản phẩm</Link></li>
              <li><Link href="/categories" className="text-neutral-content/70 hover:text-primary transition-colors">Danh mục</Link></li>
              <li><Link href="/flash-sale" className="text-neutral-content/70 hover:text-primary transition-colors">Flash Sale</Link></li>
              <li><Link href="/new-arrivals" className="text-neutral-content/70 hover:text-primary transition-colors">Hàng mới về</Link></li>
              <li><Link href="/best-sellers" className="text-neutral-content/70 hover:text-primary transition-colors">Bán chạy nhất</Link></li>
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-wider mb-4">Thông tin</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-neutral-content/70 hover:text-primary transition-colors">Giới thiệu</Link></li>
              <li><Link href="/contact" className="text-neutral-content/70 hover:text-primary transition-colors">Liên hệ</Link></li>
              <li><Link href="/privacy" className="text-neutral-content/70 hover:text-primary transition-colors">Chính sách bảo mật</Link></li>
              <li><Link href="/terms" className="text-neutral-content/70 hover:text-primary transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link href="/faq" className="text-neutral-content/70 hover:text-primary transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-base font-semibold uppercase tracking-wider mb-4">Liên hệ</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-neutral-content/70">123 Đường ABC, Quận XYZ, TP. HCM</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span className="text-neutral-content/70">(84) 123 456 789</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-neutral-content/70">info@eshopai.com</span>
              </li>
              <li className="flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-primary mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-neutral-content/70">Thứ Hai - Thứ Bảy: 9:00 - 21:00</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-base-content/10">
        <div className="container mx-auto py-6 px-4 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-neutral-content/70">
            © {currentYear} E-Shop AI. Tất cả quyền được bảo lưu.
          </p>
          <div className="flex items-center mt-4 md:mt-0">
            <div className="flex space-x-3">
              <img src="https://placehold.co/40x24?text=VISA" alt="Visa" className="h-6 rounded" />
              <img src="https://placehold.co/40x24?text=MC" alt="Mastercard" className="h-6 rounded" />
              <img src="https://placehold.co/40x24?text=PAYPAL" alt="PayPal" className="h-6 rounded" />
              <img src="https://placehold.co/40x24?text=MOMO" alt="MoMo" className="h-6 rounded" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
} 
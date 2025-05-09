'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useCart } from '@/context/CartProvider';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('redirectTo') || '/';
  const { status, data: session } = useSession();
  const { addToCart } = useCart();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Chuyển hướng nếu đã đăng nhập
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push(callbackUrl);
    }
  }, [status, session, router, callbackUrl]);

  // Kiểm tra và phục hồi giỏ hàng khi đăng nhập thành công
  useEffect(() => {
    const recoverCart = async () => {
      if (status === 'authenticated' && localStorage.getItem('pendingCartItem')) {
        try {
          const pendingItem = JSON.parse(localStorage.getItem('pendingCartItem') || '{}');
          
          if (pendingItem.productId) {
            // Thêm sản phẩm vào giỏ hàng
            await addToCart(pendingItem.productId, pendingItem.quantity || 1);
            toast.success(`Đã thêm "${pendingItem.name}" vào giỏ hàng`);
            
            // Xóa khỏi localStorage để không thêm lại
            localStorage.removeItem('pendingCartItem');
          }
        } catch (error) {
          console.error('Lỗi khi khôi phục giỏ hàng:', error);
        }
      }
    };
    
    recoverCart();
  }, [status, addToCart]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Vui lòng nhập email và mật khẩu');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      
      if (result?.error) {
        setError('Email hoặc mật khẩu không đúng');
        return;
      }
      
      // Đăng nhập thành công, thông báo cho người dùng
      toast.success('Đăng nhập thành công');
      
      // Chuyển hướng (useEffect sẽ xử lý phần phục hồi giỏ hàng)
      router.push(callbackUrl);
    } catch (error) {
      console.error('Lỗi đăng nhập:', error);
      setError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10">
      <div className="bg-white shadow-md rounded-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Đăng nhập</h1>
        
        {error && (
          <div className="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              placeholder="your.email@example.com"
              className="input input-bordered w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Mật khẩu</span>
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label className="label">
              <Link href="/forgot-password" className="label-text-alt link link-hover">
                Quên mật khẩu?
              </Link>
            </label>
          </div>
          
          <div className="form-control mt-6">
            <button 
              type="submit" 
              className={`btn btn-primary w-full ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </div>
        </form>
        
        <div className="divider mt-6">Hoặc</div>
        
        <div className="text-center mt-4">
          <p>Chưa có tài khoản?</p>
          <Link href="/register" className="link link-primary">
            Đăng ký
          </Link>
        </div>

        <div className="mt-6 p-4 bg-base-200 rounded-lg">
          <h2 className="font-bold mb-2">Tài khoản mẫu:</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Admin:</strong> admin@example.com / admin123</p>
            <p><strong>Người dùng:</strong> user@example.com / user123</p>
          </div>
        </div>
      </div>
    </div>
  );
} 
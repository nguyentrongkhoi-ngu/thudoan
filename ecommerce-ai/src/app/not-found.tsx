'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function NotFound() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  // Tự động chuyển hướng sau 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-5">
      <div className="text-center max-w-md">
        <h1 className="text-9xl font-bold text-primary">404</h1>
        <div className="divider"></div>
        <h2 className="text-2xl font-semibold mb-4">Không tìm thấy trang</h2>
        <p className="mb-6 text-gray-600">
          Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-4">
            <button 
              onClick={() => router.back()} 
              className="btn btn-outline"
            >
              Quay lại
            </button>
            <button 
              onClick={() => router.push('/')} 
              className="btn btn-primary"
            >
              Về trang chủ
            </button>
          </div>
          
          <p className="text-sm text-gray-500 mt-2">
            Tự động chuyển hướng về trang chủ sau {countdown} giây...
          </p>
        </div>
        
        <div className="mt-8">
          <p className="text-sm text-gray-500">
            Bạn cũng có thể tìm kiếm sản phẩm hoặc xem danh mục sản phẩm:
          </p>
          <div className="flex gap-2 justify-center mt-2">
            <button 
              onClick={() => router.push('/products')} 
              className="btn btn-sm"
            >
              Xem sản phẩm
            </button>
            <button 
              onClick={() => router.push('/categories')} 
              className="btn btn-sm"
            >
              Xem danh mục
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
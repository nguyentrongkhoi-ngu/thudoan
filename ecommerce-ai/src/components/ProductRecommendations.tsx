'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import useRecommendations from '@/hooks/useRecommendations';

// Số lượng sản phẩm hiển thị ban đầu
const INITIAL_LIMIT = 4;
// Số lượng sản phẩm tải từ API
const API_LIMIT = 8;

export default function ProductRecommendations() {
  // Truyền limit vào hook để tải ít sản phẩm hơn ban đầu
  const { recommendations, recommendationType, loading, error, refreshRecommendations } = useRecommendations(API_LIMIT);
  const [isMounted, setIsMounted] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);

  useEffect(() => {
    setIsMounted(true);
    // Gọi refreshRecommendations khi component được mount
    refreshRecommendations();
  }, [refreshRecommendations]);
  
  // Debug log for recommendations
  useEffect(() => {
    if (recommendations.length === 0 && !loading && !error) {
      console.log('No recommendations available');
    } else if (recommendations.length > 0) {
      console.log(`Loaded ${recommendations.length} recommendations of type: ${recommendationType}`);
    }
  }, [recommendations, loading, error, recommendationType]);

  // Chỉ hiển thị số lượng sản phẩm được giới hạn
  const visibleRecommendations = recommendations.slice(0, visibleCount);
  
  // Hàm để hiển thị thêm sản phẩm
  const showMore = () => {
    setVisibleCount(prevCount => Math.min(prevCount + INITIAL_LIMIT, recommendations.length));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: INITIAL_LIMIT }).map((_, index) => (
          <div key={index} className="card bg-base-100 shadow-md animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <div className="card-body">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 rounded mt-4"></div>
            </div>
          </div>
        ))}
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
        <button onClick={refreshRecommendations} className="btn btn-sm">Thử lại</button>
      </div>
    );
  }

  const formatCurrency = (price: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
  };

  // Check if recommendations exist and are in the right format
  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    return (
      <div className="alert">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-info shrink-0 w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Chưa có sản phẩm gợi ý. Hãy duyệt nhiều sản phẩm để nhận gợi ý phù hợp hơn.</span>
      </div>
    );
  }

  return (
    <>
      {isMounted && (
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            {recommendationType === 'personalized' 
              ? 'Các sản phẩm dựa trên hành vi duyệt web của bạn' 
              : 'Các sản phẩm phổ biến trên cửa hàng'}
          </p>
          <span className="text-sm text-gray-500">
            Hiển thị {visibleRecommendations.length} / {recommendations.length} sản phẩm
          </span>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visibleRecommendations.map((product) => (
          <Link href={`/products/${product.id}`} key={product.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
            <figure>
              <img
                src={product.imageUrl || 'https://placehold.co/300x200?text=Product+Image'}
                alt={product.name}
                className="h-48 w-full object-cover"
                loading="lazy"
              />
            </figure>
            <div className="card-body">
              <h3 className="card-title text-lg">{product.name}</h3>
              {isMounted && product.category && (
                <div className="badge badge-secondary">{product.category.name}</div>
              )}
              <p className="text-lg font-bold mt-2">{formatCurrency(product.price)}</p>
              <div className="card-actions justify-end mt-2">
                <button className="btn btn-primary btn-sm">Xem chi tiết</button>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      {/* Nút "Xem thêm" khi còn sản phẩm chưa hiển thị */}
      {visibleCount < recommendations.length && (
        <div className="flex justify-center mt-6">
          <button 
            onClick={showMore} 
            className="btn btn-outline"
          >
            Xem thêm ({recommendations.length - visibleCount} sản phẩm)
          </button>
        </div>
      )}
    </>
  );
} 
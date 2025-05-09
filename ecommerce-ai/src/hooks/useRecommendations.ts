import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Số lượng mặc định được tải từ API
const DEFAULT_LIMIT = 8;

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
}

interface RecommendationsResponse {
  products: Product[];
  type: 'personalized' | 'popular' | 'error';
}

export default function useRecommendations(limit = DEFAULT_LIMIT) {
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [recommendationType, setRecommendationType] = useState<'personalized' | 'popular'>('popular');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sử dụng useCallback để đảm bảo hàm không bị tạo lại mỗi lần render
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Thêm tham số limit vào URL để giới hạn số sản phẩm
      const response = await axios.get<RecommendationsResponse>(`/api/recommendations?limit=${limit}`);
      
      // Debug logging
      console.log(`Fetched ${limit} recommendations:`, response.data);
      
      // Handle both array and object response structures
      const productsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.products || []);
      
      const responseType = !Array.isArray(response.data) && response.data.type 
        ? response.data.type 
        : 'popular';
      
      setRecommendations(productsData);
      setRecommendationType(responseType === 'error' ? 'popular' : responseType);
    } catch (err) {
      console.error('Lỗi khi lấy gợi ý sản phẩm:', err);
      if (err instanceof Error) {
        console.error('Error details:', err.message);
      }
      setError('Không thể tải gợi ý sản phẩm. Vui lòng thử lại sau.');
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [limit]); // Thêm limit vào dependencies

  // Loại bỏ tự động fetch khi component mount
  // Thay vào đó, Component sẽ gọi refreshRecommendations khi isMounted=true
  // useEffect(() => {
  //   fetchRecommendations();
  // }, [fetchRecommendations]);

  return {
    recommendations,
    recommendationType,
    loading,
    error,
    refreshRecommendations: fetchRecommendations,
  };
} 
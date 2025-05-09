'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Category {
  id: string;
  name: string;
}

// Các hình ảnh và icons cho mỗi danh mục
const categoryImages = {
  'Điện thoại': {
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?q=80&w=2080&auto=format&fit=crop',
    icon: 'ph:device-mobile-bold'
  },
  'Laptop': {
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?q=80&w=2080&auto=format&fit=crop',
    icon: 'carbon:laptop'
  },
  'Máy tính bảng': {
    image: 'https://images.unsplash.com/photo-1589739900993-8d9a2a6f27a6?q=80&w=2080&auto=format&fit=crop',
    icon: 'ic:round-tablet-mac'
  },
  'Phụ kiện': {
    image: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?q=80&w=2080&auto=format&fit=crop',
    icon: 'mingcute:headphone-fill'
  },
  'Đồng hồ thông minh': {
    image: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?q=80&w=2080&auto=format&fit=crop',
    icon: 'mdi:watch'
  },
  'Âm thanh': {
    image: 'https://images.unsplash.com/photo-1558089687-f282ffcbc595?q=80&w=2080&auto=format&fit=crop',
    icon: 'ri:speaker-fill'
  },
  'Gia dụng': {
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=2080&auto=format&fit=crop',
    icon: 'material-symbols:home'
  },
  'Thời trang': {
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2080&auto=format&fit=crop',
    icon: 'ic:round-shopping-bag'
  }
};

export default function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/categories');
        
        // Debug logging to see the actual response structure
        console.log('Categories API Response:', response.data);
        
        // Handle different response formats
        const categoryData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.categories || []);
        
        // Log the extracted categories data
        console.log('Processed categories data:', categoryData);
        
        setCategories(categoryData);
        setError(null);
      } catch (err) {
        console.error('Lỗi khi lấy danh mục:', err);
        if (err instanceof Error) {
          console.error('Error details:', err.message);
        }
        setError('Không thể tải danh mục. Vui lòng thử lại sau.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[...Array(8)].map((_, index) => (
          <div key={index} className="rounded-xl overflow-hidden">
            <div className="h-48 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  // Make sure displayCategories is always an array
  const displayCategories = Array.isArray(categories) && categories.length > 0 ? categories : [
    { id: '1', name: 'Điện thoại' },
    { id: '2', name: 'Laptop' },
    { id: '3', name: 'Máy tính bảng' },
    { id: '4', name: 'Phụ kiện' },
    { id: '5', name: 'Đồng hồ thông minh' },
    { id: '6', name: 'Âm thanh' },
    { id: '7', name: 'Gia dụng' },
    { id: '8', name: 'Thời trang' }
  ];

  const getImageAndIcon = (name: string) => {
    // @ts-ignore
    return categoryImages[name] || {
      image: `https://placehold.co/800x600?text=${encodeURIComponent(name)}`,
      icon: 'material-symbols:category'
    };
  };

  // Make sure we're working with an array before calling map
  if (!Array.isArray(displayCategories)) {
    console.error('displayCategories is not an array:', displayCategories);
    return (
      <div className="alert alert-error shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Lỗi: Không thể hiển thị danh mục</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {displayCategories.map((category) => {
        const { image, icon } = getImageAndIcon(category.name);
        
        return (
          <Link
            key={category.id}
            href={`/categories/${category.id}`}
            className="group rounded-xl overflow-hidden h-60 relative shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            {/* Hình ảnh danh mục */}
            <img 
              src={image}
              alt={category.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={(e) => {
                e.currentTarget.src = `https://placehold.co/800x600?text=${encodeURIComponent(category.name)}`;
              }}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
            
            {/* Content container */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:bg-primary transition-colors duration-300">
                <span className="text-3xl">{/* Icon placeholder - would need an icon library */}</span>
              </div>
              <h3 className="text-xl font-bold text-center group-hover:text-primary-content transition-colors">{category.name}</h3>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="px-4 py-2 rounded-full bg-primary text-white text-sm">Xem ngay</span>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
} 
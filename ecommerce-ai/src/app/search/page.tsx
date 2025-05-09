'use client';

import { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatCurrency } from '@/lib/formatters';
import { customImageLoader } from '@/lib/imageLoader';

// Types
interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number;
  imageUrl: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  inStock?: boolean;
  rating?: number;
}

// Hàm đánh dấu từ khóa trong chuỗi văn bản - di chuyển ra ngoài để component con có thể sử dụng
const highlightText = (text: string, query: string) => {
  if (!query || query.trim() === '') return text;
  
  try {
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <span key={index} className="bg-yellow-200 dark:bg-yellow-800 text-black dark:text-white">{part}</span> 
            : part
        )}
      </>
    );
  } catch (e) {
    // Nếu có lỗi với biểu thức chính quy, trả về văn bản gốc
    return text;
  }
};

// Tối ưu hiệu suất tải trang bằng cách lazy load các thành phần
const ProductCard = ({ product, searchQuery }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  return (
    <Link 
      href={`/products/${product.id}`}
      key={product.id} 
      className="bg-base-100 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
    >
      <div className="w-full h-48 relative overflow-hidden">
        {product.imageUrl ? (
          <>
            {!imageLoaded && (
              <div className="w-full h-full bg-base-300 animate-pulse flex items-center justify-center">
                <span className="text-base-content/30">Đang tải...</span>
              </div>
            )}
            <Image
              loader={customImageLoader}
              src={product.imageUrl}
              alt={product.name}
              fill
              className={`object-cover group-hover:scale-105 transition-transform duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
              unoptimized
              onLoad={() => setImageLoaded(true)}
              onError={(e: any) => {
                // If image fails to load, replace with placeholder
                if (e.target) {
                  e.target.onerror = null; // Prevent infinite loop
                  e.target.src = 'https://via.placeholder.com/400x400?text=No+Image';
                  setImageLoaded(true);
                }
              }}
            />
          </>
        ) : (
          <div className="w-full h-full bg-base-300 flex items-center justify-center">
            <span className="text-base-content/50">No image</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="badge badge-outline mb-2">{product.category.name}</div>
        <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
          {highlightText(product.name, searchQuery)}
        </h3>
        <p className="mt-1 text-lg font-bold text-primary">
          {formatCurrency(product.price)}
        </p>
      </div>
    </Link>
  );
}

// Component skeleton cho trạng thái loading
const ProductCardSkeleton = () => (
  <div className="bg-base-100 rounded-lg shadow-sm p-4 h-80 animate-pulse">
    <div className="w-full h-48 bg-base-300 rounded-lg mb-4"></div>
    <div className="h-4 bg-base-300 rounded w-3/4 mb-2"></div>
    <div className="h-4 bg-base-300 rounded w-1/2"></div>
    <div className="mt-2 h-6 bg-base-300 rounded w-1/3"></div>
  </div>
);

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '';
  const sortOrder = searchParams.get('sort') || 'relevance';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 9;
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const inStockParam = searchParams.get('inStock');
  const ratingParam = searchParams.get('rating');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchQuery);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: categoryFilter,
    minPrice: minPriceParam ? parseInt(minPriceParam) : undefined,
    maxPrice: maxPriceParam ? parseInt(maxPriceParam) : undefined,
    sort: sortOrder,
    inStock: inStockParam === 'true',
    rating: ratingParam ? parseInt(ratingParam) : undefined
  });
  
  // Dùng useRef để theo dồi phần tử cuối cùng để lazy load
  const lastProductRef = useRef(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Tính toán số trang dựa trên tổng số sản phẩm và số lượng sản phẩm trên mỗi trang
  const totalPages = Math.ceil(totalProducts / itemsPerPage);

  // Effect để quan sát phần tử cuối cùng và tải thêm sản phẩm khi người dùng cuộn đến
  useEffect(() => {
    if (!lastProductRef.current || !hasMoreProducts || isLoadingMore) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          // Người dùng đã cuộn đến sản phẩm cuối cùng
          loadMoreProducts();
        }
      },
      { threshold: 0.5 }
    );
    
    observer.observe(lastProductRef.current);
    
    return () => {
      if (lastProductRef.current) {
        observer.unobserve(lastProductRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMoreProducts, isLoadingMore, lastProductRef]);

  // Đóng suggestions khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Hàm để tải thêm sản phẩm
  const loadMoreProducts = async () => {
    if (page >= totalPages || isLoadingMore) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      
      // Thêm tất cả các filters vào params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value.toString());
        }
      });
      
      params.set('page', nextPage.toString());
      params.set('limit', itemsPerPage.toString());
      
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`/api/products/search?${params.toString()}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to parse error response
        let errorMessage;
        try {
          const errorData = await response.json();
          console.error('API error details on loadMoreProducts:', errorData);
          errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      if (!data.products || data.products.length === 0) {
        setHasMoreProducts(false);
      } else {
        setProducts(prev => [...prev, ...(data.products || [])]);
        
        // Update URL với trang mới mà không làm tải lại trang
        const currentParams = new URLSearchParams(searchParams.toString());
        currentParams.set('page', nextPage.toString());
        router.push(`/search?${currentParams.toString()}`, { scroll: false });
      }
    } catch (err) {
      console.error('Error loading more products:', err);
      
      // Có thể là lỗi kết nối hoặc lỗi server
      if (err.name === 'AbortError') {
        setError('Yêu cầu tải thêm sản phẩm đã hết thời gian. Vui lòng thử lại sau.');
      } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
      } else {
        setError(err.message || 'Không thể tải thêm sản phẩm. Vui lòng thử lại sau.');
      }
      
      setHasMoreProducts(false);
    } finally {
      setIsLoadingMore(false);
    }
  };
  
  // Effect để fetch sản phẩm
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      
      try {
        const params = new URLSearchParams();
        if (searchQuery) params.set('q', searchQuery);
        
        // Thêm tất cả các filters vào params
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.set(key, value.toString());
          }
        });
        
        params.set('page', page.toString());
        params.set('limit', itemsPerPage.toString());
        
        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(`/api/products/search?${params.toString()}`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          // Try to parse error response
          let errorMessage;
          try {
            const errorData = await response.json();
            console.error('API error details:', errorData);
            errorMessage = errorData.message || `Error ${response.status}: ${response.statusText}`;
          } catch (parseError) {
            console.error('Could not parse error response:', parseError);
            errorMessage = `Error ${response.status}: ${response.statusText}`;
          }
          
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        setProducts(data.products || []);
        setTotalProducts(data.total || 0);
        setHasMoreProducts((data.products?.length || 0) >= itemsPerPage);
        
        // If this is a new search, save it
        if (searchQuery && searchQuery.trim() !== '') {
          saveSearch(searchQuery);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
        
        // Có thể là lỗi kết nối hoặc lỗi server
        if (err.name === 'AbortError') {
          setError('Yêu cầu tìm kiếm đã hết thời gian. Vui lòng thử lại sau.');
        } else if (err.name === 'TypeError' && err.message.includes('Failed to fetch')) {
          setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.');
        } else {
          setError(err.message || 'Không thể tải danh sách sản phẩm. Vui lòng thử lại sau.');
        }
        
        // Set empty products array to prevent UI issues
        setProducts([]);
        setTotalProducts(0);
        setHasMoreProducts(false);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filters, page, itemsPerPage]);

  // Fetch all data on initial load
  useEffect(() => {
    fetchCategories();
    loadRecentSearches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    if (typeof window !== 'undefined') {
      const searches = localStorage.getItem('recentSearches');
      if (searches) {
        setRecentSearches(JSON.parse(searches));
      }
    }
  };

  // Save search to recent searches
  const saveSearch = (query: string) => {
    if (query.trim() === '') return;
    
    let searches = [...recentSearches];
    // Remove if exists already to prevent duplicates
    searches = searches.filter(s => s !== query);
    // Add to beginning of array
    searches.unshift(query);
    // Keep only the last 5 searches
    searches = searches.slice(0, 5);
    
    setRecentSearches(searches);
    localStorage.setItem('recentSearches', JSON.stringify(searches));
  };

  // Fetch product categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) {
        console.error('Categories API returned status:', response.status);
        setCategories([]);
        return;
      }
      const data = await response.json();
      // Handle both array and object formats
      if (Array.isArray(data)) {
        setCategories(data);
      } else if (data.categories && Array.isArray(data.categories)) {
        setCategories(data.categories);
      } else {
        console.error('Unexpected categories data format:', data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  // Generate suggestions based on input
  const fetchSuggestions = async (input: string) => {
    if (input.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/products/suggestions?q=${encodeURIComponent(input)}`);
      if (!response.ok) {
        console.error('Suggestions API returned status:', response.status);
        setSuggestions([]);
        return;
      }
      
      const data = await response.json();
      
      if (!data.suggestions || !Array.isArray(data.suggestions)) {
        console.error('Unexpected suggestions data format:', data);
        setSuggestions([]);
      } else {
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    }
  };

  // Debounce search input for suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Handle search form submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      saveSearch(searchTerm.trim());
      
      // Cập nhật URL với các tham số tìm kiếm
      const params = new URLSearchParams();
      params.set('q', searchTerm.trim());
      
      // Thêm các bộ lọc hiện tại vào URL
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.set(key, value.toString());
        }
      });
      
      router.push(`/search?${params.toString()}`);
      setShowSuggestions(false);
    }
  };

  // Handle advanced search toggle
  const toggleAdvancedSearch = () => {
    setShowAdvancedSearch(!showAdvancedSearch);
  };

  // Handle category filter change
  const handleCategoryChange = (categoryId: string | null) => {
    setFilters(prev => ({
      ...prev,
      category: categoryId || undefined
    }));
  };

  // Handle price range filter change
  const handlePriceChange = (min: number, max: number) => {
    setFilters(prev => ({
      ...prev,
      minPrice: min,
      maxPrice: max
    }));
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setFilters(prev => ({
      ...prev,
      sort: value
    }));
  };

  // Handle in-stock filter change
  const handleInStockChange = (checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      inStock: checked
    }));
  };

  // Handle rating filter change
  const handleRatingChange = (rating: number | undefined) => {
    setFilters(prev => ({
      ...prev,
      rating
    }));
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    saveSearch(suggestion);
    
    // Cập nhật URL với các tham số tìm kiếm
    const params = new URLSearchParams();
    params.set('q', suggestion);
    
    // Thêm các bộ lọc hiện tại vào URL
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });
    
    router.push(`/search?${params.toString()}`);
    setShowSuggestions(false);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      sort: 'relevance'
    });
    
    // Update URL to remove filters but keep search query
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    router.push(`/search?${params.toString()}`);
  };

  // Apply filters
  const applyFilters = () => {
    // Update URL with all filters
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.set(key, value.toString());
      }
    });
    
    router.push(`/search?${params.toString()}`);
  };

  // Calculate price ranges
  const priceRanges = [
    { min: 0, max: 1000000, label: 'Dưới 1.000.000₫' },
    { min: 1000000, max: 5000000, label: '1.000.000₫ - 5.000.000₫' },
    { min: 5000000, max: 10000000, label: '5.000.000₫ - 10.000.000₫' },
    { min: 10000000, max: 20000000, label: '10.000.000₫ - 20.000.000₫' },
    { min: 20000000, max: 10000000000, label: 'Trên 20.000.000₫' },
  ];

  return (
    <div className="container mx-auto px-4 py-8 pt-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-6">Tìm kiếm sản phẩm</h1>
        
        {/* Smart search with advanced options */}
        <div className="bg-base-100 p-6 rounded-xl shadow-sm mb-6">
          <div className="relative mb-4" ref={searchInputRef}>
            <form onSubmit={handleSearch} className="flex w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm..."
                  className="w-full px-4 py-3 pl-12 rounded-l-xl border border-base-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  autoComplete="off"
                  ref={searchInputRef}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-base-content/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                
                {/* Suggestions dropdown */}
                {showSuggestions && (searchTerm.length > 0 || recentSearches.length > 0) && (
                  <div className="absolute z-30 top-full left-0 right-0 mt-2 bg-base-100 rounded-lg shadow-lg border border-base-300 max-h-80 overflow-auto">
                    {searchTerm.length > 0 && suggestions.length > 0 && (
                      <div className="p-2">
                        <div className="text-sm font-medium text-base-content/70 px-3 py-1.5">Gợi ý từ khóa</div>
                        {suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg flex items-center cursor-pointer" 
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {highlightText(suggestion, searchTerm)}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {recentSearches.length > 0 && (
                      <div className="p-2 border-t border-base-300">
                        <div className="text-sm font-medium text-base-content/70 px-3 py-1.5">Tìm kiếm gần đây</div>
                        {recentSearches.map((search, index) => (
                          <div
                            key={index}
                            className="w-full text-left px-3 py-2 hover:bg-base-200 rounded-lg flex items-center cursor-pointer"
                            onClick={() => handleSuggestionClick(search)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-base-content/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {highlightText(search, searchTerm)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <button
                type="submit"
                className="px-6 bg-primary hover:bg-primary-focus text-primary-content rounded-r-xl transition-colors"
              >
                Tìm kiếm
              </button>
            </form>
          </div>

          {/* Advanced search toggle */}
          <div className="flex justify-between items-center mb-2">
            <button
              type="button"
              className="text-sm flex items-center text-primary hover:underline"
              onClick={toggleAdvancedSearch}
            >
              <span>{showAdvancedSearch ? 'Ẩn tìm kiếm nâng cao' : 'Hiện tìm kiếm nâng cao'}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 ml-1 transition-transform ${showAdvancedSearch ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {Object.values(filters).some(v => v !== undefined && v !== '' && v !== 'relevance') && (
              <button
                type="button"
                className="text-sm text-error hover:underline"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>

          {/* Advanced search options */}
          {showAdvancedSearch && (
            <div className="bg-base-200 p-4 rounded-lg mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Categories */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm mb-2">Danh mục sản phẩm</h3>
                <select 
                  className="select select-bordered w-full"
                  value={filters.category || ''}
                  onChange={(e) => handleCategoryChange(e.target.value || null)}
                >
                  <option value="">Tất cả danh mục</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm mb-2">Khoảng giá</h3>
                <select 
                  className="select select-bordered w-full"
                  value={filters.minPrice !== undefined && filters.maxPrice !== undefined 
                    ? `${filters.minPrice}-${filters.maxPrice}` 
                    : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      handlePriceChange(undefined, undefined);
                    } else {
                      const [min, max] = value.split('-').map(Number);
                      handlePriceChange(min, max);
                    }
                  }}
                >
                  <option value="">Tất cả khoảng giá</option>
                  {priceRanges.map((range, index) => (
                    <option key={index} value={`${range.min}-${range.max}`}>
                      {range.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort options */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm mb-2">Sắp xếp theo</h3>
                <select 
                  className="select select-bordered w-full"
                  value={filters.sort || 'relevance'}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  <option value="relevance">Phù hợp nhất</option>
                  <option value="price_asc">Giá: Thấp đến cao</option>
                  <option value="price_desc">Giá: Cao đến thấp</option>
                  <option value="newest">Mới nhất</option>
                  <option value="popular">Phổ biến nhất</option>
                </select>
              </div>

              {/* Additional filters */}
              <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* In-stock filter */}
                <div className="form-control">
                  <label className="label cursor-pointer justify-start gap-2">
                    <input 
                      type="checkbox"
                      className="checkbox checkbox-primary checkbox-sm"
                      checked={filters.inStock || false}
                      onChange={(e) => handleInStockChange(e.target.checked)}
                    />
                    <span className="label-text">Chỉ hiển thị sản phẩm còn hàng</span>
                  </label>
                </div>

                {/* Rating filter */}
                <div className="space-y-2">
                  <h3 className="font-medium text-sm">Đánh giá</h3>
                  <div className="flex items-center space-x-2">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`rounded-full px-3 py-1 text-sm ${
                          filters.rating === star
                            ? 'bg-primary text-primary-content'
                            : 'bg-base-300 hover:bg-base-content/20'
                        }`}
                        onClick={() => handleRatingChange(filters.rating === star ? undefined : star)}
                      >
                        {star}⭐ trở lên
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Apply filters button */}
              <div className="md:col-span-3 flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={applyFilters}
                >
                  Áp dụng bộ lọc
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {searchQuery ? (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Sidebar with filters */}
          <div className="lg:col-span-1">
            <div className="bg-base-100 p-4 rounded-lg shadow-sm sticky top-24">
              <h2 className="text-xl font-semibold mb-4">Bộ lọc tìm kiếm</h2>
              
              {/* Selected filters summary */}
              {Object.entries(filters).some(([key, value]) => value !== undefined && value !== '' && value !== 'relevance' && key !== 'sort') && (
                <div className="mb-4">
                  <h3 className="font-medium mb-2">Bộ lọc đã chọn</h3>
                  <div className="flex flex-wrap gap-2">
                    {filters.category && (
                      <div className="badge badge-primary gap-1">
                        Danh mục: {categories.find(c => c.id === filters.category)?.name || filters.category}
                        <div 
                          onClick={() => handleCategoryChange(null)}
                          className="cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {filters.minPrice !== undefined && filters.maxPrice !== undefined && (
                      <div className="badge badge-primary gap-1">
                        Giá: {formatCurrency(filters.minPrice)} - {filters.maxPrice >= 1000000000 ? 'trở lên' : formatCurrency(filters.maxPrice)}
                        <div 
                          onClick={() => handlePriceChange(undefined, undefined)}
                          className="cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {filters.inStock && (
                      <div className="badge badge-primary gap-1">
                        Còn hàng
                        <div 
                          onClick={() => handleInStockChange(false)}
                          className="cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    {filters.rating !== undefined && (
                      <div className="badge badge-primary gap-1">
                        {filters.rating}⭐ trở lên
                        <div 
                          onClick={() => handleRatingChange(undefined)}
                          className="cursor-pointer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Categories filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Danh mục sản phẩm</h3>
                <div className="space-y-1">
                  <div className="form-control">
                    <label className="cursor-pointer">
                      <input 
                        type="radio" 
                        className="radio radio-sm radio-primary" 
                        checked={!filters.category}
                        onChange={() => handleCategoryChange(null)}
                      />
                      <span className="ml-2 text-sm">Tất cả danh mục</span>
                    </label>
                  </div>
                  
                  {categories.map(category => (
                    <div key={category.id} className="form-control">
                      <label className="cursor-pointer">
                        <input 
                          type="radio" 
                          className="radio radio-sm radio-primary" 
                          checked={filters.category === category.id}
                          onChange={() => handleCategoryChange(category.id)}
                        />
                        <span className="ml-2 text-sm">{category.name}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Price range filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Khoảng giá</h3>
                <div className="space-y-1">
                  <div className="form-control">
                    <label className="cursor-pointer">
                      <input 
                        type="radio" 
                        className="radio radio-sm radio-primary" 
                        checked={filters.minPrice === undefined && filters.maxPrice === undefined}
                        onChange={() => handlePriceChange(undefined, undefined)}
                      />
                      <span className="ml-2 text-sm">Tất cả khoảng giá</span>
                    </label>
                  </div>
                  
                  {priceRanges.map((range, index) => (
                    <div key={index} className="form-control">
                      <label className="cursor-pointer">
                        <input 
                          type="radio" 
                          className="radio radio-sm radio-primary" 
                          checked={
                            filters.minPrice === range.min && 
                            filters.maxPrice === range.max
                          }
                          onChange={() => handlePriceChange(range.min, range.max)}
                        />
                        <span className="ml-2 text-sm">{range.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* In stock filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Tình trạng hàng</h3>
                <div className="form-control">
                  <label className="cursor-pointer inline-flex items-center">
                    <input 
                      type="checkbox" 
                      className="checkbox checkbox-sm checkbox-primary" 
                      checked={filters.inStock || false}
                      onChange={(e) => handleInStockChange(e.target.checked)}
                    />
                    <span className="ml-2 text-sm">Chỉ hiển thị sản phẩm còn hàng</span>
                  </label>
                </div>
              </div>
              
              {/* Rating filter */}
              <div className="mb-6">
                <h3 className="font-medium mb-2">Đánh giá</h3>
                <div className="flex flex-col gap-2">
                  {[5, 4, 3, 2, 1].map(rating => (
                    <button
                      key={rating}
                      className={`flex items-center text-left px-3 py-2 rounded-lg transition-colors ${
                        filters.rating === rating 
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-base-200'
                      }`}
                      onClick={() => handleRatingChange(filters.rating === rating ? undefined : rating)}
                    >
                      <div className="flex items-center">
                        {Array.from({ length: rating }).map((_, i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-warning" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        {Array.from({ length: 5 - rating }).map((_, i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-base-content/20" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm">trở lên</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              <button 
                className="btn btn-outline w-full"
                onClick={resetFilters}
              >
                Xóa bộ lọc
              </button>
            </div>
          </div>
          
          {/* Main content - search results */}
          <div className="lg:col-span-4">
            {/* Search result info and sorting */}
            <div className="bg-base-100 p-4 rounded-lg shadow-sm mb-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  {loading ? (
                    <p>Đang tìm kiếm...</p>
                  ) : (
                    <p>
                      Tìm thấy <span className="font-medium">{totalProducts}</span> kết quả cho "
                      <span className="font-medium">{searchQuery}</span>"
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span>Sắp xếp theo:</span>
                  <select 
                    className="select select-bordered select-sm"
                    value={filters.sort || 'relevance'}
                    onChange={(e) => handleSortChange(e.target.value)}
                  >
                    <option value="relevance">Phù hợp nhất</option>
                    <option value="price_asc">Giá: Thấp đến cao</option>
                    <option value="price_desc">Giá: Cao đến thấp</option>
                    <option value="newest">Mới nhất</option>
                    <option value="popular">Phổ biến nhất</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Display error message if any */}
            {error && (
              <div className="alert alert-error shadow-lg mb-6">
                <div>
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>{error}</span>
                  <button onClick={() => window.location.reload()} className="btn btn-xs btn-ghost ml-4">
                    Thử lại
                  </button>
                </div>
              </div>
            )}
            
            {/* Products grid */}
            {loading ? (
              <div className="w-full py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <ProductCardSkeleton key={index} />
                  ))}
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="w-full py-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-lg font-medium">Không tìm thấy sản phẩm nào</h3>
                  <p className="text-base-content/70">Hãy thử tìm kiếm với từ khóa khác hoặc bỏ bộ lọc</p>
                  <button 
                    className="btn btn-outline mt-2"
                    onClick={resetFilters}
                  >
                    Xóa bộ lọc và thử lại
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full py-6">
                <div className="pb-4 flex justify-between items-center">
                  <p className="text-sm text-base-content/70">Hiển thị {products.length} / {totalProducts} sản phẩm</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product, index) => {
                    // Check if this is the last product to attach the ref
                    if (index === products.length - 1) {
                      return (
                        <div key={product.id} ref={lastProductRef}>
                          <ProductCard product={product} searchQuery={searchQuery} />
                        </div>
                      );
                    }
                    return <ProductCard key={product.id} product={product} searchQuery={searchQuery} />;
                  })}
                </div>
                
                {/* Loading indicator for infinite scroll */}
                {isLoadingMore && (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                )}
                
                {/* Show button to load more if needed */}
                {!isLoadingMore && hasMoreProducts && products.length >= itemsPerPage && (
                  <div className="flex justify-center py-4">
                    <button 
                      className="btn btn-outline btn-primary" 
                      onClick={() => loadMoreProducts()}
                    >
                      Tải thêm sản phẩm
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Bạn đang tìm gì?</h2>
          <p className="mb-8 text-base-content/70 max-w-xl mx-auto">
            Nhập từ khóa vào ô tìm kiếm để bắt đầu tìm kiếm sản phẩm mà bạn mong muốn.
          </p>
          
          {recentSearches.length > 0 && (
            <div className="mb-8">
              <h3 className="font-medium mb-4">Tìm kiếm gần đây</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSuggestionClick(search)}
                  >
                    {highlightText(search, searchTerm)}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <Link href="/products" className="btn btn-primary">
            Xem tất cả sản phẩm
          </Link>
        </div>
      )}
    </div>
  );
} 
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  reviews?: { rating: number }[];
}

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State cho dữ liệu và loading
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  
  // State cho bộ lọc và sắp xếp
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000000]);
  const [maxPossiblePrice, setMaxPossiblePrice] = useState(10000000);
  const [minPossiblePrice, setMinPossiblePrice] = useState(0);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  
  // State cho phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  // Thêm state để theo dõi xem người dùng đang kéo thanh trượt nào
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  // Thêm state để theo dõi phân phối sản phẩm theo giá
  const [priceDistribution, setPriceDistribution] = useState<{price: number, count: number}[]>([]);

  // Thêm state để lưu giá trị tạm thời khi người dùng đang kéo thanh trượt
  const [tempPriceRange, setTempPriceRange] = useState<[number, number]>([0, 10000000]);
  // Thêm state để theo dõi khi người dùng đang kéo
  const [isDragging, setIsDragging] = useState(false);
  // Khoảng cách tối thiểu giữa min và max (giảm xuống để dễ tùy chỉnh hơn)
  const MIN_PRICE_DIFFERENCE = 50000;

  // Đọc các tham số từ URL khi trang tải
  useEffect(() => {
    const page = searchParams.get('page') ? parseInt(searchParams.get('page') as string) : 1;
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'newest';
    const search = searchParams.get('search') || '';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice') as string) : 0;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice') as string) : 10000000;
    const rating = searchParams.get('rating') ? parseInt(searchParams.get('rating') as string) : null;
    const brand = searchParams.get('brand') || null;
    
    setCurrentPage(page);
    setSelectedCategory(category);
    setSortBy(sort);
    setSearchTerm(search);
    setPriceRange([minPrice, maxPrice]);
    setTempPriceRange([minPrice, maxPrice]); // Cập nhật tempPriceRange cùng lúc
    setRatingFilter(rating);
    setSelectedBrand(brand);
  }, [searchParams]);

  // Fetch dữ liệu sản phẩm mỗi khi bộ lọc thay đổi
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [currentPage, selectedCategory, sortBy, searchTerm, priceRange, ratingFilter, selectedBrand, itemsPerPage]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Xây dựng query parameters
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());
      
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }
      
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      // Map sort options to API parameters
      let sortParam = 'newest';
      switch (sortBy) {
        case 'price_asc':
          sortParam = 'price_asc';
          break;
        case 'price_desc':
          sortParam = 'price_desc';
          break;
        case 'popular':
          sortParam = 'popular';
          break;
        default:
          sortParam = 'newest';
      }
      params.append('sort', sortParam);
      
      // Truy vấn tất cả sản phẩm để xác định khoảng giá
      // Ta chỉ cần làm điều này khi lần đầu tải trang
      if (currentPage === 1 && priceRange[0] === 0 && priceRange[1] === maxPossiblePrice) {
        // Handling price range in a separate try-catch to avoid failing the whole request
        try {
          const priceRangeParams = new URLSearchParams();
          if (selectedCategory) {
            priceRangeParams.append('category', selectedCategory);
          }
          
          const priceRangeResponse = await axios.get(`/api/products/price-range?${priceRangeParams.toString()}`);
          if (priceRangeResponse.data && 
              typeof priceRangeResponse.data.min === 'number' && 
              typeof priceRangeResponse.data.max === 'number') {
            // Làm tròn giá trị để dễ sử dụng
            const minPrice = Math.floor(priceRangeResponse.data.min / 10000) * 10000;
            const maxPrice = Math.ceil(priceRangeResponse.data.max / 10000) * 10000;
            
            setMinPossiblePrice(minPrice);
            setMaxPossiblePrice(maxPrice);
            
            // Chỉ cập nhật khoảng giá nếu người dùng chưa thay đổi nó
            if (priceRange[0] === 0 && priceRange[1] === 10000000) {
              setPriceRange([minPrice, maxPrice]);
              setTempPriceRange([minPrice, maxPrice]); // Cập nhật tempPriceRange cùng lúc
            }
            
            // Lấy phân bố sản phẩm theo khoảng giá nếu có
            if (priceRangeResponse.data.distribution) {
              setPriceDistribution(priceRangeResponse.data.distribution);
            }
          }
        } catch (priceRangeError) {
          console.error('Không thể lấy khoảng giá:', priceRangeError);
          // Continue with default values
        }
      }
      
      // Các API endpoint hiện tại không hỗ trợ lọc theo giá và đánh giá
      // nên ta sẽ lọc dữ liệu ở phía client
      
      // Implement retry logic for the main products API
      let response;
      let retries = 3;
      
      while (retries > 0) {
        try {
          response = await axios.get(`/api/products?${params.toString()}`);
          break; // If successful, break out of the retry loop
        } catch (err) {
          retries--;
          if (retries === 0) {
            // If out of retries, re-throw the error
            throw err;
          }
          console.log(`Retrying... ${retries} attempts left`);
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!response) {
        throw new Error('Failed to fetch products after multiple attempts');
      }
      
      // Lấy thông tin phân trang từ headers
      const totalCount = parseInt(response.headers['x-total-count'] || '0');
      const totalPages = parseInt(response.headers['x-total-pages'] || '1');
      
      setTotalProducts(totalCount);
      setTotalPages(totalPages);
      
      // Đảm bảo dữ liệu nhận được là một mảng sản phẩm
      let data = response.data;
      if (Array.isArray(data)) {
        // Lọc dữ liệu theo giá và đánh giá ở phía client
        data = data.filter(product => {
          // Lọc theo khoảng giá
          const matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
          
          // Lọc theo đánh giá (nếu có)
          let matchesRating = true;
          if (ratingFilter !== null && product.reviews) {
            const avgRating = product.reviews.length > 0 
              ? product.reviews.reduce((sum, review) => sum + review.rating, 0) / product.reviews.length
              : 0;
            matchesRating = avgRating >= ratingFilter;
          }
          
          // Lọc theo thương hiệu (nếu có)
          const matchesBrand = selectedBrand === null || product.category.name === selectedBrand;
          
          return matchesPrice && matchesRating && matchesBrand;
        });
        
        setProducts(data);
      } else if (data && Array.isArray(data.products)) {
        // Trường hợp API trả về dạng { products: [...] }
        setProducts(data.products);
      } else {
        console.error('Định dạng dữ liệu sản phẩm không đúng:', data);
        setProducts([]);
        setError('Định dạng dữ liệu sản phẩm không đúng');
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách sản phẩm:', err);
      
      // More detailed error reporting
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Response error:', err.response.status, err.response.data);
        setError(`Lỗi máy chủ (${err.response.status}): ${err.response.data?.error || 'Không thể tải sản phẩm'}`);
      } else if (err.request) {
        // The request was made but no response was received
        console.error('Request error - no response:', err.request);
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error setting up request:', err.message);
        setError(`Lỗi: ${err.message}`);
      }
      
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/categories');
      // Đảm bảo dữ liệu nhận được là một mảng
      if (Array.isArray(response.data)) {
        setCategories(response.data);
        
        // Lấy danh sách thương hiệu từ các danh mục
        const uniqueBrands = Array.from(new Set(response.data.map((cat: any) => cat.name)));
        setBrands(uniqueBrands);
      } else if (response.data && Array.isArray(response.data.categories)) {
        // Trường hợp API trả về dạng { categories: [...] }
        setCategories(response.data.categories);
        
        // Lấy danh sách thương hiệu từ các danh mục
        const uniqueBrands = Array.from(new Set(response.data.categories.map((cat: any) => cat.name)));
        setBrands(uniqueBrands);
      } else {
        console.error('Định dạng dữ liệu danh mục không đúng:', response.data);
        setCategories([]);
        setBrands([]);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh mục:', err);
      setCategories([]);
      setBrands([]);
    }
  };

  // Cập nhật URL với các tham số lọc
  const updateFiltersInURL = (filters: Record<string, any>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    // Cập nhật các tham số
    Object.entries(filters).forEach(([key, value]) => {
      if (value === null || value === '') {
        current.delete(key);
      } else {
        current.set(key, String(value));
      }
    });
    
    // Luôn quay về trang 1 khi thay đổi bộ lọc
    if (!filters.hasOwnProperty('page')) {
      current.set('page', '1');
    }
    
    // Cập nhật URL
    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/products${query}`);
  };

  // Xử lý thay đổi bộ lọc
  const handleCategoryChange = (categoryId: string | null) => {
    setSelectedCategory(categoryId);
    updateFiltersInURL({ category: categoryId });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    updateFiltersInURL({ sort });
  };

  const handleSearchChange = (search: string) => {
    setSearchTerm(search);
    // Chỉ cập nhật URL khi người dùng dừng nhập
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFiltersInURL({ search: searchTerm });
  };

  // Thay đổi hàm handleTempPriceRangeChange để xử lý tốt hơn
  const handleTempPriceRangeChange = (range: [number, number]) => {
    setTempPriceRange(range);
  };

  // Thêm hàm mới để áp dụng khoảng giá khi nhấn nút
  const applyPriceRange = () => {
    setPriceRange(tempPriceRange);
    updateFiltersInURL({ minPrice: tempPriceRange[0], maxPrice: tempPriceRange[1] });
    setIsDragging(false);
  };

  // Hàm mới cho các lựa chọn khoảng giá nhanh
  const handleQuickPriceRangeSelection = (range: [number, number]) => {
    setTempPriceRange(range);
    setPriceRange(range);
    updateFiltersInURL({ minPrice: range[0], maxPrice: range[1] });
  };

  const handleRatingFilterChange = (rating: number | null) => {
    setRatingFilter(rating);
    updateFiltersInURL({ rating });
  };

  const handleBrandChange = (brand: string | null) => {
    setSelectedBrand(brand);
    updateFiltersInURL({ brand });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateFiltersInURL({ page });
  };

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items);
    setCurrentPage(1); // Reset về trang 1
    updateFiltersInURL({ limit: items, page: 1 });
  };

  // Reset tất cả bộ lọc
  const resetAllFilters = () => {
    setSelectedCategory(null);
    setSortBy('newest');
    setSearchTerm('');
    setPriceRange([0, 10000000]);
    setRatingFilter(null);
    setSelectedBrand(null);
    setCurrentPage(1);
    router.push('/products');
  };

  // Hiển thị UI khi đang tải
  if (loading && currentPage === 1) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Tất cả sản phẩm</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="card bg-base-100 shadow-sm animate-pulse">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="card-body">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 rounded w-full mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Hiển thị lỗi
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-6">
        <div className="alert alert-error max-w-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-4"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Tất cả sản phẩm</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Sidebar filters */}
        <div className="lg:col-span-1">
          <div className="bg-base-100 p-4 rounded-lg shadow-sm mb-4">
            <h2 className="font-semibold text-lg mb-3">Lọc sản phẩm</h2>
            
            {/* Danh mục */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Danh mục</h3>
              <div className="space-y-1">
                <div className="form-control">
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      className="radio radio-sm radio-primary" 
                      checked={selectedCategory === null}
                      onChange={() => handleCategoryChange(null)}
                    />
                    <span className="ml-2">Tất cả</span>
                  </label>
                </div>
                
                {Array.isArray(categories) && categories.map(category => (
                  <div key={category.id} className="form-control">
                    <label className="cursor-pointer">
                      <input 
                        type="radio" 
                        className="radio radio-sm radio-primary" 
                        checked={selectedCategory === category.id}
                        onChange={() => handleCategoryChange(category.id)}
                      />
                      <span className="ml-2">{category.name}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Khoảng giá */}
            <div className="mb-6">
              <h3 className="font-medium mb-3">Khoảng giá</h3>
              <div className="px-1">
                {/* Dual Range Slider */}
                <div className="relative pt-8 pb-10 mt-6">
                  {/* Phân phối giá (histogram) */}
                  <div className="h-10 w-full absolute top-0">
                    {Array.isArray(priceDistribution) && priceDistribution.length > 0 ? (
                      priceDistribution.map((item, index) => {
                        const position = ((item.price - minPossiblePrice) / (maxPossiblePrice - minPossiblePrice)) * 100;
                        const height = (item.count / Math.max(...priceDistribution.map(d => d.count))) * 100;
                        return (
                          <div 
                            key={index}
                            className="absolute bg-gray-200 rounded-sm" 
                            style={{
                              left: `${position}%`,
                              height: `${Math.max(10, height)}%`,
                              width: '4px',
                              transform: 'translateX(-2px)',
                              opacity: 0.7
                            }}
                          />
                        );
                      })
                    ) : (
                      // Placeholder histogram khi không có dữ liệu
                      Array.from({length: 20}).map((_, index) => (
                        <div 
                          key={index}
                          className="absolute bg-gray-200 rounded-sm" 
                          style={{
                            left: `${(index / 19) * 100}%`,
                            height: `${Math.max(10, Math.random() * 100)}%`,
                            width: '4px',
                            transform: 'translateX(-2px)',
                            opacity: 0.5
                          }}
                        />
                      ))
                    )}
                  </div>
                  
                  {/* Hiển thị giá trị hiện tại */}
                  <div className="flex justify-between text-sm mb-2 font-medium mt-2">
                    <span className={`text-primary transition-all ${isDragging && activeThumb === 'min' ? 'scale-110 font-bold' : ''}`}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tempPriceRange[0])}
                    </span>
                    <span className={`text-primary transition-all ${isDragging && activeThumb === 'max' ? 'scale-110 font-bold' : ''}`}>
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tempPriceRange[1])}
                    </span>
                  </div>
                  
                  {/* Track background */}
                  <div className="h-3 bg-gray-200 rounded-full mt-4"></div>
                  
                  {/* Track selection */}
                  <div 
                    className={`absolute h-3 rounded-full transition-all ${
                      isDragging ? 'bg-primary-focus' : 'bg-primary'
                    }`} 
                    style={{ 
                      left: `${((tempPriceRange[0] - minPossiblePrice) / (maxPossiblePrice - minPossiblePrice)) * 100}%`, 
                      right: `${100 - ((tempPriceRange[1] - minPossiblePrice) / (maxPossiblePrice - minPossiblePrice)) * 100}%`,
                      top: '66px'
                    }}
                  ></div>
                  
                  {/* Min price thumb */}
                  <input 
                    type="range" 
                    min={minPossiblePrice} 
                    max={maxPossiblePrice} 
                    step={10000}
                    value={tempPriceRange[0]} 
                    onChange={(e) => {
                      const newMin = parseInt(e.target.value);
                      // Đảm bảo giá trị min không vượt quá giá trị max - MIN_PRICE_DIFFERENCE
                      if (newMin < tempPriceRange[1] - MIN_PRICE_DIFFERENCE) {
                        handleTempPriceRangeChange([newMin, tempPriceRange[1]]);
                      }
                    }}
                    onMouseDown={() => {
                      setActiveThumb('min');
                      setIsDragging(true);
                    }}
                    onTouchStart={() => {
                      setActiveThumb('min');
                      setIsDragging(true);
                    }}
                    onMouseUp={() => {
                      setActiveThumb(null);
                      // Không reset isDragging ngay lập tức để có hiệu ứng đẹp hơn
                    }}
                    onTouchEnd={() => {
                      setActiveThumb(null);
                      // Không reset isDragging ngay lập tức để có hiệu ứng đẹp hơn
                    }}
                    onBlur={() => setActiveThumb(null)}
                    className="range-slider thumb-left absolute w-full h-3 opacity-0 cursor-pointer z-30" 
                    style={{ 
                      touchAction: 'none',
                      pointerEvents: 'auto',
                      top: '66px'
                    }}
                  />
                  
                  {/* Max price thumb */}
                  <input 
                    type="range" 
                    min={minPossiblePrice} 
                    max={maxPossiblePrice} 
                    step={10000}
                    value={tempPriceRange[1]} 
                    onChange={(e) => {
                      const newMax = parseInt(e.target.value);
                      // Đảm bảo giá trị max không nhỏ hơn giá trị min + MIN_PRICE_DIFFERENCE
                      if (newMax > tempPriceRange[0] + MIN_PRICE_DIFFERENCE) {
                        handleTempPriceRangeChange([tempPriceRange[0], newMax]);
                      }
                    }}
                    onMouseDown={() => {
                      setActiveThumb('max');
                      setIsDragging(true);
                    }}
                    onTouchStart={() => {
                      setActiveThumb('max');
                      setIsDragging(true);
                    }}
                    onMouseUp={() => {
                      setActiveThumb(null);
                      // Không reset isDragging ngay lập tức để có hiệu ứng đẹp hơn
                    }}
                    onTouchEnd={() => {
                      setActiveThumb(null);
                      // Không reset isDragging ngay lập tức để có hiệu ứng đẹp hơn
                    }}
                    onBlur={() => setActiveThumb(null)}
                    className="range-slider thumb-right absolute w-full h-3 opacity-0 cursor-pointer z-30" 
                    style={{ 
                      touchAction: 'none',
                      pointerEvents: 'auto',
                      top: '66px'
                    }}
                  />
                  
                  {/* Thumb indicators */}
                  <div 
                    className={`absolute w-8 h-8 rounded-full -mt-1 transform -translate-x-1/2 z-20 shadow-md cursor-grab 
                      transition-all duration-150 ${isDragging && activeThumb === 'min' ? 'scale-125 shadow-lg cursor-grabbing' : 'hover:scale-110'}`}
                    style={{ 
                      left: `${((tempPriceRange[0] - minPossiblePrice) / (maxPossiblePrice - minPossiblePrice)) * 100}%`,
                      top: '63px',
                      backgroundColor: isDragging && activeThumb === 'min' ? 'var(--primary-focus)' : 'var(--primary)',
                      border: '2px solid white'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  <div 
                    className={`absolute w-8 h-8 rounded-full -mt-1 transform -translate-x-1/2 z-20 shadow-md cursor-grab 
                      transition-all duration-150 ${isDragging && activeThumb === 'max' ? 'scale-125 shadow-lg cursor-grabbing' : 'hover:scale-110'}`}
                    style={{ 
                      left: `${((tempPriceRange[1] - minPossiblePrice) / (maxPossiblePrice - minPossiblePrice)) * 100}%`,
                      top: '63px',
                      backgroundColor: isDragging && activeThumb === 'max' ? 'var(--primary-focus)' : 'var(--primary)',
                      border: '2px solid white'
                    }}
                  >
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-1 h-4 bg-white rounded-full"></div>
                    </div>
                  </div>
                  
                  {/* Nhãn trạng thái kéo thả */}
                  {isDragging && (
                    <div className="text-xs text-primary-focus font-medium text-center mt-1 animate-pulse">
                      Thả để tiếp tục, nhấn "Áp dụng" để lọc
                    </div>
                  )}
                </div>
                
                {/* CSS cho thanh trượt */}
                <style jsx>{`
                  .range-slider {
                    -webkit-appearance: none;
                    appearance: none;
                    pointer-events: all;
                    position: absolute;
                    height: 0;
                    width: 100%;
                    outline: none;
                  }
                  .range-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: transparent;
                    cursor: grab;
                    z-index: 30;
                  }
                  .range-slider::-moz-range-thumb {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: transparent;
                    cursor: grab;
                    z-index: 30;
                    border: none;
                  }
                  .range-slider:active::-webkit-slider-thumb {
                    cursor: grabbing;
                  }
                  .range-slider:active::-moz-range-thumb {
                    cursor: grabbing;
                  }
                  .thumb-left {
                    z-index: 31;
                  }
                `}</style>
                
                {/* Số nhập giá */}
                <div className="flex items-center mt-6 gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      className={`input input-bordered w-full pr-14 text-sm transition-all ${isDragging && activeThumb === 'min' ? 'ring-2 ring-primary' : ''}`}
                      value={tempPriceRange[0]}
                      onChange={(e) => {
                        const newMin = parseInt(e.target.value) || 0;
                        if (newMin < tempPriceRange[1] - MIN_PRICE_DIFFERENCE) {
                          handleTempPriceRangeChange([newMin, tempPriceRange[1]]);
                          setIsDragging(true);
                          setActiveThumb('min');
                        }
                      }}
                      onBlur={() => setActiveThumb(null)}
                      min={minPossiblePrice}
                      max={tempPriceRange[1] - MIN_PRICE_DIFFERENCE}
                      step={10000}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      VNĐ
                    </span>
                  </div>
                  
                  <span className="text-gray-500">-</span>
                  
                  <div className="relative flex-1">
                    <input 
                      type="number" 
                      className={`input input-bordered w-full pr-14 text-sm transition-all ${isDragging && activeThumb === 'max' ? 'ring-2 ring-primary' : ''}`}
                      value={tempPriceRange[1]}
                      onChange={(e) => {
                        const newMax = parseInt(e.target.value) || maxPossiblePrice;
                        if (newMax > tempPriceRange[0] + MIN_PRICE_DIFFERENCE) {
                          handleTempPriceRangeChange([tempPriceRange[0], newMax]);
                          setIsDragging(true);
                          setActiveThumb('max');
                        }
                      }}
                      onBlur={() => setActiveThumb(null)}
                      min={tempPriceRange[0] + MIN_PRICE_DIFFERENCE}
                      max={maxPossiblePrice}
                      step={10000}
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      VNĐ
                    </span>
                  </div>
                  
                  <button 
                    className={`btn ${isDragging ? 'btn-primary animate-pulse' : 'btn-outline'} btn-sm`}
                    onClick={applyPriceRange}
                    disabled={JSON.stringify(tempPriceRange) === JSON.stringify(priceRange)}
                  >
                    Áp dụng
                  </button>
                </div>
                
                {/* Các mức giá phổ biến */}
                <div className="grid grid-cols-3 gap-2 mt-6">
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 0 && priceRange[1] === maxPossiblePrice ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([0, maxPossiblePrice])}
                  >
                    Tất cả
                  </button>
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 0 && priceRange[1] === 500000 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([0, 500000])}
                  >
                    Dưới 500k
                  </button>
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 500000 && priceRange[1] === 1000000 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([500000, 1000000])}
                  >
                    500k - 1tr
                  </button>
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 1000000 && priceRange[1] === 2000000 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([1000000, 2000000])}
                  >
                    1tr - 2tr
                  </button>
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 2000000 && priceRange[1] === 5000000 ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([2000000, 5000000])}
                  >
                    2tr - 5tr
                  </button>
                  <button 
                    className={`btn btn-sm ${priceRange[0] === 5000000 && priceRange[1] === maxPossiblePrice ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleQuickPriceRangeSelection([5000000, maxPossiblePrice])}
                  >
                    Trên 5tr
                  </button>
                </div>
              </div>
            </div>
            
            {/* Đánh giá */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Đánh giá</h3>
              <div className="space-y-2">
                <div className="form-control">
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      className="radio radio-sm radio-primary" 
                      checked={ratingFilter === null}
                      onChange={() => handleRatingFilterChange(null)}
                    />
                    <span className="ml-2">Tất cả</span>
                  </label>
                </div>
                
                {[4, 3, 2, 1].map(rating => (
                  <div key={rating} className="form-control">
                    <label className="cursor-pointer">
                      <input 
                        type="radio" 
                        className="radio radio-sm radio-primary" 
                        checked={ratingFilter === rating}
                        onChange={() => handleRatingFilterChange(rating)}
                      />
                      <span className="ml-2">
                        {rating}★ trở lên
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Thương hiệu */}
            <div className="mb-4">
              <h3 className="font-medium mb-2">Thương hiệu</h3>
              <div className="space-y-1">
                <div className="form-control">
                  <label className="cursor-pointer">
                    <input 
                      type="radio" 
                      className="radio radio-sm radio-primary" 
                      checked={selectedBrand === null}
                      onChange={() => handleBrandChange(null)}
                    />
                    <span className="ml-2">Tất cả</span>
                  </label>
                </div>
                
                {Array.isArray(brands) && brands.map(brand => (
                  <div key={brand} className="form-control">
                    <label className="cursor-pointer">
                      <input 
                        type="radio" 
                        className="radio radio-sm radio-primary" 
                        checked={selectedBrand === brand}
                        onChange={() => handleBrandChange(brand)}
                      />
                      <span className="ml-2">{brand}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Nút Reset */}
            <button 
              className="btn btn-outline w-full"
              onClick={resetAllFilters}
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
        
        {/* Main content */}
        <div className="lg:col-span-4">
          {/* Search and sort controls */}
          <div className="bg-base-100 p-4 rounded-lg shadow-sm mb-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <form onSubmit={handleSearchSubmit} className="flex-1">
                <div className="join w-full">
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm sản phẩm..." 
                    className="input input-bordered join-item w-full" 
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  <button className="btn join-item">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </div>
              </form>
              
              <div className="flex gap-2 items-center">
                <span className="whitespace-nowrap">Sắp xếp:</span>
                <select 
                  className="select select-bordered" 
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá: Thấp đến cao</option>
                  <option value="price_desc">Giá: Cao đến thấp</option>
                  <option value="popular">Phổ biến nhất</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Active filters */}
          {(selectedCategory || searchTerm || priceRange[0] > 0 || priceRange[1] < 10000000 || ratingFilter || selectedBrand) && (
            <div className="bg-base-100 p-4 rounded-lg shadow-sm mb-4">
              <div className="flex flex-wrap gap-2">
                <span className="font-medium">Bộ lọc đang áp dụng:</span>
                
                {selectedCategory && Array.isArray(categories) && (
                  <div className="badge badge-primary gap-1">
                    {categories.find(c => c.id === selectedCategory)?.name || 'Danh mục'}
                    <button onClick={() => handleCategoryChange(null)}>×</button>
                  </div>
                )}
                
                {searchTerm && (
                  <div className="badge badge-primary gap-1">
                    Tìm: {searchTerm}
                    <button onClick={() => {
                      setSearchTerm('');
                      updateFiltersInURL({ search: '' });
                    }}>×</button>
                  </div>
                )}
                
                {(priceRange[0] > 0 || priceRange[1] < 10000000) && (
                  <div className="badge badge-primary gap-1">
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceRange[0])} - 
                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceRange[1])}
                    <button onClick={() => handleTempPriceRangeChange([0, 10000000])}>×</button>
                  </div>
                )}
                
                {ratingFilter && (
                  <div className="badge badge-primary gap-1">
                    {ratingFilter}★ trở lên
                    <button onClick={() => handleRatingFilterChange(null)}>×</button>
                  </div>
                )}
                
                {selectedBrand && (
                  <div className="badge badge-primary gap-1">
                    {selectedBrand}
                    <button onClick={() => handleBrandChange(null)}>×</button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Product grid */}
          {products.length === 0 ? (
            <div className="bg-base-100 p-8 rounded-lg shadow-sm text-center">
              <h3 className="text-lg font-semibold">Không tìm thấy sản phẩm nào</h3>
              <p className="text-gray-500 mt-2">Hãy thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc</p>
              {(searchTerm || selectedCategory || ratingFilter || selectedBrand || priceRange[0] > 0 || priceRange[1] < 10000000) && (
                <button 
                  className="btn btn-outline mt-4"
                  onClick={resetAllFilters}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-2 text-sm text-gray-500">
                Hiển thị {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalProducts)} trên {totalProducts} sản phẩm
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow">
                    <figure className="h-48 overflow-hidden">
                      <img
                        src={product.imageUrl || 'https://placehold.co/300x200?text=No+Image'}
                        alt={product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </figure>
                    <div className="card-body">
                      <h2 className="card-title text-lg">{product.name}</h2>
                      <div className="badge badge-secondary">{product.category.name}</div>
                      <p className="text-primary font-bold mt-2">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                      </p>
                      <div className="card-actions justify-end mt-2">
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => router.push(`/products/${product.id}`)}
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-8">
              <div className="flex items-center gap-2">
                <span>Hiển thị:</span>
                <select 
                  className="select select-bordered select-sm" 
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))}
                >
                  <option value="12">12</option>
                  <option value="24">24</option>
                  <option value="48">48</option>
                </select>
              </div>
              
              <div className="join">
                <button 
                  className="join-item btn"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  «
                </button>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  // Tính toán trang hiển thị để luôn hiển thị 5 trang xung quanh trang hiện tại
                  let pageToShow;
                  if (totalPages <= 5) {
                    pageToShow = i + 1;
                  } else if (currentPage <= 3) {
                    pageToShow = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageToShow = totalPages - 4 + i;
                  } else {
                    pageToShow = currentPage - 2 + i;
                  }
                  
                  return (
                    <button 
                      key={pageToShow} 
                      className={`join-item btn ${currentPage === pageToShow ? 'btn-active' : ''}`}
                      onClick={() => handlePageChange(pageToShow)}
                    >
                      {pageToShow}
                    </button>
                  );
                })}
                
                <button 
                  className="join-item btn"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 
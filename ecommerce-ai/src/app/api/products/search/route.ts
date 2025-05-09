import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cache for search results to improve performance
const searchCache = new Map();
const CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes in milliseconds

// Function to generate cache key based on search parameters
function generateCacheKey(params) {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
}

// Mock data for fallback if database connection fails
const mockProducts = [
  {
    id: '1',
    name: 'iPhone 15 Pro Max',
    description: 'Smartphone cao cấp từ Apple với chip A17 Pro, màn hình Super Retina XDR 6.7 inch và hệ thống camera chuyên nghiệp.',
    price: 34990000,
    stock: 50,
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484428d1',
    categoryId: 'smartphone',
    category: {
      id: 'smartphone',
      name: 'Điện thoại'
    }
  },
  {
    id: '2',
    name: 'Samsung Galaxy S24 Ultra',
    description: 'Flagship của Samsung với bút S-Pen tích hợp, màn hình Dynamic AMOLED 2X và khả năng zoom quang học 10x.',
    price: 31990000,
    stock: 45,
    imageUrl: 'https://images.unsplash.com/photo-1707412911484-7b0440f2830a',
    categoryId: 'smartphone',
    category: {
      id: 'smartphone',
      name: 'Điện thoại'
    }
  },
  {
    id: '3',
    name: 'MacBook Pro 16 inch M3 Max',
    description: 'Laptop chuyên dụng cho sáng tạo nội dung với chip M3 Max, màn hình Liquid Retina XDR và thời lượng pin lên đến 22 giờ.',
    price: 75990000,
    stock: 20,
    imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4769a38c',
    categoryId: 'laptop',
    category: {
      id: 'laptop',
      name: 'Laptop'
    }
  },
  {
    id: '4',
    name: 'Dell XPS 15',
    description: 'Laptop cao cấp với màn hình OLED 4K, chip Intel Core i9 và card đồ họa NVIDIA RTX 4070.',
    price: 52990000,
    stock: 15,
    imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45',
    categoryId: 'laptop',
    category: {
      id: 'laptop',
      name: 'Laptop'
    }
  }
];

// Hàm tính điểm phù hợp cho kết quả tìm kiếm
function calculateRelevanceScore(product, query) {
  if (!query) return 0;
  
  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
  const normalizedQuery = normalizeString(queryLower);
  
  const nameLower = product.name.toLowerCase();
  const descriptionLower = product.description ? product.description.toLowerCase() : '';
  const normalizedName = normalizeString(nameLower);
  const normalizedDesc = normalizeString(descriptionLower);
  
  let score = 0;
  
  // Trùng khớp chính xác với tên (ưu tiên cao nhất)
  if (nameLower === queryLower) {
    score += 200; // Tăng điểm cho trùng khớp chính xác
  }
  
  // Tên bắt đầu bằng từ khóa (rất quan trọng)
  if (nameLower.startsWith(queryLower)) {
    score += 100; // Tăng điểm vì đây là một dấu hiệu quan trọng của sự liên quan
  }
  
  // Tên chứa từ khóa
  if (nameLower.includes(queryLower)) {
    score += 80; // Tăng điểm vì đây là dấu hiệu mạnh của sự liên quan
  }
  
  // Tìm kiếm với tên và từ khóa đã chuẩn hóa
  if (normalizedName === normalizedQuery) {
    score += 180; // Điểm cho trùng khớp chính xác sau khi chuẩn hóa
  }
  
  if (normalizedName.startsWith(normalizedQuery)) {
    score += 90; // Điểm cho bắt đầu bằng từ khóa sau khi chuẩn hóa
  }
  
  if (normalizedName.includes(normalizedQuery)) {
    score += 70; // Điểm cho chứa từ khóa sau khi chuẩn hóa
  }
  
  // Các từ trong tên trùng khớp với từ trong từ khóa
  const nameWords = nameLower.split(/\s+/).filter(w => w.length > 1);
  
  let totalMatchedWords = 0;
  let totalExactMatchedWords = 0;
  
  for (const queryWord of queryWords) {
    let wordMatched = false;
    let exactMatch = false;
    
    for (const nameWord of nameWords) {
      // Trùng khớp chính xác từng từ
      if (nameWord === queryWord) {
        score += 50; // Tăng điểm cho trùng khớp chính xác từng từ
        wordMatched = true;
        exactMatch = true;
      } 
      // Từ bắt đầu bằng từ khóa
      else if (nameWord.startsWith(queryWord)) {
        score += 40;
        wordMatched = true;
      }
      // Từ chứa từ khóa
      else if (nameWord.includes(queryWord)) {
        score += 30;
        wordMatched = true;
      }
      
      // So khớp từ đã chuẩn hóa
      const normalizedNameWord = normalizeString(nameWord);
      const normalizedQueryWord = normalizeString(queryWord);
      if (normalizedNameWord === normalizedQueryWord && !wordMatched) {
        score += 40;
        wordMatched = true;
      }
    }
    
    if (wordMatched) {
      totalMatchedWords++;
      if (exactMatch) {
        totalExactMatchedWords++;
      }
    }
  }
  
  // Thưởng điểm nếu tất cả từ khóa tìm kiếm đều khớp với tên sản phẩm
  if (queryWords.length > 1 && totalMatchedWords === queryWords.length) {
    score += 100; // Cộng thêm điểm nếu tất cả từ khóa đều khớp
  }
  
  // Thưởng điểm nếu tất cả các từ khóa đều khớp chính xác
  if (queryWords.length > 1 && totalExactMatchedWords === queryWords.length) {
    score += 120;
  }
  
  // Kiểm tra tỷ lệ khớp với từ khóa đầy đủ
  if (queryWords.length > 1) {
    const matchRatio = totalMatchedWords / queryWords.length;
    score += Math.round(matchRatio * 50); // Cộng điểm dựa trên tỷ lệ khớp
  }
  
  // Mô tả chứa từ khóa (ưu tiên thấp hơn)
  if (descriptionLower.includes(queryLower)) {
    score += 25; // Tăng điểm cho mô tả khớp với từ khóa
  }
  
  if (normalizedDesc.includes(normalizedQuery)) {
    score += 20;
  }
  
  // Kiểm tra các từ trong mô tả
  if (descriptionLower) {
    const descWords = descriptionLower.split(/\s+/).filter(w => w.length > 1);
    let descWordMatches = 0;
    
    for (const queryWord of queryWords) {
      for (const descWord of descWords) {
        if (descWord === queryWord || descWord.includes(queryWord)) {
          descWordMatches++;
          break;
        }
      }
    }
    
    // Thưởng điểm nếu nhiều từ khóa khớp với mô tả
    if (descWordMatches > 0) {
      score += Math.min(descWordMatches * 5, 25);
    }
  }
  
  // Thêm điểm cho sản phẩm còn hàng
  if (product.stock > 0) {
    score += 10; // Ưu tiên sản phẩm còn hàng cao hơn
  }
  
  // Thưởng điểm cho sản phẩm có rating cao (nếu có)
  if (product.avgRating) {
    score += Math.min(product.avgRating * 3, 15); // Tối đa 15 điểm cho rating cao nhất (5 sao)
  }
  
  // Thưởng điểm cho sản phẩm đã bán nhiều (nếu có)
  if (product.soldCount) {
    score += Math.min(product.soldCount / 10, 20); // Tối đa 20 điểm cho sản phẩm bán chạy
  }
  
  return score;
}

function normalizeString(str: string): string {
  if (!str) return '';
  
  // Loại bỏ dấu trong tiếng Việt và chuyển thành chữ thường
  let result = str.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  
  // Thay thế các ký tự đặc biệt bằng khoảng trắng
  result = result.replace(/[^\w\s]/g, ' ');
  
  // Thay thế các chuỗi khoảng trắng liên tiếp bằng một khoảng trắng
  result = result.replace(/\s+/g, ' ');
  
  // Loại bỏ khoảng trắng ở đầu và cuối chuỗi
  result = result.trim();
  
  // Xử lý các từ tiếng Việt phổ biến bị viết sai hoặc thiếu dấu
  const vietnameseReplacements = {
    'dien thoai': 'dienthoai',
    'smartphone': 'dienthoai',
    'may tinh': 'maytinh',
    'may tinh bang': 'maytinhbang',
    'laptop': 'maytinh',
    'tai nghe': 'tainghe',
    'am thanh': 'amthanh',
    'loa': 'amthanh',
    'phu kien': 'phukien',
    'man hinh': 'manhinh',
    'choi game': 'game',
    'gaming': 'game',
    'ban phim': 'banphim',
    'chuot': 'chuot',
    'pin': 'pin',
    'sac': 'pin',
  };
  
  // Áp dụng các quy tắc thay thế
  for (const [pattern, replacement] of Object.entries(vietnameseReplacements)) {
    // Thay thế từ đầy đủ
    if (result === pattern) {
      return replacement;
    }
    
    // Thay thế khi từ xuất hiện là một phần riêng biệt
    result = result.replace(new RegExp(`\\b${pattern}\\b`, 'g'), replacement);
  }
  
  return result;
}

export async function GET(request: Request) {
  try {
    console.log("Bắt đầu xử lý API search request");
    const { searchParams } = new URL(request.url);
    
    // Get search parameters
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category');
    const minPriceStr = searchParams.get('minPrice');
    const maxPriceStr = searchParams.get('maxPrice');
    const sort = searchParams.get('sort') || 'relevance';
    const pageStr = searchParams.get('page');
    const limitStr = searchParams.get('limit');
    const inStockStr = searchParams.get('inStock');
    const ratingStr = searchParams.get('rating');
    
    // Parse numeric parameters
    const page = pageStr ? parseInt(pageStr, 10) : 1;
    const limit = limitStr ? parseInt(limitStr, 10) : 12;
    const skip = (page - 1) * limit;
    
    const minPrice = minPriceStr ? parseInt(minPriceStr, 10) : undefined;
    const maxPrice = maxPriceStr ? parseInt(maxPriceStr, 10) : undefined;
    const inStock = inStockStr === 'true';
    const rating = ratingStr ? parseInt(ratingStr, 10) : undefined;
    
    // Define search parameters for cache key generation
    const searchParamsForCache = {
      query,
      category,
      minPrice,
      maxPrice,
      sort,
      page,
      limit,
      inStock: inStockStr,
      rating
    };
    
    console.log("Tham số tìm kiếm:", searchParamsForCache);
    
    // Bypass cache for larger datasets and admin queries
    const bypassCache = searchParams.get('bypass_cache') === 'true' || limit > 50;
    
    // Generate cache key
    const cacheKey = generateCacheKey(searchParamsForCache);
    
    // Check if we have a valid cached result
    if (!bypassCache && searchCache.has(cacheKey)) {
      const cachedData = searchCache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < CACHE_EXPIRY_TIME) {
        console.log("Sử dụng kết quả từ cache:", cacheKey);
        return NextResponse.json(cachedData.data);
      } else {
        // Cache expired, remove it
        searchCache.delete(cacheKey);
      }
    }
    
    console.log("USE_MOCK_DATA:", process.env.USE_MOCK_DATA);

    // Use mock data if explicitly configured in environment (always check process.env.USE_MOCK_DATA directly)
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log("Đang sử dụng mock data theo cấu hình");
      
      // Use timeout to simulate network delay for development testing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let filteredProducts = [...mockProducts];
      
      // Lọc theo tên và mô tả nếu có query
      if (query) {
        const normalizedQuery = normalizeString(query.toLowerCase());
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        
        filteredProducts = mockProducts.filter(product => {
          const nameLower = product.name.toLowerCase();
          const descriptionLower = product.description ? product.description.toLowerCase() : '';
          const normalizedName = normalizeString(nameLower);
          const normalizedDesc = normalizeString(descriptionLower);
          
          // Tạo mảng các điều kiện kiểm tra
          const conditions = [];
          
          // Kiểm tra tên sản phẩm (ưu tiên cao nhất)
          conditions.push(
            // Trùng khớp chính xác tên
            nameLower === query.toLowerCase(),
            // Tên bắt đầu bằng query
            nameLower.startsWith(query.toLowerCase()),
            // Tên chứa query
            nameLower.includes(query.toLowerCase()),
            // Tên sau khi chuẩn hóa trùng khớp query
            normalizedName === normalizedQuery,
            // Tên sau khi chuẩn hóa bắt đầu bằng query
            normalizedName.startsWith(normalizedQuery),
            // Tên sau khi chuẩn hóa chứa query
            normalizedName.includes(normalizedQuery)
          );
          
          // Kiểm tra mô tả sản phẩm (ưu tiên thấp hơn)
          conditions.push(
            // Mô tả chứa query
            descriptionLower.includes(query.toLowerCase()),
            // Mô tả sau khi chuẩn hóa chứa query
            normalizedDesc.includes(normalizedQuery)
          );
          
          // Kiểm tra từng từ trong query
          for (const word of queryWords) {
            if (word.length > 1) {
              const normalizedWord = normalizeString(word);
              
              // Kiểm tra từng từ trong tên
              const nameWords = nameLower.split(/\s+/).filter(w => w.length > 1);
              for (const nameWord of nameWords) {
                const normalizedNameWord = normalizeString(nameWord);
                conditions.push(
                  // Từ trong tên trùng khớp với từ trong query
                  nameWord === word,
                  // Từ trong tên bắt đầu bằng từ trong query
                  nameWord.startsWith(word),
                  // Từ trong tên chứa từ trong query
                  nameWord.includes(word),
                  // Từ trong tên sau khi chuẩn hóa trùng khớp với từ trong query
                  normalizedNameWord === normalizedWord,
                  // Từ trong tên sau khi chuẩn hóa bắt đầu bằng từ trong query
                  normalizedNameWord.startsWith(normalizedWord)
                );
              }
              
              // Kiểm tra từng từ trong mô tả
              if (descriptionLower) {
                const descWords = descriptionLower.split(/\s+/).filter(w => w.length > 1);
                for (const descWord of descWords) {
                  conditions.push(
                    // Từ trong mô tả trùng khớp với từ trong query
                    descWord === word,
                    // Từ trong mô tả chứa từ trong query
                    descWord.includes(word)
                  );
                }
              }
            }
          }
          
          // Kiểm tra danh mục sản phẩm (nếu có)
          if (product.category && product.category.name) {
            const categoryName = product.category.name.toLowerCase();
            conditions.push(
              // Tên danh mục chứa query
              categoryName.includes(query.toLowerCase()),
              // Tên danh mục sau khi chuẩn hóa chứa query
              normalizeString(categoryName).includes(normalizedQuery)
            );
          }
          
          // Trả về true nếu thỏa mãn bất kỳ điều kiện nào
          return conditions.some(condition => condition === true);
        });
        
        // Tính điểm phù hợp cho mỗi sản phẩm
        filteredProducts.forEach(product => {
          product.relevanceScore = calculateRelevanceScore(product, query);
        });
      }
      
      // Lọc theo danh mục
      if (category) {
        filteredProducts = filteredProducts.filter(p => p.categoryId === category);
      }
      
      // Lọc theo khoảng giá
      if (minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price >= minPrice);
      }
      
      if (maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
      }
      
      // Lọc theo tình trạng còn hàng
      if (inStock) {
        filteredProducts = filteredProducts.filter(p => p.stock > 0);
      }
      
      // Lọc theo đánh giá
      if (rating !== undefined) {
        // Giả lập đánh giá cho mock data
        filteredProducts = filteredProducts.filter(p => {
          // Giả định có trường avgRating hoặc tính toán thử nghiệm
          const mockRating = Math.floor(Math.random() * 5) + 1;
          return mockRating >= rating;
        });
      }
      
      // Sắp xếp theo các tiêu chí
      switch (sort) {
        case 'price_asc':
          filteredProducts.sort((a, b) => a.price - b.price);
          break;
        case 'price_desc':
          filteredProducts.sort((a, b) => b.price - a.price);
          break;
        case 'newest':
          // Giả lập sắp xếp theo thời gian tạo mới nhất
          filteredProducts.reverse();
          break;
        case 'popular':
          // Giả lập sản phẩm phổ biến
          filteredProducts.sort(() => Math.random() - 0.5);
          break;
        case 'relevance':
        default:
          // Sắp xếp theo điểm phù hợp nếu có query
          if (query) {
            filteredProducts.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
          }
          break;
      }
      
      // Phân trang kết quả
      const startIndex = skip;
      const endIndex = skip + limit;
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      console.log(`Kết quả tìm kiếm: ${paginatedProducts.length}/${filteredProducts.length} sản phẩm`);
      
      // Cache the results
      if (!bypassCache) {
        searchCache.set(cacheKey, {
          data: {
            products: paginatedProducts,
            total: filteredProducts.length,
            page,
            limit,
            totalPages: Math.ceil(filteredProducts.length / limit)
          },
          timestamp: Date.now()
        });
      }
      
      return NextResponse.json({
        products: paginatedProducts,
        total: filteredProducts.length,
        page,
        limit,
        totalPages: Math.ceil(filteredProducts.length / limit)
      });
    } 
    else {
      // Sử dụng Prisma để tìm kiếm trong database thực
      console.log("Đang tìm kiếm trong database thực với Prisma");
      
      // Xây dựng điều kiện tìm kiếm
      const where: any = { };
      
      // Nếu có query, thêm điều kiện tìm kiếm
      if (query && query.trim() !== '') {
        const normalizedQuery = normalizeString(query.toLowerCase());
        const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);
        
        // Mảng chứa tất cả các điều kiện tìm kiếm
        const searchConditions = [];
        
        // Điều kiện tìm kiếm chính xác và ưu tiên cao
        searchConditions.push(
          // Tìm kiếm chính xác trong tên (ưu tiên cao nhất)
          { name: { equals: query.toLowerCase() } },
          // Tìm kiếm tên bắt đầu bằng query (ưu tiên cao)
          { name: { startsWith: query.toLowerCase() } },
          // Tìm kiếm tên chứa query (ưu tiên trung bình)
          { name: { contains: query.toLowerCase() } }
        );
        
        // Tìm kiếm từng từ trong query trong tên và mô tả
        for (const word of queryWords) {
          if (word.length > 1) {
            searchConditions.push(
              { name: { contains: word.toLowerCase() } },
              { description: { contains: word.toLowerCase() } }
            );
          }
        }
        
        // Tìm kiếm cụm từ trong mô tả (ưu tiên thấp hơn)
        searchConditions.push({ description: { contains: query.toLowerCase() } });
        
        // Tạo điều kiện OR cho tất cả các điều kiện tìm kiếm
        where.OR = searchConditions;
        
        // Thêm tìm kiếm dựa trên mã sản phẩm hoặc SKU nếu có
        if (/^[a-zA-Z0-9-_]+$/.test(query)) {
          where.OR.push(
            { sku: { contains: query.toUpperCase() } },
            { productCode: { contains: query.toUpperCase() } }
          );
        }
        
        // Thêm tìm kiếm theo tên danh mục nếu phù hợp
        where.OR.push(
          { 
            category: {
              name: {
                contains: query.toLowerCase()
              }
            }
          }
        );
        
        // Thêm tìm kiếm theo thương hiệu nếu phù hợp
        where.OR.push(
          {
            brand: {
              name: {
                contains: query.toLowerCase()
              }
            }
          }
        );
        
        // Nếu có từ khóa về giá trong query, thử áp dụng lọc giá
        if (
          query.includes('giá rẻ') || 
          query.includes('rẻ') || 
          query.includes('thấp') ||
          query.includes('tiết kiệm')
        ) {
          // Tạo điều kiện lọc giá thấp (có thể điều chỉnh ngưỡng giá)
          where.OR.push({ price: { lt: 5000000 } });
        }
        
        if (
          query.includes('cao cấp') || 
          query.includes('đắt') || 
          query.includes('premium') ||
          query.includes('sang trọng')
        ) {
          // Tạo điều kiện lọc giá cao (có thể điều chỉnh ngưỡng giá)
          where.OR.push({ price: { gt: 20000000 } });
        }
      }
      
      // Lọc theo danh mục nếu có
      if (category) {
        where.categoryId = category;
      }
      
      // Lọc theo khoảng giá nếu có
      if (minPrice !== undefined || maxPrice !== undefined) {
        where.price = {};
        
        if (minPrice !== undefined) {
          where.price.gte = minPrice;
        }
        
        if (maxPrice !== undefined) {
          where.price.lte = maxPrice;
        }
      }
      
      // Lọc theo tình trạng còn hàng
      if (inStock) {
        where.stock = {
          gt: 0
        };
      }
      
      // Lọc theo đánh giá nếu có
      if (rating !== undefined) {
        where.avgRating = {
          gte: rating
        };
      }
      
      // Thiết lập điều kiện sắp xếp
      let orderBy: any = {};
      
      switch (sort) {
        case 'price_asc':
          orderBy = { price: 'asc' };
          break;
        case 'price_desc':
          orderBy = { price: 'desc' };
          break;
        case 'newest':
          orderBy = { createdAt: 'desc' };
          break;
        case 'popular':
          orderBy = { createdAt: 'desc' }; // Đơn giản hóa, sau này có thể thay bằng lượt xem
          break;
        case 'relevance':
        default:
          // Mặc định sắp xếp theo thời gian tạo, sau đó sắp xếp lại theo điểm phù hợp
          orderBy = { createdAt: 'desc' };
          break;
      }
      
      try {
        // Lấy sản phẩm từ database
        console.log("Truy vấn Prisma với where:", JSON.stringify(where));
        console.log("Truy vấn Prisma với orderBy:", JSON.stringify(orderBy));
        
        // Thử truy vấn Prisma với xử lý lỗi tốt hơn
        let products = [];
        let total = 0;
        
        try {
          products = await prisma.product.findMany({
            where,
            skip,
            take: limit,
            orderBy,
            include: {
              category: true,
              images: {
                take: 1, // Chỉ lấy 1 ảnh đầu tiên nếu có nhiều
              },
            },
          });
          
          total = await prisma.product.count({ where });
        } catch (prismaError) {
          console.error('Lỗi Prisma cụ thể:', prismaError);
          
          // Kiểm tra xem có phải lỗi về cú pháp truy vấn không
          if (prismaError.message && (
              prismaError.message.includes('Unknown argument') || 
              prismaError.message.includes('mode') ||
              prismaError.message.includes('insensitive')
          )) {
            // Thử truy vấn với điều kiện đơn giản hơn
            console.log("Thử lại với truy vấn đơn giản hơn");
            
            // Xây dựng truy vấn đơn giản
            const simpleWhere: any = {};
            if (query && query.trim() !== '') {
              simpleWhere.OR = [
                { name: { contains: query.toLowerCase() } },
                { description: { contains: query.toLowerCase() } }
              ];
            }
            
            if (category) {
              simpleWhere.categoryId = category;
            }
            
            // Thử lại truy vấn với điều kiện đơn giản
            try {
              products = await prisma.product.findMany({
                where: simpleWhere,
                skip,
                take: limit,
                orderBy,
                include: {
                  category: true,
                  images: {
                    take: 1,
                  },
                },
              });
              
              total = await prisma.product.count({ where: simpleWhere });
            } catch (retryError) {
              console.error('Vẫn lỗi sau khi thử lại với truy vấn đơn giản:', retryError);
              throw retryError; // Ném lỗi để xử lý ở catch bên ngoài
            }
          } else {
            throw prismaError; // Ném lỗi để xử lý ở catch bên ngoài
          }
        }
        
        console.log(`Đã tìm thấy ${products.length} sản phẩm từ database`);
        
        // Tính điểm phù hợp cho mỗi sản phẩm nếu có query và sắp xếp theo relevance
        if (query && sort === 'relevance') {
          products.forEach(product => {
            product.relevanceScore = calculateRelevanceScore(product, query);
          });
          
          // Sắp xếp lại theo điểm phù hợp
          products.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
        }
        
        // Nếu query không rỗng, lưu lại để gợi ý trong tương lai
        if (query && query.trim() !== '') {
          try {
            // Đơn giản hóa, trong thực tế bạn sẽ liên kết với người dùng thực
            await prisma.searchQuery.create({
              data: {
                query: query.trim(),
                userId: 'anonymous' // Trong thực tế, đây sẽ là ID người dùng thực
              }
            });
          } catch (err) {
            // Chỉ ghi log lỗi nhưng không làm fail quá trình tìm kiếm
            console.error('Lỗi khi lưu query tìm kiếm:', err);
          }
        }
        
        // Cache the results
        if (!bypassCache) {
          searchCache.set(cacheKey, {
            data: {
              products,
              total,
              page,
              limit,
              totalPages: Math.ceil(total / limit)
            },
            timestamp: Date.now()
          });
        }
        
        return NextResponse.json({
          products,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        });
      } catch (dbError) {
        console.error('Lỗi database:', dbError);
        
        // Always check process.env.ENABLE_FALLBACK_ON_ERROR directly
        if (process.env.ENABLE_FALLBACK_ON_ERROR === 'true') {
          console.log("Chuyển sang sử dụng dữ liệu mẫu do lỗi database (theo cấu hình)");
          
          // Use mock data silently without telling the user
          let filteredProducts = [...mockProducts];
          
          // Apply filters and sorting from the original mock data logic
          if (query) {
            const normalizedQuery = normalizeString(query.toLowerCase());
            const queryWords = query.toLowerCase().split(/\s+/).filter(word => word.length > 1);
            
            filteredProducts = mockProducts.filter(product => {
              // Sử dụng logic tìm kiếm đã cải tiến
              const nameLower = product.name.toLowerCase();
              const descriptionLower = product.description ? product.description.toLowerCase() : '';
              const normalizedName = normalizeString(nameLower);
              const normalizedDesc = normalizeString(descriptionLower);
              
              // Tạo mảng các điều kiện kiểm tra
              const conditions = [];
              
              // Kiểm tra tên sản phẩm (ưu tiên cao nhất)
              conditions.push(
                // Trùng khớp chính xác tên
                nameLower === query.toLowerCase(),
                // Tên bắt đầu bằng query
                nameLower.startsWith(query.toLowerCase()),
                // Tên chứa query
                nameLower.includes(query.toLowerCase()),
                // Tên sau khi chuẩn hóa trùng khớp query
                normalizedName === normalizedQuery,
                // Tên sau khi chuẩn hóa bắt đầu bằng query
                normalizedName.startsWith(normalizedQuery),
                // Tên sau khi chuẩn hóa chứa query
                normalizedName.includes(normalizedQuery)
              );
              
              // Kiểm tra mô tả sản phẩm (ưu tiên thấp hơn)
              conditions.push(
                // Mô tả chứa query
                descriptionLower.includes(query.toLowerCase()),
                // Mô tả sau khi chuẩn hóa chứa query
                normalizedDesc.includes(normalizedQuery)
              );
              
              // Trả về true nếu thỏa mãn bất kỳ điều kiện nào
              return conditions.some(condition => condition === true);
            });
            
            // Tính điểm phù hợp cho mỗi sản phẩm
            filteredProducts.forEach(product => {
              product.relevanceScore = calculateRelevanceScore(product, query);
            });
          }
          
          // Lọc theo danh mục và các điều kiện khác
          if (category) {
            filteredProducts = filteredProducts.filter(p => p.categoryId === category);
          }
          
          if (minPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price >= minPrice);
          }
          
          if (maxPrice !== undefined) {
            filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
          }
          
          if (inStock) {
            filteredProducts = filteredProducts.filter(p => p.stock > 0);
          }
          
          // Sắp xếp theo các tiêu chí
          switch (sort) {
            case 'price_asc':
              filteredProducts.sort((a, b) => a.price - b.price);
              break;
            case 'price_desc':
              filteredProducts.sort((a, b) => b.price - a.price);
              break;
            case 'newest':
              // Giả lập sắp xếp theo thời gian tạo mới nhất
              filteredProducts.reverse();
              break;
            case 'popular':
              // Giả lập sản phẩm phổ biến
              filteredProducts.sort(() => Math.random() - 0.5);
              break;
            case 'relevance':
            default:
              // Sắp xếp theo điểm phù hợp nếu có query
              if (query) {
                filteredProducts.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
              }
              break;
          }
          
          // Phân trang kết quả
          const startIndex = skip;
          const endIndex = skip + limit;
          const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
          
          // Cache the results
          if (!bypassCache) {
            searchCache.set(cacheKey, {
              data: {
                products: paginatedProducts,
                total: filteredProducts.length,
                page,
                limit,
                totalPages: Math.ceil(filteredProducts.length / limit)
              },
              timestamp: Date.now()
            });
          }
          
          return NextResponse.json({
            products: paginatedProducts,
            total: filteredProducts.length,
            page,
            limit,
            totalPages: Math.ceil(filteredProducts.length / limit)
          });
        }
        
        // Return specific database error message
        return NextResponse.json(
          { 
            error: 'Database Error',
            message: 'Lỗi kết nối cơ sở dữ liệu: ' + (dbError.message || 'Không xác định'),
            products: [],
            total: 0,
            page,
            limit,
            totalPages: 0
          },
          { status: 500 }
        );
      }
    }
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: 'Có lỗi xảy ra khi tìm kiếm. Vui lòng thử lại sau.',
        products: [],
        total: 0,
        page: 1,
        limit: 12,
        totalPages: 0
      },
      { status: 500 }
    );
  }
}

// Utility function to clean up expired cache entries (can be called periodically)
export function cleanupCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of searchCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY_TIME) {
      searchCache.delete(key);
    }
  }
} 
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Cache cho các gợi ý tìm kiếm để tăng tốc độ phản hồi
const suggestionsCache = new Map();
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 phút

// Mock suggestions for fallback
const mockSuggestions = [
  'iPhone',
  'Samsung Galaxy',
  'MacBook Pro',
  'Dell XPS',
  'iPad',
  'Apple Watch',
  'Điện thoại',
  'Laptop gaming',
  'Tai nghe không dây',
  'Máy tính bảng'
];

// Danh sách từ khóa phổ biến có thể gợi ý
const popularKeywords = [
  'smartphone', 'điện thoại', 'laptop', 'máy tính', 'tai nghe', 'máy ảnh', 
  'apple', 'samsung', 'xiaomi', 'oppo', 'vivo', 'asus', 'dell', 'hp', 'lenovo',
  'gaming', 'chơi game', 'bluetooth', 'không dây', 'pin trâu', 'sạc nhanh', 
  'camera', 'chụp ảnh', 'màn hình', 'bàn phím', 'chuột', 'loa', 'âm thanh',
  'giá rẻ', 'cao cấp', 'mỏng nhẹ', 'chống nước', 'chống va đập'
];

// Các từ khóa xu hướng hot (có thể cập nhật định kỳ)
const trendingKeywords = [
  'iPhone 15',
  'Galaxy S24',
  'MacBook M3',
  'Tai nghe AirPods',
  'Laptop gaming',
  'Màn hình gaming',
  'Bàn phím cơ'
];

// Danh sách các sản phẩm nổi bật (có thể cập nhật từ database)
const featuredProducts = [
  'iPhone 15 Pro Max',
  'Samsung Galaxy S24 Ultra',
  'MacBook Pro 16 inch',
  'iPad Pro M2',
  'Apple Watch Series 9',
  'AirPods Pro 2',
  'Sony WH-1000XM5'
];

// Tính điểm phù hợp cho các gợi ý
function scoreSuggestion(suggestion, query) {
  const suggestionLower = suggestion.toLowerCase();
  const queryLower = query.toLowerCase();
  
  let score = 0;
  
  // Trùng khớp chính xác
  if (suggestionLower === queryLower) {
    score += 1000; // Khó xảy ra nhưng nếu trùng khớp hoàn toàn thì điểm cao nhất
    return score; // Trả về ngay vì đây là trường hợp tốt nhất
  }
  
  // Gợi ý bắt đầu bằng truy vấn (ưu tiên cao)
  if (suggestionLower.startsWith(queryLower)) {
    score += 300; // Tăng điểm cho trường hợp này vì rất có giá trị
    
    // Độ chênh lệch chiều dài - ưu tiên gợi ý ngắn gọn nhưng hoàn chỉnh hơn
    const lengthDifference = suggestionLower.length - queryLower.length;
    if (lengthDifference > 0) {
      if (lengthDifference < 10) {
        score += (10 - lengthDifference) * 10; // Tăng điểm cho các gợi ý ngắn gọn
      } else {
        score -= Math.min(lengthDifference - 10, 50); // Trừ điểm nếu quá dài
      }
    }
  }
  
  // Trùng khớp từ đầu tiên trong gợi ý với từ khóa
  const suggestionWords = suggestionLower.split(/\s+/);
  if (suggestionWords.length > 0 && suggestionWords[0].startsWith(queryLower)) {
    score += 200;
  }
  
  // Gợi ý chứa truy vấn (không phải ở đầu)
  if (suggestionLower.includes(queryLower) && !suggestionLower.startsWith(queryLower)) {
    score += 150;
    
    // Vị trí xuất hiện của từ khóa (càng gần đầu càng tốt)
    const position = suggestionLower.indexOf(queryLower);
    score += Math.max(0, 50 - position); // Tối đa 50 điểm cho vị trí
  }
  
  // Kiểm tra từng từ trong query có khớp với từng từ trong gợi ý
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 1);
  let matchedWords = 0;
  
  for (const queryWord of queryWords) {
    for (const suggestionWord of suggestionWords) {
      if (suggestionWord === queryWord) {
        score += 40;
        matchedWords++;
        break;
      } else if (suggestionWord.startsWith(queryWord)) {
        score += 30;
        matchedWords++;
        break;
      } else if (suggestionWord.includes(queryWord) && queryWord.length > 2) {
        score += 20;
        matchedWords++;
        break;
      }
    }
  }
  
  // Thưởng điểm nếu tất cả từ trong query đều khớp
  if (queryWords.length > 1 && matchedWords === queryWords.length) {
    score += 100;
  }
  
  // Cộng điểm cho từ khóa phổ biến
  if (popularKeywords.some(keyword => suggestionLower.includes(keyword.toLowerCase()))) {
    score += 40;
  }
  
  // Cộng điểm cho từ khóa xu hướng
  if (trendingKeywords.some(keyword => suggestionLower.includes(keyword.toLowerCase()))) {
    score += 80;
  }
  
  // Cộng điểm cho sản phẩm nổi bật
  if (featuredProducts.some(product => suggestionLower === product.toLowerCase())) {
    score += 100;
  }
  
  // Trừ điểm cho gợi ý quá dài
  if (suggestionLower.length > 30) {
    score -= (suggestionLower.length - 30) * 2;
  } else if (suggestionLower.length < 5) {
    score -= (5 - suggestionLower.length) * 10; // Trừ điểm cho gợi ý quá ngắn
  }
  
  // Trừ điểm cho gợi ý có quá nhiều từ
  if (suggestionWords.length > 6) {
    score -= (suggestionWords.length - 6) * 10;
  }
  
  // Ưu tiên các gợi ý có độ dài từ vừa phải
  const averageWordLength = suggestionLower.length / Math.max(1, suggestionWords.length);
  if (averageWordLength > 15) {
    score -= (averageWordLength - 15) * 5;
  }
  
  return score;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    
    // Kiểm tra cache trước
    const cacheKey = query.toLowerCase().trim();
    if (suggestionsCache.has(cacheKey)) {
      const cachedData = suggestionsCache.get(cacheKey);
      if (Date.now() - cachedData.timestamp < CACHE_EXPIRY_TIME) {
        console.log("Sử dụng kết quả gợi ý từ cache:", cacheKey);
        return NextResponse.json(cachedData.data);
      } else {
        // Cache expired, remove it
        suggestionsCache.delete(cacheKey);
      }
    }
    
    if (!query || query.trim().length < 2) {
      // Nếu không có từ khóa hoặc từ khóa quá ngắn, trả về gợi ý xu hướng hàng đầu
      try {
        const topSearches = await prisma.searchQuery.findMany({
          orderBy: {
            createdAt: 'desc'
          },
          distinct: ['query'],
          take: 7
        });
        
        const trendingSearches = topSearches.map(s => s.query);
        
        // Kết hợp với từ khóa trending
        const combinedTrending = [...new Set([...trendingSearches, ...trendingKeywords])].slice(0, 10);
        
        const result = { suggestions: combinedTrending.length > 0 ? combinedTrending : mockSuggestions.slice(0, 7) };
        
        // Cache kết quả
        suggestionsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return NextResponse.json(result);
      } catch (err) {
        const result = { suggestions: mockSuggestions.slice(0, 7) };
        
        // Cache kết quả
        suggestionsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return NextResponse.json(result);
      }
    }
    
    try {
      // Find products that match the query
      const products = await prisma.product.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { name: { startsWith: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: {
          name: true,
          category: {
            select: {
              name: true
            }
          }
        },
        take: 20, // Tăng số lượng để có nhiều lựa chọn hơn trước khi lọc
      });
      
      // Extract unique suggestion terms from product names
      const productNames = [...new Set(products.map(p => p.name))];
      
      // Thêm từ gợi ý từ danh mục
      const categoryNames = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
      const categoryQueries = categoryNames.map(cat => `${query} ${cat}`);
      
      try {
        // Get popular search queries that match the input
        const popularSearches = await prisma.searchQuery.findMany({
          where: {
            query: {
              contains: query,
              mode: 'insensitive'
            }
          },
          select: {
            query: true,
            count: true
          },
          orderBy: [
            { count: 'desc' },
            { createdAt: 'desc' }
          ],
          distinct: ['query'],
          take: 15
        });
        
        // Combine product names and popular searches
        const searchTerms = popularSearches.map(s => s.query);
        
        // Thêm từ khóa phổ biến và biến thể của truy vấn
        const variants = popularKeywords
          .filter(keyword => keyword.includes(query) || query.includes(keyword))
          .map(keyword => query.includes(keyword) ? query : `${query} ${keyword}`)
          .slice(0, 5);
        
        // Thêm từ khóa trending phù hợp
        const relevantTrending = trendingKeywords
          .filter(keyword => keyword.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 3);
        
        // Thêm gợi ý "Mua [query]" nếu query có ý nghĩa
        const buyingSuggestions = query.length > 3 ? [`Mua ${query}`] : [];
        
        // Merge and remove duplicates
        let allSuggestions = [
          ...new Set([
            ...productNames, 
            ...searchTerms, 
            ...categoryQueries, 
            ...variants,
            ...relevantTrending,
            ...buyingSuggestions
          ])
        ];
        
        // Lọc và xếp hạng các gợi ý theo điểm số phù hợp
        const scoredSuggestions = allSuggestions
          .map(suggestion => ({
            text: suggestion,
            score: scoreSuggestion(suggestion, query)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(item => item.text);
        
        const result = { suggestions: scoredSuggestions };
        
        // Cache kết quả
        suggestionsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return NextResponse.json(result);
      } catch (err) {
        // If there's an error with searchQuery, just return product names
        console.error('Error fetching search queries:', err);
        
        // Fallback với chỉ tên sản phẩm
        const scoredSuggestions = productNames
          .map(suggestion => ({
            text: suggestion,
            score: scoreSuggestion(suggestion, query)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 10)
          .map(item => item.text);
        
        const result = { suggestions: scoredSuggestions };
        
        // Cache kết quả
        suggestionsCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        return NextResponse.json(result);
      }
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Filter mock suggestions based on query
      const filteredSuggestions = mockSuggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(query.toLowerCase())
      );
      
      // Thêm biến thể từ danh sách từ khóa phổ biến
      const variants = popularKeywords
        .filter(keyword => keyword.includes(query) || query.includes(keyword))
        .map(keyword => query.includes(keyword) ? query : `${query} ${keyword}`)
        .slice(0, 3);
      
      // Kết hợp và sắp xếp theo điểm số
      const combinedSuggestions = [...new Set([...filteredSuggestions, ...variants])];
      const scoredSuggestions = combinedSuggestions
        .map(suggestion => ({
          text: suggestion,
          score: scoreSuggestion(suggestion, query)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.text)
        .slice(0, 10);
      
      const result = { suggestions: scoredSuggestions };
      
      // Cache kết quả
      suggestionsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Suggestions error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', suggestions: [] },
      { status: 500 }
    );
  }
}

// Utility function to clean up expired cache entries
export function cleanupSuggestionsCache() {
  const now = Date.now();
  for (const [key, { timestamp }] of suggestionsCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY_TIME) {
      suggestionsCache.delete(key);
    }
  }
} 
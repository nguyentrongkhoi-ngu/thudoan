import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// API để lấy khoảng giá của sản phẩm
export async function GET(req: NextRequest) {
  try {
    // Lấy các tham số truy vấn từ URL
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    
    // Xây dựng điều kiện tìm kiếm
    let where: any = {};
    
    if (category) {
      where.categoryId = category;
    }
    
    // Tìm sản phẩm có giá thấp nhất
    const minPriceProduct = await prisma.product.findFirst({
      where,
      orderBy: {
        price: 'asc'
      },
      select: {
        price: true
      }
    });
    
    // Tìm sản phẩm có giá cao nhất
    const maxPriceProduct = await prisma.product.findFirst({
      where,
      orderBy: {
        price: 'desc'
      },
      select: {
        price: true
      }
    });
    
    const minPrice = minPriceProduct?.price || 0;
    const maxPrice = maxPriceProduct?.price || 10000000;
    
    // Tính phân phối giá theo khoảng
    const NUM_BUCKETS = 20; // số khoảng giá
    const bucketSize = (maxPrice - minPrice) / NUM_BUCKETS;
    
    // Tạo mảng chứa các khoảng giá
    const distribution: { price: number, count: number }[] = [];
    
    // Trường hợp có ít sản phẩm hoặc tất cả sản phẩm có cùng giá
    if (bucketSize <= 0) {
      // Lấy tổng số sản phẩm
      const count = await prisma.product.count({ where });
      distribution.push({ price: minPrice, count });
    } else {
      // Lấy tất cả sản phẩm để phân phối
      const products = await prisma.product.findMany({
        where,
        select: {
          price: true,
        },
      });
      
      // Tạo các bucket (khoảng giá)
      for (let i = 0; i < NUM_BUCKETS; i++) {
        const bucketPrice = minPrice + (i * bucketSize);
        const nextBucketPrice = bucketPrice + bucketSize;
        
        // Đếm số sản phẩm trong khoảng giá này
        const count = products.filter(
          p => p.price >= bucketPrice && (i === NUM_BUCKETS - 1 ? p.price <= nextBucketPrice : p.price < nextBucketPrice)
        ).length;
        
        distribution.push({
          price: Math.round(bucketPrice), // Làm tròn giá trị để dễ hiển thị
          count
        });
      }
    }
    
    // Trả về khoảng giá và phân phối
    return NextResponse.json({
      min: minPrice,
      max: maxPrice,
      distribution
    });
  } catch (error) {
    console.error("Lỗi khi lấy khoảng giá sản phẩm:", error);
    return NextResponse.json(
      { 
        min: 0,
        max: 10000000,
        distribution: [],
        error: "Đã xảy ra lỗi khi lấy khoảng giá sản phẩm", 
        message: (error as Error).message 
      },
      { status: 500 }
    );
  }
} 
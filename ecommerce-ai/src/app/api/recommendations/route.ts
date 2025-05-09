import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// API để lấy các sản phẩm được gợi ý cho người dùng
export async function GET(req: NextRequest) {
  try {
    // Lấy tham số limit từ URL, mặc định là 10
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Nếu không có người dùng, trả về các sản phẩm phổ biến nhất
    if (!userId) {
      const popularProducts = await prisma.product.findMany({
        take: limit,
        orderBy: {
          productViews: {
            _count: "desc",
          },
        },
        include: {
          category: true,
        },
      });
      
      return NextResponse.json({
        products: popularProducts,
        type: "popular",
      });
    }
    
    // 1. Lấy các sản phẩm mà người dùng đã xem
    const viewedProducts = await prisma.productView.findMany({
      where: {
        userId,
      },
      orderBy: {
        viewCount: "desc",
      },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });
    
    // 2. Lấy danh mục được xem nhiều nhất
    const categoryViews = new Map();
    
    viewedProducts.forEach((view) => {
      const categoryId = view.product.categoryId;
      categoryViews.set(
        categoryId,
        (categoryViews.get(categoryId) || 0) + view.viewCount
      );
    });
    
    // Sắp xếp danh mục theo số lần xem
    const topCategories = Array.from(categoryViews.entries())
      .sort((a, b) => b[1] - a[1])
      .map((entry) => entry[0]);
    
    // 3. Nếu người dùng đã xem ít nhất một sản phẩm, gợi ý các sản phẩm tương tự
    if (viewedProducts.length > 0) {
      // Danh sách ID sản phẩm đã xem
      const viewedProductIds = viewedProducts.map((view) => view.productId);
      
      // Tìm các sản phẩm tương tự trong cùng danh mục nhưng chưa xem
      let recommendedProducts = [];
      
      if (topCategories.length > 0) {
        recommendedProducts = await prisma.product.findMany({
          where: {
            categoryId: {
              in: topCategories.slice(0, 3), // Lấy 3 danh mục hàng đầu
            },
            id: {
              notIn: viewedProductIds, // Loại bỏ sản phẩm đã xem
            },
          },
          take: limit,
          include: {
            category: true,
          },
        });
      }
      
      // Nếu không đủ sản phẩm được gợi ý, bổ sung thêm sản phẩm phổ biến
      if (recommendedProducts.length < limit) {
        const additionalProducts = await prisma.product.findMany({
          where: {
            id: {
              notIn: [...viewedProductIds, ...recommendedProducts.map((p) => p.id)],
            },
          },
          take: limit - recommendedProducts.length,
          orderBy: {
            productViews: {
              _count: "desc",
            },
          },
          include: {
            category: true,
          },
        });
        
        recommendedProducts = [...recommendedProducts, ...additionalProducts];
      }
      
      return NextResponse.json({
        products: recommendedProducts,
        type: "personalized",
      });
    } else {
      // Nếu người dùng chưa xem sản phẩm nào, trả về sản phẩm phổ biến
      const popularProducts = await prisma.product.findMany({
        take: limit,
        orderBy: {
          productViews: {
            _count: "desc",
          },
        },
        include: {
          category: true,
        },
      });
      
      return NextResponse.json({
        products: popularProducts,
        type: "popular",
      });
    }
  } catch (error) {
    console.error("Lỗi khi lấy gợi ý sản phẩm:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi lấy gợi ý sản phẩm",
        products: [],  // Include empty products array for consistent client handling
        type: "error"
      },
      { status: 500 }
    );
  }
} 
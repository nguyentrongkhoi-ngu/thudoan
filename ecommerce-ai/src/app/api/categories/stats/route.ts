import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// API lấy thông tin thống kê danh mục
export async function GET(req: NextRequest) {
  console.log('API GET /api/categories/stats đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực, cho phép admin và manager xem thống kê
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền xem thống kê danh mục" },
        { status: 403 }
      );
    }
    
    // Lấy tổng số danh mục
    const totalCategories = await prisma.category.count();
    
    // Lấy số danh mục cha (không có parentId)
    const parentCategories = await prisma.category.count({
      where: {
        parentId: null
      }
    });
    
    // Lấy số danh mục con
    const childCategories = await prisma.category.count({
      where: {
        NOT: {
          parentId: null
        }
      }
    });
    
    // Đếm tổng số sản phẩm
    const totalProducts = await prisma.product.count();
    
    // Lấy danh mục có nhiều sản phẩm nhất
    const topCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        parentId: true,
        parentCategory: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        products: {
          _count: 'desc'
        }
      },
      take: 5
    });
    
    // Lấy danh mục có ít sản phẩm nhất
    const bottomCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        imageUrl: true,
        parentId: true,
        parentCategory: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            products: true
          }
        }
      },
      orderBy: {
        products: {
          _count: 'asc'
        }
      },
      take: 5
    });
    
    // Định dạng dữ liệu trả về
    const formattedTopCategories = topCategories.map(category => ({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      parentName: category.parentCategory?.name || null,
      productCount: category._count.products
    }));
    
    const formattedBottomCategories = bottomCategories.map(category => ({
      id: category.id,
      name: category.name,
      imageUrl: category.imageUrl,
      parentId: category.parentId,
      parentName: category.parentCategory?.name || null,
      productCount: category._count.products
    }));
    
    // Lấy thống kê về cấu trúc cây danh mục
    const maxDepth = await getMaxCategoryDepth();
    
    // Tính số danh mục ở mỗi độ sâu
    const depthStats = await getCategoryDepthStats();
    
    return NextResponse.json({
      totalCategories,
      parentCategories,
      childCategories,
      totalProducts,
      topCategories: formattedTopCategories,
      bottomCategories: formattedBottomCategories,
      maxDepth,
      depthStats
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi lấy thống kê danh mục",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

// Hàm tính độ sâu lớn nhất của cây danh mục
async function getMaxCategoryDepth(): Promise<number> {
  // Lấy tất cả danh mục
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      parentId: true
    }
  });
  
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  const memo = new Map<string, number>();
  
  function getDepth(categoryId: string): number {
    // Nếu đã tính rồi, trả về kết quả
    if (memo.has(categoryId)) return memo.get(categoryId)!;
    
    const category = categoryMap.get(categoryId);
    if (!category) return 0;
    
    // Nếu là danh mục gốc
    if (!category.parentId) {
      memo.set(categoryId, 1);
      return 1;
    }
    
    // Nếu có danh mục cha, độ sâu = độ sâu của cha + 1
    const depth = getDepth(category.parentId) + 1;
    memo.set(categoryId, depth);
    return depth;
  }
  
  // Tính độ sâu cho mỗi danh mục
  let maxDepth = 0;
  for (const category of categories) {
    const depth = getDepth(category.id);
    maxDepth = Math.max(maxDepth, depth);
  }
  
  return maxDepth;
}

// Hàm thống kê số danh mục ở mỗi độ sâu
async function getCategoryDepthStats(): Promise<Record<number, number>> {
  // Lấy tất cả danh mục
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      parentId: true
    }
  });
  
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  const memo = new Map<string, number>();
  const depthStats: Record<number, number> = {};
  
  function getDepth(categoryId: string): number {
    // Nếu đã tính rồi, trả về kết quả
    if (memo.has(categoryId)) return memo.get(categoryId)!;
    
    const category = categoryMap.get(categoryId);
    if (!category) return 0;
    
    // Nếu là danh mục gốc
    if (!category.parentId) {
      memo.set(categoryId, 1);
      return 1;
    }
    
    // Nếu có danh mục cha, độ sâu = độ sâu của cha + 1
    const depth = getDepth(category.parentId) + 1;
    memo.set(categoryId, depth);
    return depth;
  }
  
  // Tính độ sâu cho mỗi danh mục và đếm
  for (const category of categories) {
    const depth = getDepth(category.id);
    depthStats[depth] = (depthStats[depth] || 0) + 1;
  }
  
  return depthStats;
} 
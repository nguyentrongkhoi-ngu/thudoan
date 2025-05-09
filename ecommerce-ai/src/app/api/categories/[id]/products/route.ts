import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Get products by category ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API GET /api/categories/[id]/products đang được gọi, ID:', params.id);
  
  try {
    const { id } = params;
    
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id },
      select: { id: true }
    });
    
    if (!category) {
      return NextResponse.json(
        { error: "Danh mục không tồn tại" },
        { status: 404 }
      );
    }
    
    // Parse pagination parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const skip = (page - 1) * limit;
    
    // Get products for this category
    const products = await prisma.product.findMany({
      where: { 
        categoryId: id 
      },
      select: {
        id: true,
        name: true,
        price: true,
        images: true,
        slug: true,
        stockQuantity: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    });
    
    // Get total count for pagination
    const totalProducts = await prisma.product.count({
      where: { categoryId: id }
    });
    
    console.log(`Đã tìm thấy ${products.length} sản phẩm cho danh mục ${id}`);
    
    return NextResponse.json({
      products,
      pagination: {
        total: totalProducts,
        page,
        limit,
        pages: Math.ceil(totalProducts / limit)
      }
    });
  } catch (error) {
    console.error("Lỗi khi lấy sản phẩm theo danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi lấy danh sách sản phẩm",
        products: []
      },
      { status: 500 }
    );
  }
} 
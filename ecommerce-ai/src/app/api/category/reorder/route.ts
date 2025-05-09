import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema xác thực dữ liệu sắp xếp
const reorderSchema = z.object({
  categories: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number().int().positive(),
    })
  ),
});

// API sắp xếp thứ tự danh mục
export async function PUT(req: NextRequest) {
  console.log('API PUT /api/category/reorder đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      console.log('Unauthorized:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const data = await req.json();
    console.log('Dữ liệu nhận được:', data);
    
    // Xác thực dữ liệu
    const validationResult = reorderSchema.safeParse(data);
    if (!validationResult.success) {
      console.log('Validation error:', validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Đảm bảo tất cả các ID danh mục tồn tại
    const categoryIds = data.categories.map((item: any) => item.id);
    const existingCategories = await prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
      select: {
        id: true,
      },
    });
    
    if (existingCategories.length !== categoryIds.length) {
      return NextResponse.json(
        { error: "Một số danh mục không tồn tại" },
        { status: 400 }
      );
    }
    
    // Cập nhật thứ tự của các danh mục
    const updatePromises = data.categories.map((item: any) =>
      prisma.category.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      })
    );
    
    await prisma.$transaction(updatePromises);
    
    console.log('Đã cập nhật thứ tự danh mục thành công');
    
    return NextResponse.json({
      message: "Đã cập nhật thứ tự danh mục thành công",
    });
  } catch (error) {
    console.error("Error updating category order:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thứ tự danh mục" },
      { status: 500 }
    );
  }
} 
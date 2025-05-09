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
      sortOrder: z.number().int().positive().or(z.string().transform(val => {
        const num = Number(val);
        if (isNaN(num)) throw new Error("sortOrder must be a number");
        return num;
      })),
    })
  ),
  parentId: z.string().nullable().optional(),
});

// API sắp xếp thứ tự danh mục
export async function PUT(req: NextRequest) {
  console.log('API PUT /api/categories/reorder đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    let data;
    try {
      data = await req.json();
      console.log('Dữ liệu nhận được:', JSON.stringify(data));
    } catch (parseError) {
      console.error('Lỗi khi parse request body:', parseError);
      return NextResponse.json(
        { error: "Lỗi định dạng dữ liệu gửi lên" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const validationResult = reorderSchema.safeParse(data);
    if (!validationResult.success) {
      console.log('Lỗi validation:', validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const validatedData = validationResult.data;
    const { categories: reorderedCategories, parentId } = validatedData;
    
    // Đảm bảo tất cả các ID danh mục tồn tại
    const categoryIds = reorderedCategories.map((item: any) => item.id);
    
    try {
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
        const foundIds = existingCategories.map(cat => cat.id);
        const missingIds = categoryIds.filter(id => !foundIds.includes(id));
        
        return NextResponse.json(
          { 
            error: "Một số danh mục không tồn tại",
            details: `Các ID không tồn tại: ${missingIds.join(', ')}`
          },
          { status: 400 }
        );
      }
      
      // Cập nhật thứ tự của các danh mục, với lối ghi riêng biệt để tối ưu hiệu suất
      console.log('Đang cập nhật thứ tự cho các danh mục:', reorderedCategories);
      
      // Tạo một mảng các promises cho mỗi cập nhật
      const updatePromises = reorderedCategories.map((item: any) =>
        prisma.category.update({
          where: { id: item.id },
          data: { 
            sortOrder: Number(item.sortOrder),
            
            // Cập nhật parentId cho toàn bộ danh mục nếu có thông tin
            ...(parentId !== undefined ? { parentId } : {})
          },
        })
      );
      
      // Thực hiện tất cả các cập nhật trong một giao dịch
      const updatedCategories = await prisma.$transaction(updatePromises);
      
      console.log('Đã cập nhật thứ tự danh mục thành công:', updatedCategories.length);
      
      return NextResponse.json({
        message: "Đã cập nhật thứ tự danh mục thành công",
        updatedCount: updatedCategories.length
      });
    } catch (dbError: any) {
      console.error("Lỗi database:", dbError);
      return NextResponse.json(
        { 
          error: "Lỗi cơ sở dữ liệu khi cập nhật thứ tự danh mục",
          details: dbError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật thứ tự danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi cập nhật thứ tự danh mục",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 
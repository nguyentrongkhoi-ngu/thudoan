import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema xác thực danh mục
const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

// Lấy thông tin danh mục theo ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API GET /api/category/[id] đang được gọi, ID:', params.id);
  
  try {
    const { id } = params;

    const category = await prisma.category.findUnique({
      where: { id },
    });
    
    console.log('Category found:', category ? 'yes' : 'no');

    if (!category) {
      return NextResponse.json(
        { error: "Danh mục không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy thông tin danh mục" },
      { status: 500 }
    );
  }
}

// Cập nhật danh mục
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API PUT /api/category/[id] đang được gọi, ID:', params.id);
  
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
    
    const { id } = params;
    const data = await req.json();
    console.log('Received PUT data:', data);
    
    // Xác thực dữ liệu
    const validationResult = categoryUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      console.log('Validation error:', validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Kiểm tra xem danh mục có tồn tại không
    const existingCategory = await prisma.category.findUnique({
      where: { id },
    });
    
    console.log('Category exists:', existingCategory ? 'yes' : 'no');
    
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Danh mục không tồn tại" },
        { status: 404 }
      );
    }
    
    // Kiểm tra xem tên đã tồn tại ở danh mục khác chưa
    if (data.name !== existingCategory.name) {
      const duplicateName = await prisma.category.findUnique({
        where: { name: data.name },
      });
      
      if (duplicateName) {
        console.log('Duplicate category name:', data.name);
        return NextResponse.json(
          { error: "Tên danh mục đã tồn tại" },
          { status: 400 }
        );
      }
    }
    
    // Kiểm tra parentId nếu có và khác với ID hiện tại (để tránh tự tham chiếu)
    if (data.parentId) {
      if (data.parentId === id) {
        console.log('Self reference not allowed:', data.parentId);
        return NextResponse.json(
          { error: "Danh mục không thể là danh mục cha của chính nó" },
          { status: 400 }
        );
      }
      
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      
      if (!parentCategory) {
        console.log('Parent category does not exist:', data.parentId);
        return NextResponse.json(
          { error: "Danh mục cha không tồn tại" },
          { status: 400 }
        );
      }
      
      // Kiểm tra xem parentId có tạo thành chu trình không
      // Ví dụ: A -> B -> C -> A
      let currentParentId = data.parentId;
      const visitedIds = new Set<string>();
      
      while (currentParentId) {
        if (visitedIds.has(currentParentId)) {
          console.log('Circular reference detected:', currentParentId);
          return NextResponse.json(
            { error: "Phát hiện tham chiếu vòng tròn trong cấu trúc danh mục" },
            { status: 400 }
          );
        }
        
        visitedIds.add(currentParentId);
        
        if (currentParentId === id) {
          console.log('Circular reference with current category detected');
          return NextResponse.json(
            { error: "Phát hiện tham chiếu vòng tròn trong cấu trúc danh mục" },
            { status: 400 }
          );
        }
        
        const parent = await prisma.category.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        
        currentParentId = parent?.parentId || null;
      }
    }
    
    // Cập nhật danh mục
    const updatedCategory = await prisma.category.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        parentId: data.parentId,
        sortOrder: data.sortOrder !== undefined ? data.sortOrder : existingCategory.sortOrder,
      },
      include: {
        parentCategory: {
          select: {
            id: true,
            name: true,
          }
        },
      }
    });
    
    console.log('Updated category:', updatedCategory);
    
    return NextResponse.json({
      category: updatedCategory,
      message: "Đã cập nhật danh mục thành công"
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật danh mục" },
      { status: 500 }
    );
  }
}

// Xóa danh mục
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API DELETE /api/category/[id] đang được gọi, ID:', params.id);
  
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
    
    const { id } = params;
    console.log('Deleting category ID:', id);
    
    // Kiểm tra xem danh mục có tồn tại không
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true },
          take: 1,
        },
      },
    });
    
    console.log('Category exists:', existingCategory ? 'yes' : 'no');
    console.log('Has products:', existingCategory?.products.length ? 'yes' : 'no');
    
    if (!existingCategory) {
      return NextResponse.json(
        { error: "Danh mục không tồn tại" },
        { status: 404 }
      );
    }
    
    // Kiểm tra xem danh mục có chứa sản phẩm không
    if (existingCategory.products.length > 0) {
      return NextResponse.json(
        { error: "Không thể xóa danh mục đang chứa sản phẩm" },
        { status: 400 }
      );
    }
    
    // Xóa danh mục
    await prisma.category.delete({
      where: { id },
    });
    
    console.log('Deleted category ID:', id);
    
    return NextResponse.json({
      message: "Đã xóa danh mục thành công"
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa danh mục" },
      { status: 500 }
    );
  }
} 
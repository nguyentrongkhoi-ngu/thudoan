import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Mock categories for fallback
const mockCategories = [
  { id: 'smartphone', name: 'Điện thoại' },
  { id: 'laptop', name: 'Laptop' },
  { id: 'tablet', name: 'Máy tính bảng' },
  { id: 'wearable', name: 'Thiết bị đeo' },
  { id: 'audio', name: 'Âm thanh' },
  { id: 'camera', name: 'Máy ảnh' },
  { id: 'gaming', name: 'Gaming' },
];

// Schema xác thực danh mục
const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
  parentId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

// Lấy tất cả danh mục
export async function GET(req: NextRequest) {
  console.log('API GET /api/categories đang được gọi');
  
  try {
    // Kiểm tra xem có yêu cầu bao gồm cấu trúc không
    const { searchParams } = new URL(req.url);
    const includeStructure = searchParams.get('includeStructure') === 'true';
    
    console.log('Include structure:', includeStructure);
    
    try {
      let categories;
      
      if (includeStructure) {
        // Lấy danh mục với cấu trúc đầy đủ
        categories = await prisma.category.findMany({
          orderBy: {
            sortOrder: "asc",
          },
          include: {
            parentCategory: {
              select: {
                id: true,
                name: true,
              }
            },
            _count: {
              select: {
                products: true,
                subCategories: true,
              }
            }
          },
        });
      } else {
        // Lấy danh mục đơn giản
        categories = await prisma.category.findMany({
          orderBy: {
            sortOrder: "asc",
          },
        });
      }
      
      console.log('Danh sách categories từ DB:', categories.length);
      
      // Return categories as an array for consistent usage across the app
      return NextResponse.json(categories);
    } catch (dbError) {
      console.error("Database error:", dbError);
      // Return mock categories as fallback
      return NextResponse.json(mockCategories);
    }
  } catch (error) {
    console.error("Lỗi khi lấy danh mục:", error);
    return NextResponse.json(
      mockCategories,
      { status: 200 } // Return mock data even on error
    );
  }
}

// Thêm danh mục mới
export async function POST(req: NextRequest) {
  console.log('API POST /api/categories đang được gọi');
  
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
    const validationResult = categorySchema.safeParse(data);
    if (!validationResult.success) {
      console.log('Lỗi validation:', validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Dữ liệu đã được xác thực
    const validatedData = validationResult.data;
    
    try {
      // Kiểm tra xem danh mục đã tồn tại chưa
      const existingCategory = await prisma.category.findUnique({
        where: { name: validatedData.name },
      });
      
      if (existingCategory) {
        console.log('Danh mục đã tồn tại:', existingCategory);
        return NextResponse.json(
          { error: "Danh mục đã tồn tại" },
          { status: 400 }
        );
      }
      
      // Kiểm tra xem danh mục cha có tồn tại không (nếu có)
      if (validatedData.parentId) {
        const parentCategory = await prisma.category.findUnique({
          where: { id: validatedData.parentId },
        });
        
        if (!parentCategory) {
          return NextResponse.json(
            { error: "Danh mục cha không tồn tại" },
            { status: 400 }
          );
        }
      }
      
      // Tìm sortOrder lớn nhất hiện tại
      const maxSortOrder = await prisma.category.findFirst({
        orderBy: {
          sortOrder: 'desc',
        },
        select: {
          sortOrder: true,
        },
      });
      
      const nextSortOrder = (maxSortOrder?.sortOrder || 0) + 1;
      console.log('Next sortOrder:', nextSortOrder);
      
      // Xử lý giá trị sortOrder từ client
      let sortOrder: number;
      if (validatedData.sortOrder !== undefined && validatedData.sortOrder !== null) {
        const sortOrderValue = Number(validatedData.sortOrder);
        if (isNaN(sortOrderValue)) {
          return NextResponse.json(
            { error: "Thứ tự hiển thị (sortOrder) phải là một số" },
            { status: 400 }
          );
        }
        sortOrder = sortOrderValue;
      } else {
        sortOrder = nextSortOrder;
      }
      
      // Chuẩn bị dữ liệu để tạo mới
      const createData = {
        name: validatedData.name,
        imageUrl: validatedData.imageUrl || null,
        sortOrder: sortOrder,
        parentId: validatedData.parentId || null,
        description: validatedData.description || null,
      };
      
      console.log('Dữ liệu tạo mới:', JSON.stringify(createData));
      
      // Tạo danh mục mới
      const category = await prisma.category.create({
        data: createData,
      });
      
      console.log('Đã tạo danh mục:', category);
      
      return NextResponse.json({
        category,
        message: "Đã tạo danh mục thành công"
      }, { status: 201 });
    } catch (dbError: any) {
      console.error("Lỗi database:", dbError);
      return NextResponse.json(
        { 
          error: "Lỗi cơ sở dữ liệu khi tạo danh mục",
          details: dbError.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi tạo danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi tạo danh mục",
        details: error instanceof Error ? error.message : "Unknown error",
        category: null
      },
      { status: 500 }
    );
  }
}

// Cập nhật danh mục
export async function PUT(req: NextRequest) {
  console.log('API PUT /api/categories đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const data = await req.json();
    console.log('Dữ liệu PUT nhận được:', data);
    
    if (!data.id) {
      return NextResponse.json(
        { error: "ID danh mục là bắt buộc" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const updateSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Tên danh mục là bắt buộc"),
      imageUrl: z.string().optional().nullable(),
      sortOrder: z.number().optional(),
    });
    
    const validationResult = updateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Kiểm tra xem danh mục có tồn tại không
    const existingCategory = await prisma.category.findUnique({
      where: { id: data.id },
    });
    
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
        return NextResponse.json(
          { error: "Tên danh mục đã tồn tại" },
          { status: 400 }
        );
      }
    }
    
    // Cập nhật danh mục
    const updatedCategory = await prisma.category.update({
      where: { id: data.id },
      data: {
        name: data.name,
        imageUrl: data.imageUrl,
        sortOrder: data.sortOrder || existingCategory.sortOrder,
      },
    });
    
    console.log('Đã cập nhật danh mục:', updatedCategory);
    
    return NextResponse.json({
      category: updatedCategory,
      message: "Đã cập nhật danh mục thành công"
    }, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi cập nhật danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi cập nhật danh mục",
      },
      { status: 500 }
    );
  }
}

// Xóa danh mục
export async function DELETE(req: NextRequest) {
  console.log('API DELETE /api/categories đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    // Lấy ID từ query params
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    console.log('Delete category ID:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: "ID danh mục là bắt buộc" },
        { status: 400 }
      );
    }
    
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
    
    console.log('Đã xóa danh mục ID:', id);
    
    return NextResponse.json({
      message: "Đã xóa danh mục thành công"
    }, { status: 200 });
  } catch (error) {
    console.error("Lỗi khi xóa danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi xóa danh mục",
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema xác thực danh mục
const categoryUpdateSchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

// Lấy thông tin danh mục theo ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API GET /api/categories/[id] đang được gọi, ID:', params.id);
  
  try {
    const { id } = params;

    const category = await prisma.category.findUnique({
      where: { id },
    });
    
    console.log('Category được tìm thấy:', category ? 'yes' : 'no');

    if (!category) {
      return NextResponse.json(
        { error: "Danh mục không tồn tại" },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin danh mục:", error);
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
  console.log('API PUT /api/categories/[id] đang được gọi, ID:', params.id);
  
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
    
    const { id } = params;
    let data;
    
    try {
      data = await req.json();
      console.log('Dữ liệu PUT nhận được:', JSON.stringify(data));
    } catch (parseError) {
      console.error('Lỗi khi parse request body:', parseError);
      return NextResponse.json(
        { error: "Lỗi định dạng dữ liệu gửi lên" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const updateSchema = z.object({
      name: z.string().min(1, "Tên danh mục là bắt buộc"),
      imageUrl: z.string().optional().nullable(),
      sortOrder: z.number().optional().nullable(),
      parentId: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
    });
    
    const validationResult = updateSchema.safeParse(data);
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
      // Kiểm tra xem danh mục có tồn tại không
      const existingCategory = await prisma.category.findUnique({
        where: { id },
        include: {
          subCategories: {
            select: { id: true },
          },
        },
      });
      
      console.log('Category tồn tại:', existingCategory ? 'yes' : 'no');
      
      if (!existingCategory) {
        return NextResponse.json(
          { error: "Danh mục không tồn tại" },
          { status: 404 }
        );
      }
      
      // Kiểm tra xem tên đã tồn tại ở danh mục khác chưa
      if (validatedData.name !== existingCategory.name) {
        const duplicateName = await prisma.category.findUnique({
          where: { name: validatedData.name },
        });
        
        if (duplicateName) {
          console.log('Tên danh mục đã tồn tại:', validatedData.name);
          return NextResponse.json(
            { error: "Tên danh mục đã tồn tại" },
            { status: 400 }
          );
        }
      }
      
      // Kiểm tra xem parentId có hợp lệ không
      if (validatedData.parentId) {
        // Không thể đặt chính nó làm cha
        if (validatedData.parentId === id) {
          return NextResponse.json(
            { error: "Không thể đặt danh mục làm cha của chính nó" },
            { status: 400 }
          );
        }
        
        // Kiểm tra xem danh mục cha có tồn tại không
        const parentCategory = await prisma.category.findUnique({
          where: { id: validatedData.parentId },
        });
        
        if (!parentCategory) {
          return NextResponse.json(
            { error: "Danh mục cha không tồn tại" },
            { status: 400 }
          );
        }
        
        // Kiểm tra xem có tạo thành vòng lặp không
        // Nếu A là cha của B, B là cha của C, thì C không thể là cha của A
        const checkCycleInHierarchy = async (
          childId: string,
          potentialParentId: string
        ): Promise<boolean> => {
          // Nếu trùng ID thì tạo thành vòng lặp
          if (childId === potentialParentId) return true;
          
          // Lấy tất cả danh mục con của childId
          const subCategories = await prisma.category.findMany({
            where: { parentId: childId },
            select: { id: true },
          });
          
          // Kiểm tra từng danh mục con
          for (const subCategory of subCategories) {
            const hasCycle = await checkCycleInHierarchy(
              subCategory.id,
              potentialParentId
            );
            if (hasCycle) return true;
          }
          
          return false;
        };
        
        try {
          const hasCycle = await checkCycleInHierarchy(validatedData.parentId, id);
          if (hasCycle) {
            return NextResponse.json(
              { error: "Không thể tạo cấu trúc danh mục vòng lặp" },
              { status: 400 }
            );
          }
        } catch (cycleError) {
          console.error("Lỗi khi kiểm tra chu trình:", cycleError);
          return NextResponse.json(
            { error: "Lỗi khi kiểm tra cấu trúc danh mục" },
            { status: 500 }
          );
        }
      }
      
      // Xử lý giá trị sortOrder
      let sortOrder: number | undefined;
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
        sortOrder = existingCategory.sortOrder;
      }
      
      // Chuẩn bị dữ liệu để cập nhật
      const updateData = {
        name: validatedData.name,
        imageUrl: validatedData.imageUrl,
        description: validatedData.description,
        parentId: validatedData.parentId,
        sortOrder: sortOrder,
      };
      
      console.log('Dữ liệu sẽ cập nhật:', JSON.stringify(updateData));
      
      // Cập nhật danh mục
      const updatedCategory = await prisma.category.update({
        where: { id },
        data: updateData,
      });
      
      console.log('Đã cập nhật danh mục:', updatedCategory);
      
      return NextResponse.json({
        category: updatedCategory,
        message: "Đã cập nhật danh mục thành công"
      });
    } catch (dbError) {
      console.error("Lỗi database:", dbError);
      return NextResponse.json(
        { error: "Lỗi cơ sở dữ liệu khi cập nhật danh mục" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Lỗi khi cập nhật danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi cập nhật danh mục",
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}

// Xóa danh mục
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API DELETE /api/categories/[id] đang được gọi, ID:', params.id);
  
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
    
    const { id } = params;
    console.log('Delete category ID:', id);
    
    // Kiểm tra xem danh mục có tồn tại không
    const existingCategory = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          select: { id: true },
          take: 1,
        },
        subCategories: {
          select: { id: true },
          take: 1,
        },
      },
    });
    
    console.log('Category tồn tại:', existingCategory ? 'yes' : 'no');
    console.log('Có sản phẩm:', existingCategory?.products.length ? 'yes' : 'no');
    console.log('Có danh mục con:', existingCategory?.subCategories.length ? 'yes' : 'no');
    
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
    
    // Kiểm tra xem danh mục có chứa danh mục con không
    if (existingCategory.subCategories.length > 0) {
      return NextResponse.json(
        { error: "Không thể xóa danh mục đang chứa danh mục con. Hãy xóa các danh mục con trước." },
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
    });
  } catch (error) {
    console.error("Lỗi khi xóa danh mục:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa danh mục" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";

// Lấy chi tiết sản phẩm theo ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    
    if (!productId) {
      console.warn("API: Thiếu ID sản phẩm trong request");
      return NextResponse.json(
        { error: "Thiếu ID sản phẩm" },
        { status: 400 }
      );
    }

    // Kiểm tra định dạng ID
    if (typeof productId !== 'string') {
      console.warn(`API: ID sản phẩm không hợp lệ - kiểu dữ liệu: ${typeof productId}`);
      return NextResponse.json(
        { error: "ID sản phẩm không hợp lệ", details: `Kiểu dữ liệu: ${typeof productId}` },
        { status: 400 }
      );
    }

    console.log(`API: Đang tìm sản phẩm với ID=${productId}`);
    
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          images: {
            orderBy: {
              order: 'asc',
            },
          },
        },
      });
      
      if (!product) {
        console.warn(`API: Không tìm thấy sản phẩm với ID=${productId}`);
        return NextResponse.json(
          { error: "Sản phẩm không tồn tại", productId },
          { status: 404 }
        );
      }
      
      console.log(`API: Đã tìm thấy sản phẩm ${product.name} (ID=${productId})`);
      return NextResponse.json(product);
    } catch (dbError) {
      // Xử lý lỗi Prisma cụ thể
      if (dbError instanceof Prisma.PrismaClientKnownRequestError) {
        console.error(`API: Lỗi Prisma (${dbError.code}):`, dbError.message);
        
        // P2023: Inconsistent column data
        if (dbError.code === 'P2023') {
          return NextResponse.json(
            { error: "ID sản phẩm không hợp lệ", details: dbError.message },
            { status: 400 }
          );
        }
      }
      
      console.error("API: Lỗi database khi tìm sản phẩm:", dbError);
      throw dbError; // Re-throw để xử lý ở catch bên ngoài
    }
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
    // Thêm thông tin về lỗi để debug
    const errorDetails = {
      error: "Đã xảy ra lỗi khi lấy chi tiết sản phẩm", 
      message: (error as Error).message,
      stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
      productId: params.id
    };
    
    console.error("Chi tiết lỗi:", JSON.stringify(errorDetails));
    
    return NextResponse.json(
      errorDetails,
      { status: 500 }
    );
  }
}

// Cập nhật thông tin sản phẩm
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const productId = params.id;
    const data = await req.json();
    
    // Kiểm tra sản phẩm tồn tại
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }
    
    // Cập nhật sản phẩm
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        stock: data.stock,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
      },
      include: {
        category: true,
      },
    });
    
    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error("Lỗi khi cập nhật sản phẩm:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật sản phẩm" },
      { status: 500 }
    );
  }
}

// Xóa sản phẩm
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const productId = params.id;
    
    // Kiểm tra sản phẩm tồn tại
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!existingProduct) {
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }
    
    // Xóa sản phẩm
    await prisma.product.delete({
      where: { id: productId },
    });
    
    return NextResponse.json(
      { message: "Đã xóa sản phẩm thành công" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lỗi khi xóa sản phẩm:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa sản phẩm" },
      { status: 500 }
    );
  }
} 
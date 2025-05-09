import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withPermission } from "@/lib/permissions";

// Lấy chi tiết sản phẩm theo ID (Admin only)
async function getProductById(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const productId = params.id;
    
    if (!productId) {
      return NextResponse.json(
        { error: "Thiếu ID sản phẩm" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Sản phẩm không tồn tại" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết sản phẩm:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy chi tiết sản phẩm" },
      { status: 500 }
    );
  }
}

// Cập nhật thông tin sản phẩm (Admin only)
async function updateProduct(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
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

// Xóa sản phẩm (Admin only)
async function deleteProduct(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

// Export handlers with admin permission check
export const GET = withPermission(getProductById, "ADMIN");
export const PUT = withPermission(updateProduct, "ADMIN");
export const PATCH = withPermission(updateProduct, "ADMIN");
export const DELETE = withPermission(deleteProduct, "ADMIN"); 
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { withPermission } from "@/lib/permissions";

// Schema kiểm tra dữ liệu đầu vào
const updateOrderSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "COMPLETED", "CANCELLED"]),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Lấy thông tin chi tiết đơn hàng
async function getOrder(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Kiểm tra phiên đăng nhập
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Bạn chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const orderId = params.id;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true, 
                name: true,
                price: true,
                imageUrl: true
              }
            }
          }
        },
        shippingAddress: true,
        invoice: true
      }
    });
    
    if (!order) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }
    
    // Định dạng lại dữ liệu để phù hợp với frontend
    const formattedOrder = {
      id: order.id,
      userId: order.userId,
      customerName: order.user?.name || 'Khách vãng lai',
      customerEmail: order.user?.email || 'không có email',
      total: order.total,
      status: order.status,
      trackingNumber: order.trackingNumber,
      notes: order.notes,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      shippingAddress: order.shippingAddress,
      invoice: order.invoice,
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        productImage: item.product.imageUrl,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }))
    };
    
    return NextResponse.json({ order: formattedOrder });
  } catch (error: unknown) {
    console.error("Lỗi khi lấy thông tin đơn hàng:", error);
    
    let errorMessage = "Đã xảy ra lỗi khi lấy thông tin đơn hàng";
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Lọc thông tin nhạy cảm từ thông báo lỗi
      const safeErrorMessage = error.message
        .replace(/(?:password|secret|token|key)=([^&]*)/gi, '$1=REDACTED');
      
      console.error('Error details:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          errorMessage = 'Không tìm thấy đơn hàng';
          statusCode = 404;
        }
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Cập nhật trạng thái đơn hàng
async function updateOrder(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Kiểm tra phiên đăng nhập
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized - Bạn chưa đăng nhập" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Bạn không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const orderId = params.id;
    const body = await req.json();
    
    // Xác thực dữ liệu đầu vào
    const validationResult = updateOrderSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Kiểm tra đơn hàng có tồn tại không
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!orderExists) {
      return NextResponse.json(
        { error: "Không tìm thấy đơn hàng" },
        { status: 404 }
      );
    }
    
    // Cập nhật trạng thái đơn hàng
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: body.status,
        trackingNumber: body.trackingNumber,
        notes: body.notes,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true
              }
            }
          }
        }
      }
    });
    
    // Định dạng lại dữ liệu để phù hợp với frontend
    const formattedOrder = {
      id: updatedOrder.id,
      userId: updatedOrder.userId,
      customerName: updatedOrder.user?.name || 'Khách vãng lai',
      customerEmail: updatedOrder.user?.email || 'không có email',
      total: updatedOrder.total,
      status: updatedOrder.status,
      trackingNumber: updatedOrder.trackingNumber,
      notes: updatedOrder.notes,
      createdAt: updatedOrder.createdAt.toISOString(),
      updatedAt: updatedOrder.updatedAt.toISOString(),
      items: updatedOrder.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }))
    };
    
    return NextResponse.json({
      message: "Cập nhật trạng thái đơn hàng thành công",
      order: formattedOrder
    });
  } catch (error: unknown) {
    console.error("Lỗi khi cập nhật đơn hàng:", error);
    
    let errorMessage = "Đã xảy ra lỗi khi cập nhật đơn hàng";
    let statusCode = 500;
    
    if (error instanceof Error) {
      console.error('Error details:', error);
      
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          errorMessage = 'Không tìm thấy đơn hàng';
          statusCode = 404;
        }
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Export handlers với permission admin
export const GET = withPermission(getOrder, "ADMIN");
export const PATCH = withPermission(updateOrder, "ADMIN");
export const PUT = withPermission(updateOrder, "ADMIN"); 
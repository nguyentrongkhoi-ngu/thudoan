import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { withPermission } from "@/lib/permissions";

async function getOrders(req: NextRequest) {
  try {
    // Kiểm tra phiên đăng nhập trực tiếp
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

    // Lấy tham số từ URL (nếu có)
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    
    // Xây dựng điều kiện lọc
    let whereClause = {};
    if (status) {
      whereClause = {
        ...whereClause,
        status: status
      };
    }
    
    // Truy vấn đơn hàng với phân trang
    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
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
    const formattedOrders = orders.map(order => ({
      id: order.id,
      userId: order.userId,
      customerName: order.user?.name || 'Khách vãng lai',
      customerEmail: order.user?.email || 'không có email',
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity
      }))
    }));
    
    return NextResponse.json({
      orders: formattedOrders,
      count: formattedOrders.length
    });
  } catch (error: unknown) {
    console.error("Lỗi khi lấy danh sách đơn hàng:", error);
    
    // Cung cấp thông tin lỗi chi tiết hơn (an toàn)
    let errorMessage = "Đã xảy ra lỗi khi lấy danh sách đơn hàng";
    let statusCode = 500;
    
    if (error instanceof Error) {
      // Lọc thông tin nhạy cảm từ thông báo lỗi
      const safeErrorMessage = error.message
        .replace(/(?:password|secret|token|key)=([^&]*)/gi, '$1=REDACTED');
      
      errorMessage = `${errorMessage}: ${safeErrorMessage}`;
      
      // Ghi log lỗi chi tiết trên server, nhưng không gửi về client
      console.error('Error details:', error);
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        errorMessage = 'Lỗi truy vấn dữ liệu: Trùng lặp dữ liệu';
      } else if (error.code === 'P2025') {
        errorMessage = 'Lỗi truy vấn dữ liệu: Không tìm thấy dữ liệu';
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

// Sử dụng withPermission để đảm bảo tính nhất quán với các API endpoint khác
export const GET = withPermission(getOrders, "ADMIN"); 
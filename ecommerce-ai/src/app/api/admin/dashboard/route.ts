import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withPermission } from "@/lib/permissions";

async function getDashboardData(req: NextRequest) {
  try {
    // Lấy tổng số người dùng
    const totalUsers = await prisma.user.count();
    
    // Lấy tổng số sản phẩm
    const totalProducts = await prisma.product.count();
    
    // Lấy tổng số đơn hàng
    const totalOrders = await prisma.order.count();
    
    // Lấy 5 đơn hàng gần nhất
    const recentOrders = await prisma.order.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });
    
    // Định dạng lại dữ liệu đơn hàng để phù hợp với giao diện
    const formattedOrders = recentOrders.map(order => ({
      id: order.id,
      customer: order.user.name || 'Khách hàng',
      customerEmail: order.user.email,
      total: order.total,
      status: order.status
    }));
    
    return NextResponse.json({
      totalUsers,
      totalProducts,
      totalOrders,
      recentOrders: formattedOrders
    });
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu dashboard:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy dữ liệu dashboard" },
      { status: 500 }
    );
  }
}

export const GET = withPermission(getDashboardData, "ADMIN"); 
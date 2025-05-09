import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get order ID from request body
    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Get the order with details
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                price: true,
              },
            },
          },
        },
        shippingAddress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Verify the order exists and belongs to the current user
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // In a real implementation, you would use an email service here
    // This is a simplified example that logs the email content
    
    console.log(`
------ EMAIL CONFIRMATION ------
To: ${order.user.email}
Subject: Xác nhận đơn hàng #${order.id}

Xin chào ${order.user.name || 'Quý khách'},

Cảm ơn bạn đã đặt hàng tại cửa hàng của chúng tôi. Đơn hàng của bạn đã được xác nhận và đang được xử lý.

THÔNG TIN ĐƠN HÀNG:
Mã đơn hàng: ${order.id}
Ngày đặt hàng: ${new Date(order.createdAt).toLocaleDateString('vi-VN')}
Trạng thái: ${order.status}
Mã theo dõi: ${order.trackingNumber || 'Chưa có'}

THÔNG TIN GIAO HÀNG:
Người nhận: ${order.shippingAddress?.fullName}
Địa chỉ: ${order.shippingAddress?.address}, ${order.shippingAddress?.city}, ${order.shippingAddress?.state}
Số điện thoại: ${order.shippingAddress?.phoneNumber}

CHI TIẾT ĐƠN HÀNG:
${order.items.map(item => `- ${item.product.name} x ${item.quantity}: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}`).join('\n')}

Tổng tiền: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)}

Phương thức thanh toán: ${order.paymentMethod || 'Chưa xác định'}

Cảm ơn bạn đã mua sắm cùng chúng tôi!

Trân trọng,
Đội ngũ cửa hàng
-------------------------------
    `);

    // For a real implementation, you would use an email service like SendGrid, AWS SES, etc.
    // Example with a hypothetical email service:
    /*
    await emailService.send({
      to: order.user.email,
      subject: `Xác nhận đơn hàng #${order.id}`,
      template: 'order-confirmation',
      data: {
        order,
        customerName: order.user.name,
        orderDate: new Date(order.createdAt).toLocaleDateString('vi-VN'),
        items: order.items,
        totalFormatted: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(order.total)
      }
    });
    */

    return NextResponse.json({
      message: "Order confirmation email sent successfully",
    });
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return NextResponse.json(
      { error: "An error occurred while sending confirmation email" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// Get user's orders
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all orders for the current user with their items and product details
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc', // Most recent orders first
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      orders,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "An error occurred while fetching orders" },
      { status: 500 }
    );
  }
}

// Create a new order
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { items, shippingAddress, paymentMethod, total, coupon } = body;

    // Validate required data
    if (!items || !items.length || !shippingAddress || !total) {
      return NextResponse.json(
        { error: "Missing required order data" },
        { status: 400 }
      );
    }

    // Calculate subtotal from items
    const subtotal = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
    
    // Verify if there is a coupon
    let appliedCouponCode = null;
    let discountAmount = 0;
    
    if (coupon && coupon.code) {
      appliedCouponCode = coupon.code;
      discountAmount = coupon.discountValue || 0;
      
      // Verify the coupon again to prevent tampering
      const couponRecord = await prisma.coupon.findUnique({
        where: {
          code: appliedCouponCode,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        }
      });
      
      if (!couponRecord) {
        return NextResponse.json(
          { error: "Mã giảm giá không hợp lệ hoặc đã hết hạn" },
          { status: 400 }
        );
      }
      
      // Check if coupon has reached usage limit
      if (couponRecord.usageLimit && couponRecord.usageCount >= couponRecord.usageLimit) {
        return NextResponse.json(
          { error: "Mã giảm giá đã hết lượt sử dụng" },
          { status: 400 }
        );
      }
      
      // Verify subtotal meets minimum order requirement
      if (couponRecord.minOrderAmount && subtotal < couponRecord.minOrderAmount) {
        return NextResponse.json(
          { 
            error: `Giá trị đơn hàng tối thiểu để sử dụng mã giảm giá là ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(couponRecord.minOrderAmount)}` 
          },
          { status: 400 }
        );
      }
      
      // Recalculate discount to prevent tampering
      let calculatedDiscount = 0;
      if (couponRecord.discountPercent) {
        calculatedDiscount = (subtotal * couponRecord.discountPercent) / 100;
        // Check maximum discount limit
        if (couponRecord.maxDiscount && calculatedDiscount > couponRecord.maxDiscount) {
          calculatedDiscount = couponRecord.maxDiscount;
        }
      } else if (couponRecord.discountAmount) {
        calculatedDiscount = couponRecord.discountAmount;
      }
      
      // Thực hiện kiểm tra lần cuối để đảm bảo discount không sai khác
      if (Math.abs(calculatedDiscount - discountAmount) > 1) {
        // Nếu chênh lệch lớn hơn 1 đơn vị tiền tệ, có thể có gian lận
        return NextResponse.json(
          { error: "Giá trị giảm giá không hợp lệ" },
          { status: 400 }
        );
      }
      
      // Cập nhật số lần sử dụng của coupon
      await prisma.coupon.update({
        where: { id: couponRecord.id },
        data: { usageCount: { increment: 1 } }
      });
      
      discountAmount = calculatedDiscount; // Đảm bảo sử dụng giá trị được tính toán lại
    }
    
    // Verify total matches calculated total
    const calculatedTotal = subtotal - discountAmount;
    if (Math.abs(calculatedTotal - total) > 1) { // Allow for small rounding differences
      return NextResponse.json(
        { error: "Tổng tiền đơn hàng không chính xác" },
        { status: 400 }
      );
    }

    // Create order with transaction to ensure all operations complete together
    const order = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const newOrder = await tx.order.create({
        data: {
          userId: session.user.id,
          total,
          status: "PENDING",
          paymentMethod,
          shippingAddress: {
            create: {
              fullName: shippingAddress.fullName,
              address: shippingAddress.address,
              city: shippingAddress.city,
              state: shippingAddress.state || "",
              postalCode: shippingAddress.postalCode,
              country: shippingAddress.country,
              phoneNumber: shippingAddress.phoneNumber,
            },
          },
          // Add notes to include coupon information
          notes: appliedCouponCode ? `Áp dụng mã giảm giá: ${appliedCouponCode}, giảm ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(discountAmount)}` : "",
        },
      });

      // 2. Create order items
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          },
        });

        // 3. Update product stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }
      
      // 4. Update coupon usage count if coupon was applied
      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data: {
            usageCount: {
              increment: 1
            }
          }
        });
      }

      // 5. Delete cart items for this user
      await tx.cartItem.deleteMany({
        where: {
          userId: session.user.id,
        },
      });

      // 6. Generate a tracking number (simple example)
      const trackingNumber = `TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      return await tx.order.update({
        where: { id: newOrder.id },
        data: { trackingNumber },
        include: {
          items: {
            include: {
              product: {
                select: {
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
          shippingAddress: true,
        },
      });
    });

    return NextResponse.json(
      { message: "Order created successfully", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "An error occurred while creating the order" },
      { status: 500 }
    );
  }
} 
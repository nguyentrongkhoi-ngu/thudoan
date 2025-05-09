import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Validate action request body
const actionSchema = z.object({
  action: z.enum(['cancel', 'return', 'reorder']),
  reason: z.string().optional(),
  returnItems: z.array(
    z.object({
      orderItemId: z.string(),
      quantity: z.number().int().positive(),
      reason: z.string().optional()
    })
  ).optional(),
});

// Process order actions (cancel, return, reorder)
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const orderId = params.id;

    // Get the order to check ownership and current status
    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    // Check if order exists
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // Check if the order belongs to the current user or if user is admin
    if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validationResult = actionSchema.safeParse(body);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validationResult.error.flatten() },
        { status: 400 }
      );
    }
    
    const { action, reason, returnItems } = validationResult.data;
    
    // Handle different actions
    switch (action) {
      case 'cancel':
        // Only allow cancellation for PENDING or PROCESSING orders
        if (!["PENDING", "PROCESSING"].includes(order.status)) {
          return NextResponse.json(
            { error: "Cannot cancel orders that are already shipped, delivered, completed or cancelled" },
            { status: 400 }
          );
        }
        
        // Update order status to CANCELLED
        const cancelledOrder = await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "CANCELLED",
            notes: order.notes 
              ? `${order.notes}\n\nOrder cancelled: ${reason || 'No reason provided'}`
              : `Order cancelled: ${reason || 'No reason provided'}`
          }
        });
        
        return NextResponse.json({
          message: "Order cancelled successfully",
          order: cancelledOrder
        });
      
      case 'return':
        // Only allow returns for DELIVERED or COMPLETED orders
        if (!["DELIVERED", "COMPLETED"].includes(order.status)) {
          return NextResponse.json(
            { error: "Can only return orders that have been delivered or completed" },
            { status: 400 }
          );
        }
        
        // Validate return items are provided
        if (!returnItems || returnItems.length === 0) {
          return NextResponse.json(
            { error: "Return items must be specified" },
            { status: 400 }
          );
        }
        
        // Create return request
        const returnRequest = await prisma.returnRequest.create({
          data: {
            orderId: orderId,
            userId: session.user.id,
            status: "PENDING",
            reason: reason || "Return requested by customer",
            items: {
              create: returnItems.map(item => ({
                orderItemId: item.orderItemId,
                quantity: item.quantity,
                reason: item.reason || "Customer return"
              }))
            }
          },
          include: {
            items: true
          }
        });
        
        // Update order status to indicate return request
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: "RETURN_REQUESTED",
            notes: order.notes 
              ? `${order.notes}\n\nReturn requested: ${reason || 'No reason provided'}`
              : `Return requested: ${reason || 'No reason provided'}`
          }
        });
        
        return NextResponse.json({
          message: "Return request submitted successfully",
          returnRequest
        });
        
      case 'reorder':
        // Create a new order with the same items
        const cartItems = await Promise.all(order.items.map(async (item) => {
          // Check current stock
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            select: { stock: true }
          });
          
          if (!product || product.stock < item.quantity) {
            throw new Error(`Not enough stock for product: ${item.product.name}`);
          }
          
          // Create new cart item
          return {
            userId: session.user.id,
            productId: item.productId,
            quantity: item.quantity
          };
        }));
        
        // Create new order from the cart items
        const newOrder = await prisma.order.create({
          data: {
            userId: session.user.id,
            status: "PENDING",
            total: order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
            notes: "Reordered from previous order #" + order.id,
            items: {
              create: order.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              }))
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        });
        
        // If the original order had a shipping address, copy it
        if (order.shippingAddress) {
          const originalAddress = await prisma.shippingAddress.findUnique({
            where: { orderId: order.id }
          });
          
          if (originalAddress) {
            await prisma.shippingAddress.create({
              data: {
                orderId: newOrder.id,
                fullName: originalAddress.fullName,
                address: originalAddress.address,
                city: originalAddress.city,
                state: originalAddress.state,
                postalCode: originalAddress.postalCode,
                country: originalAddress.country,
                phoneNumber: originalAddress.phoneNumber
              }
            });
          }
        }
        
        return NextResponse.json({
          message: "Order reordered successfully",
          newOrder
        });
        
      default:
        return NextResponse.json(
          { error: "Unsupported action" },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error("Error processing order action:", error);
    return NextResponse.json(
      { error: "An error occurred", details: error.message },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Create a new return request
export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body data
    const data = await request.json();
    const { orderId, reason, items } = data;

    // Validate required fields
    if (!orderId || !reason || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, reason, and items array' },
        { status: 400 }
      );
    }

    // Get the order to check if it exists and belongs to the user
    const order = await prisma.order.findUnique({
      where: { 
        id: orderId,
        userId: session.user.id
      },
      include: {
        items: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found or does not belong to this user' },
        { status: 404 }
      );
    }

    // Check if the order status is eligible for returns (DELIVERED or COMPLETED)
    if (order.status !== 'DELIVERED' && order.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Only delivered or completed orders can be returned' },
        { status: 400 }
      );
    }

    // Check if there's already a return request for this order
    const existingReturn = await prisma.returnRequest.findFirst({
      where: {
        orderId: orderId,
        status: {
          notIn: ['REJECTED', 'CANCELLED']
        }
      }
    });

    if (existingReturn) {
      return NextResponse.json(
        { error: 'A return request already exists for this order' },
        { status: 400 }
      );
    }

    // Create the return request
    const returnRequest = await prisma.returnRequest.create({
      data: {
        orderId: orderId,
        userId: session.user.id,
        reason: reason,
        status: 'PENDING',
        items: {
          create: items.map((item: { orderItemId: string, quantity: number }) => ({
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            status: 'PENDING'
          }))
        }
      },
      include: {
        items: true
      }
    });

    // Update the order status to RETURN_REQUESTED
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'RETURN_REQUESTED' }
    });

    return NextResponse.json(returnRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating return request:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the return request' },
      { status: 500 }
    );
  }
}

// Get all return requests for the current user
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';
    
    // Prepare filter based on user role
    const filter = isAdmin 
      ? {} 
      : { userId: session.user.id };
    
    // Get return requests
    const returnRequests = await prisma.returnRequest.findMany({
      where: filter,
      include: {
        order: {
          include: {
            items: true
          }
        },
        items: {
          include: {
            orderItem: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(returnRequests);
  } catch (error) {
    console.error('Error fetching return requests:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching return requests' },
      { status: 500 }
    );
  }
} 
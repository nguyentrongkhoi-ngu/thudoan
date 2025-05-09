import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// Get return request details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = params.id;
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if return request exists
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: {
          include: {
            items: {
              include: {
                product: true
              }
            }
          }
        },
        items: {
          include: {
            orderItem: {
              include: {
                product: true
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    // Check if user has permission to view this return (owner or admin)
    const isAdmin = session.user.role === 'ADMIN';
    if (!isAdmin && returnRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to view this return request' },
        { status: 403 }
      );
    }

    return NextResponse.json(returnRequest);
  } catch (error) {
    console.error('Error fetching return request:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the return request' },
      { status: 500 }
    );
  }
}

// Update return request status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = params.id;
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body data
    const data = await request.json();
    const { status, adminNotes } = data;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { error: 'Missing required field: status' },
        { status: 400 }
      );
    }

    // Check if return request exists
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true
      }
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    // Check permissions based on the type of update
    const isAdmin = session.user.role === 'ADMIN';
    const isOwner = returnRequest.userId === session.user.id;

    // Regular users can only cancel their own return requests
    if (!isAdmin && status !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'You do not have permission to update this return request' },
        { status: 403 }
      );
    }

    // Regular users can only cancel their own returns
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to update this return request' },
        { status: 403 }
      );
    }

    // Update the return request
    const updatedReturn = await prisma.returnRequest.update({
      where: { id: returnId },
      data: {
        status,
        adminNotes: isAdmin ? adminNotes : undefined
      },
      include: {
        items: true
      }
    });

    // If return is approved, update all return items to approved
    if (status === 'APPROVED' && isAdmin) {
      await prisma.returnItem.updateMany({
        where: { returnRequestId: returnId },
        data: { status: 'APPROVED' }
      });
    }

    // If return is rejected or cancelled, update order status back to DELIVERED/COMPLETED
    if ((status === 'REJECTED' || status === 'CANCELLED') && returnRequest.order.status === 'RETURN_REQUESTED') {
      await prisma.order.update({
        where: { id: returnRequest.orderId },
        data: { status: 'DELIVERED' }
      });
    }

    // If return is completed, update order status
    if (status === 'COMPLETED' && isAdmin) {
      await prisma.order.update({
        where: { id: returnRequest.orderId },
        data: { status: 'RETURNED' }
      });
    }

    return NextResponse.json(updatedReturn);
  } catch (error) {
    console.error('Error updating return request:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the return request' },
      { status: 500 }
    );
  }
}

// Cancel return request (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const returnId = params.id;
    
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if return request exists
    const returnRequest = await prisma.returnRequest.findUnique({
      where: { id: returnId },
      include: {
        order: true
      }
    });

    if (!returnRequest) {
      return NextResponse.json({ error: 'Return request not found' }, { status: 404 });
    }

    // Check if user has permission to delete this return
    const isAdmin = session.user.role === 'ADMIN';
    if (!isAdmin && returnRequest.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this return request' },
        { status: 403 }
      );
    }

    // Check if the return is in a state that allows cancellation
    if (returnRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Only pending return requests can be cancelled' },
        { status: 400 }
      );
    }

    // Update status to CANCELLED instead of deleting
    const cancelledReturn = await prisma.returnRequest.update({
      where: { id: returnId },
      data: { status: 'CANCELLED' }
    });

    // Reset the order status
    await prisma.order.update({
      where: { id: returnRequest.orderId },
      data: { status: 'DELIVERED' }
    });

    return NextResponse.json(
      { message: 'Return request cancelled successfully', data: cancelledReturn }
    );
  } catch (error) {
    console.error('Error cancelling return request:', error);
    return NextResponse.json(
      { error: 'An error occurred while cancelling the return request' },
      { status: 500 }
    );
  }
} 
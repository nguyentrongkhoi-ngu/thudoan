import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { v4 as uuidv4 } from 'uuid';

// Generate and get invoice for an order
export async function GET(
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

    // Get the order with detailed information for the invoice
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
            name: true,
            email: true,
          }
        },
        invoice: true,
      },
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
    
    // Check if we already have an invoice
    if (order.invoice?.pdfUrl) {
      // Invoice exists, return the download URL
      return NextResponse.json({
        invoice: order.invoice,
        downloadUrl: `/api/orders/${orderId}/invoice/download`,
      });
    }
    
    // Generate invoice number if it doesn't exist
    let invoice = order.invoice;
    
    if (!invoice) {
      // Create a new invoice record
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(orderId).substring(0, 8).toUpperCase()}`;
      
      invoice = await prisma.invoice.create({
        data: {
          orderId: orderId,
          invoiceNumber: invoiceNumber,
        }
      });
    }
    
    return NextResponse.json({
      message: "Invoice information retrieved",
      invoice: invoice,
      downloadUrl: `/api/orders/${orderId}/invoice/download`,
    });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the invoice" },
      { status: 500 }
    );
  }
} 
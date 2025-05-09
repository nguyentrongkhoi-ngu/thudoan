import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
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
                name: true,
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
      return new Response('Order not found', { status: 404 });
    }

    // Check if the order belongs to the current user or if user is admin
    if (order.userId !== session.user.id && session.user.role !== "ADMIN") {
      return new Response('Access denied', { status: 403 });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });
    const stream = new PassThrough();

    // Write to stream
    doc.pipe(stream);

    // Format dates
    const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const orderDate = dateFormatter.format(new Date(order.createdAt));
    const invoiceDate = dateFormatter.format(new Date());
    
    // Format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      }).format(amount);
    };

    // Add company logo/header
    doc.fontSize(20).text('E-Shop AI', { align: 'center' });
    doc.fontSize(10).text('Nền tảng mua sắm thông minh với công nghệ AI', { align: 'center' });
    doc.moveDown();

    // Add invoice title and number
    doc.fontSize(16).text('HÓA ĐƠN', { align: 'center' });
    doc.fontSize(10).text(`Số hóa đơn: ${order.invoice?.invoiceNumber || `INV-${orderId.substring(0, 8)}`}`, { align: 'center' });
    doc.moveDown();

    // Add invoice info
    doc.fontSize(10).text(`Ngày lập: ${invoiceDate}`);
    doc.text(`Ngày đặt hàng: ${orderDate}`);
    doc.text(`Mã đơn hàng: #${orderId.substring(0, 8)}`);
    doc.text(`Trạng thái: ${order.status}`);
    doc.moveDown();

    // Add customer info
    doc.fontSize(12).text('Thông tin khách hàng', { underline: true });
    doc.fontSize(10).text(`Tên: ${order.user.name || 'Không có thông tin'}`);
    doc.text(`Email: ${order.user.email}`);
    
    if (order.shippingAddress) {
      doc.text(`Địa chỉ: ${order.shippingAddress.address}, ${order.shippingAddress.city}`);
      doc.text(`Điện thoại: ${order.shippingAddress.phoneNumber}`);
    }
    
    doc.moveDown();

    // Add table headers
    const invoiceTableTop = doc.y;
    const itemX = 50;
    const quantityX = 300;
    const priceX = 370;
    const totalX = 450;

    doc.fontSize(10)
      .text('Sản phẩm', itemX, invoiceTableTop)
      .text('SL', quantityX, invoiceTableTop)
      .text('Đơn giá', priceX, invoiceTableTop)
      .text('Thành tiền', totalX, invoiceTableTop);

    // Draw a line
    doc.moveTo(50, invoiceTableTop + 15)
      .lineTo(550, invoiceTableTop + 15)
      .stroke();

    // Add table rows
    let tableRow = invoiceTableTop + 25;
    
    order.items.forEach(item => {
      const itemTotal = item.price * item.quantity;
      
      doc.fontSize(10)
        .text(item.product.name, itemX, tableRow)
        .text(item.quantity.toString(), quantityX, tableRow)
        .text(formatCurrency(item.price), priceX, tableRow)
        .text(formatCurrency(itemTotal), totalX, tableRow);
      
      tableRow += 20;
    });

    // Draw a line
    doc.moveTo(50, tableRow)
      .lineTo(550, tableRow)
      .stroke();

    // Add total
    doc.fontSize(10)
      .text('Tổng cộng:', 350, tableRow + 15)
      .text(formatCurrency(order.total), totalX, tableRow + 15);

    // Add note
    doc.moveDown(2);
    doc.fontSize(8).text('Lưu ý: Đây là hóa đơn điện tử có giá trị pháp lý.', { align: 'center' });
    doc.moveDown();
    doc.text('Cảm ơn quý khách đã mua hàng tại E-Shop AI!', { align: 'center' });

    // Finalize the PDF
    doc.end();

    // Set response headers
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="invoice-${order.invoice?.invoiceNumber || orderId.substring(0, 8)}.pdf"`);

    // Stream the PDF response
    return new Response(stream, {
      headers: headers,
    });
  } catch (error) {
    console.error("Error generating PDF invoice:", error);
    return new Response('Error generating PDF', { status: 500 });
  }
} 
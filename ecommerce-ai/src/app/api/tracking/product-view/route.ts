import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * API endpoint để ghi lại hành vi xem sản phẩm của người dùng
 * Request Body:
 * {
 *   productId: string;     // Bắt buộc - ID của sản phẩm đang xem
 *   viewDuration?: number; // Không bắt buộc - Thời gian xem (mili giây)
 *   lastView?: boolean;    // Không bắt buộc - Đánh dấu đây là lần xem cuối cùng
 *   userId?: string;       // Có thể cung cấp từ client hoặc lấy từ session
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // Kiểm tra phương thức
    if (req.method !== 'POST') {
      return NextResponse.json(
        { error: "Phương thức không được hỗ trợ" },
        { status: 405 }
      );
    }
    
    let requestData;
    try {
      requestData = await req.json();
      console.log("[Product View Tracking] Input data:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("[Product View Tracking] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    
    const { productId, viewDuration, lastView, userId: clientUserId } = requestData;
    
    // Kiểm tra dữ liệu đầu vào
    if (!productId) {
      console.warn("[Product View Tracking] Missing productId");
      return NextResponse.json(
        { error: "Thiếu mã sản phẩm" },
        { status: 400 }
      );
    }
    
    // Lấy thông tin phiên đăng nhập từ session hoặc từ request
    const session = await getServerSession(authOptions);
    // Ưu tiên lấy userId từ session, sau đó mới là từ request
    const userId = session?.user?.id || clientUserId;
    
    // Nếu không có userId (người dùng chưa đăng nhập), không lưu dữ liệu
    if (!userId) {
      console.log("[Product View Tracking] No user ID available, skipping");
      return NextResponse.json({ success: true });
    }
    
    try {
      // Kiểm tra sản phẩm tồn tại
      const product = await prisma.product.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        console.warn(`[Product View Tracking] Product not found - ID=${productId}`);
        return NextResponse.json(
          { error: "Sản phẩm không tồn tại" },
          { status: 404 }
        );
      }
      
      console.log(`[Product View Tracking] Recording view for product ID=${productId}, user ID=${userId}`);
      
      // Xác định key để tìm kiếm bản ghi
      const productUserKey = { userId, productId };
      
      // Tìm hoặc tạo bản ghi xem sản phẩm
      const existingView = await prisma.productView.findUnique({
        where: {
          userId_productId: productUserKey,
        },
      });
      
      if (existingView) {
        // Cập nhật bản ghi hiện có
        await prisma.productView.update({
          where: { id: existingView.id },
          data: {
            viewCount: existingView.viewCount + 1,
            duration: viewDuration ? (existingView.duration || 0) + viewDuration : existingView.duration,
            updatedAt: new Date(),
          },
        });
        
        console.log(`[Product View Tracking] Updated existing view record - ID=${existingView.id}`);
      } else {
        // Tạo bản ghi mới
        const newView = await prisma.productView.create({
          data: {
            userId,
            productId,
            duration: viewDuration || 0,
          },
        });
        
        console.log(`[Product View Tracking] Created new view record - ID=${newView.id}`);
      }
      
      return NextResponse.json({ success: true });
    } catch (dbError) {
      console.error(`[Product View Tracking] Database error:`, dbError);
      
      return NextResponse.json(
        { 
          error: "Đã xảy ra lỗi khi lưu thông tin xem sản phẩm",
          message: (dbError as Error).message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Ghi chi tiết lỗi
    console.error("[Product View Tracking] Critical error:", error);
    
    // Trả về thông tin lỗi chi tiết hơn để debug
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi ghi lại hành vi xem sản phẩm",
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 
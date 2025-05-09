import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * API endpoint để ghi lại hành vi tìm kiếm của người dùng
 * Request Body:
 * {
 *   query: string;        // Bắt buộc - Từ khóa tìm kiếm
 *   resultCount: number;  // Không bắt buộc - Số kết quả tìm kiếm trả về
 *   userId?: string;      // Có thể cung cấp từ client hoặc lấy từ session
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
      console.log("[Search Query Tracking] Input data:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("[Search Query Tracking] JSON parse error:", parseError);
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    
    const { query, resultCount, userId: clientUserId } = requestData;
    
    // Kiểm tra dữ liệu đầu vào
    if (!query) {
      console.warn("[Search Query Tracking] Missing search query");
      return NextResponse.json(
        { error: "Thiếu từ khóa tìm kiếm" },
        { status: 400 }
      );
    }
    
    // Lấy thông tin phiên đăng nhập từ session hoặc từ request
    const session = await getServerSession(authOptions);
    // Ưu tiên lấy userId từ session, sau đó mới là từ request
    const userId = session?.user?.id || clientUserId;
    
    // Nếu không có userId (người dùng chưa đăng nhập), không lưu dữ liệu
    if (!userId) {
      console.log("[Search Query Tracking] No user ID available, skipping");
      return NextResponse.json({ success: true });
    }
    
    try {
      console.log(`[Search Query Tracking] Recording search query "${query}" for user ID=${userId}`);
      
      // Ghi lại truy vấn tìm kiếm
      const newSearchQuery = await prisma.searchQuery.create({
        data: {
          userId,
          query: query.trim(),
        },
      });
      
      console.log(`[Search Query Tracking] Created search query record - ID=${newSearchQuery.id}`);
      
      return NextResponse.json({ 
        success: true,
        resultCount: resultCount || 0
      });
    } catch (dbError) {
      console.error(`[Search Query Tracking] Database error:`, dbError);
      
      return NextResponse.json(
        { 
          error: "Đã xảy ra lỗi khi lưu thông tin tìm kiếm",
          message: (dbError as Error).message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    // Ghi chi tiết lỗi
    console.error("[Search Query Tracking] Critical error:", error);
    
    // Trả về thông tin lỗi chi tiết hơn để debug
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi ghi lại hành vi tìm kiếm",
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 
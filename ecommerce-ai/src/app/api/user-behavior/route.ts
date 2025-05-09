import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// API để ghi lại hành vi người dùng
export async function POST(req: NextRequest) {
  try {
    // Ghi log bắt đầu request
    console.log("API User Behavior: Bắt đầu xử lý request");
    
    // Kiểm tra phương thức
    if (req.method !== 'POST') {
      console.warn(`API User Behavior: Phương thức không được hỗ trợ - ${req.method}`);
      return NextResponse.json(
        { error: "Phương thức không được hỗ trợ" },
        { status: 405 }
      );
    }
    
    let requestData;
    try {
      requestData = await req.json();
      console.log("API User Behavior: Dữ liệu đầu vào:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("API User Behavior: Lỗi khi phân tích dữ liệu JSON:", parseError);
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    
    const { productId, action, duration, searchQuery } = requestData;
    
    // Kiểm tra dữ liệu đầu vào
    if (!action) {
      console.warn("API User Behavior: Thiếu thông tin hành động");
      return NextResponse.json(
        { error: "Thiếu thông tin hành động" },
        { status: 400 }
      );
    }
    
    // Lấy thông tin phiên đăng nhập
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    
    // Nếu không có userId (người dùng chưa đăng nhập), chỉ trả về thành công
    // nhưng không lưu dữ liệu vào cơ sở dữ liệu
    if (!userId) {
      console.log("API User Behavior: User chưa đăng nhập, bỏ qua lưu dữ liệu");
      return NextResponse.json({ success: true });
    }
    
    // Xử lý các loại hành vi khác nhau cho người dùng đã đăng nhập
    switch (action) {
      case "view_product":
        if (!productId) {
          console.warn("API User Behavior: Thiếu mã sản phẩm");
          return NextResponse.json(
            { error: "Thiếu mã sản phẩm" },
            { status: 400 }
          );
        }
        
        try {
          // Kiểm tra sản phẩm tồn tại
          const product = await prisma.product.findUnique({
            where: { id: productId },
          });
          
          if (!product) {
            console.warn(`API User Behavior: Sản phẩm không tồn tại - ID=${productId}`);
            return NextResponse.json(
              { error: "Sản phẩm không tồn tại" },
              { status: 404 }
            );
          }
          
          console.log(`API User Behavior: Đang ghi lại view cho sản phẩm ID=${productId}, user ID=${userId}`);
          
          // Tìm hoặc tạo bản ghi xem sản phẩm
          const productUserKey = { userId, productId };
          
          try {
            const existingView = await prisma.productView.findUnique({
              where: {
                userId_productId: productUserKey,
              },
            });
            
            if (existingView) {
              // Cập nhật bản ghi hiện có
              console.log(`API User Behavior: Cập nhật lượt xem hiện có - viewId=${existingView.id}`);
              
              await prisma.productView.update({
                where: { id: existingView.id },
                data: {
                  viewCount: existingView.viewCount + 1,
                  duration: duration ? (existingView.duration || 0) + duration : existingView.duration,
                },
              });
            } else {
              // Tạo bản ghi mới
              console.log(`API User Behavior: Tạo lượt xem mới cho sản phẩm ID=${productId}`);
              
              await prisma.productView.create({
                data: {
                  userId,
                  productId,
                  duration: duration || 0,
                },
              });
            }
            
            console.log(`API User Behavior: Đã ghi lại thành công lượt xem sản phẩm ID=${productId}`);
          } catch (dbError) {
            console.error(`API User Behavior: Lỗi database khi xử lý lượt xem:`, dbError);
            // Không throw lỗi, chỉ ghi log và trả về lỗi
            return NextResponse.json(
              { 
                error: "Đã xảy ra lỗi khi lưu thông tin xem sản phẩm",
                message: (dbError as Error).message
              },
              { status: 500 }
            );
          }
        } catch (viewError) {
          console.error(`API User Behavior: Lỗi khi xử lý lượt xem sản phẩm:`, viewError);
          return NextResponse.json(
            { 
              error: "Đã xảy ra lỗi khi xử lý lượt xem sản phẩm",
              message: (viewError as Error).message
            },
            { status: 500 }
          );
        }
        
        break;
        
      case "search":
        if (!searchQuery) {
          console.warn("API User Behavior: Thiếu từ khóa tìm kiếm");
          return NextResponse.json(
            { error: "Thiếu từ khóa tìm kiếm" },
            { status: 400 }
          );
        }
        
        try {
          console.log(`API User Behavior: Đang ghi lại tìm kiếm "${searchQuery}" cho user ID=${userId}`);
          
          // Ghi lại truy vấn tìm kiếm
          await prisma.searchQuery.create({
            data: {
              userId,
              query: searchQuery,
            },
          });
          
          console.log(`API User Behavior: Đã ghi lại thành công tìm kiếm "${searchQuery}"`);
        } catch (searchError) {
          console.error(`API User Behavior: Lỗi khi xử lý tìm kiếm:`, searchError);
          return NextResponse.json(
            { 
              error: "Đã xảy ra lỗi khi lưu thông tin tìm kiếm",
              message: (searchError as Error).message
            },
            { status: 500 }
          );
        }
        
        break;
        
      default:
        console.warn(`API User Behavior: Hành động không được hỗ trợ - ${action}`);
        return NextResponse.json(
          { error: "Hành động không được hỗ trợ" },
          { status: 400 }
        );
    }
    
    console.log("API User Behavior: Xử lý thành công");
    return NextResponse.json({ success: true });
  } catch (error) {
    // Ghi chi tiết lỗi
    console.error("API User Behavior: Lỗi nghiêm trọng:", error);
    
    // Trả về thông tin lỗi chi tiết hơn để debug
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi ghi lại hành vi người dùng",
        message: (error as Error).message,
        stack: process.env.NODE_ENV === 'development' ? (error as Error).stack : undefined
      },
      { status: 500 }
    );
  }
} 
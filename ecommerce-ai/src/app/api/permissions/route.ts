import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Mô hình phân quyền
const permissions = {
  // Danh mục
  CATEGORY_VIEW: "Xem danh mục",
  CATEGORY_CREATE: "Tạo danh mục mới",
  CATEGORY_EDIT: "Chỉnh sửa danh mục",
  CATEGORY_DELETE: "Xóa danh mục",
  CATEGORY_REORDER: "Sắp xếp danh mục",
  EXPORT_CATEGORIES: "Xuất danh mục",
  IMPORT_CATEGORIES: "Nhập danh mục",
  
  // Sản phẩm
  PRODUCT_VIEW: "Xem sản phẩm",
  PRODUCT_CREATE: "Tạo sản phẩm mới",
  PRODUCT_EDIT: "Chỉnh sửa sản phẩm",
  PRODUCT_DELETE: "Xóa sản phẩm",
  
  // Đơn hàng
  ORDER_VIEW: "Xem đơn hàng",
  ORDER_EDIT: "Chỉnh sửa đơn hàng",
  ORDER_DELETE: "Xóa đơn hàng",
  
  // Người dùng
  USER_VIEW: "Xem người dùng",
  USER_CREATE: "Tạo người dùng mới",
  USER_EDIT: "Chỉnh sửa người dùng",
  USER_DELETE: "Xóa người dùng",
  
  // Thống kê
  STATS_VIEW: "Xem thống kê",
  
  // Cài đặt
  SETTINGS_VIEW: "Xem cài đặt",
  SETTINGS_EDIT: "Chỉnh sửa cài đặt",
};

// Schema quyền của vai trò
const roleSchema = z.object({
  name: z.string().min(1, "Tên vai trò là bắt buộc"),
  permissions: z.array(z.string()),
  description: z.string().optional(),
});

// Lấy danh sách quyền
export async function GET(req: NextRequest) {
  console.log('API GET /api/permissions đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Chỉ Admin mới có quyền xem danh sách quyền
    if (!session || session.user.role !== "ADMIN") {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    // Lấy danh sách phân quyền hiện có
    const roles = await prisma.role.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      }
    });
    
    return NextResponse.json({
      permissions,
      roles,
    });
  } catch (error) {
    console.error("Lỗi khi lấy phân quyền:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy phân quyền" },
      { status: 500 }
    );
  }
}

// Tạo vai trò mới
export async function POST(req: NextRequest) {
  console.log('API POST /api/permissions đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Chỉ Admin mới có quyền tạo vai trò
    if (!session || session.user.role !== "ADMIN") {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    // Đọc dữ liệu gửi lên
    let data;
    try {
      data = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const validationResult = roleSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { name, permissions, description } = validationResult.data;
    
    // Kiểm tra xem vai trò đã tồn tại chưa
    const existingRole = await prisma.role.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });
    
    if (existingRole) {
      return NextResponse.json(
        { error: "Vai trò này đã tồn tại" },
        { status: 400 }
      );
    }
    
    // Tạo vai trò mới
    const role = await prisma.role.create({
      data: {
        name,
        permissions,
        description,
      }
    });
    
    return NextResponse.json({
      message: "Đã tạo vai trò thành công",
      role
    }, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo vai trò:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo vai trò" },
      { status: 500 }
    );
  }
}

// Kiểm tra quyền của người dùng
export async function checkPermission(userId: string, permission: string): Promise<boolean> {
  try {
    // Lấy thông tin người dùng
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
      }
    });
    
    // Nếu không tìm thấy người dùng
    if (!user) return false;
    
    // Admin có tất cả quyền
    if (user.role.name === "ADMIN") return true;
    
    // Kiểm tra quyền cụ thể
    return user.role.permissions.includes(permission);
  } catch (error) {
    console.error("Lỗi khi kiểm tra quyền:", error);
    return false;
  }
} 
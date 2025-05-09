import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { hash } from "bcrypt";

// Schema đăng ký người dùng
const userSchema = z.object({
  name: z.string().min(1, "Tên người dùng là bắt buộc"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
  roleId: z.string().optional(),
});

// Schema cập nhật người dùng
const userUpdateSchema = z.object({
  name: z.string().min(1, "Tên người dùng là bắt buộc").optional(),
  email: z.string().email("Email không hợp lệ").optional(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").optional(),
  roleId: z.string().optional(),
});

// Lấy danh sách người dùng
export async function GET(req: NextRequest) {
  console.log('API GET /api/users đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Chỉ Admin và Manager mới có quyền xem danh sách người dùng
    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "MANAGER")) {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    // Parse các tham số tìm kiếm và phân trang
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const roleId = searchParams.get('roleId') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    
    // Tạo filter conditions
    const whereCondition: any = {};
    
    if (search) {
      whereCondition.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (roleId) {
      whereCondition.roleId = roleId;
    }
    
    // Lấy danh sách người dùng
    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        _count: {
          select: {
            orders: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });
    
    // Đếm tổng số người dùng
    const total = await prisma.user.count({
      where: whereCondition,
    });
    
    // Lấy danh sách vai trò để hiển thị
    const roles = await prisma.role.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
          }
        }
      },
    });
    
    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      roles,
    });
  } catch (error) {
    console.error("Lỗi khi lấy danh sách người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách người dùng" },
      { status: 500 }
    );
  }
}

// Tạo người dùng mới
export async function POST(req: NextRequest) {
  console.log('API POST /api/users đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Chỉ Admin mới có quyền tạo người dùng mới
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
    const validationResult = userSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password, roleId } = validationResult.data;
    
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    
    if (existingUser) {
      return NextResponse.json(
        { error: "Email này đã được sử dụng" },
        { status: 400 }
      );
    }
    
    // Kiểm tra xem role có tồn tại không
    if (roleId) {
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      });
      
      if (!role) {
        return NextResponse.json(
          { error: "Vai trò không tồn tại" },
          { status: 400 }
        );
      }
    }
    
    // Mã hóa mật khẩu
    const hashedPassword = await hash(password, 10);
    
    // Tạo người dùng mới
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: roleId || "user", // Sử dụng roleId mặc định nếu không được cung cấp
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
      }
    });
    
    return NextResponse.json({
      message: "Đã tạo người dùng thành công",
      user: newUser,
    }, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo người dùng" },
      { status: 500 }
    );
  }
} 
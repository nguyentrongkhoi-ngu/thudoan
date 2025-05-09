import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { hash } from "bcrypt";

// Schema cập nhật người dùng
const userUpdateSchema = z.object({
  name: z.string().min(1, "Tên người dùng là bắt buộc").optional(),
  email: z.string().email("Email không hợp lệ").optional(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự").optional(),
  roleId: z.string().optional(),
  image: z.string().optional().nullable(),
});

// Lấy thông tin người dùng cụ thể
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API GET /api/users/[id] đang được gọi, ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền truy cập
    if (!session) {
      console.log('Không có quyền truy cập: Chưa đăng nhập');
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để thực hiện thao tác này" },
        { status: 401 }
      );
    }
    
    // Chỉ admin, manager hoặc chính người dùng đó mới có quyền xem thông tin
    if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER" && session.user.id !== params.id) {
      console.log('Không có quyền truy cập:', session.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    // Lấy thông tin người dùng
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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
            permissions: true,
          }
        },
        _count: {
          select: {
            orders: true,
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error("Lỗi khi lấy thông tin người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy thông tin người dùng" },
      { status: 500 }
    );
  }
}

// Cập nhật thông tin người dùng
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API PUT /api/users/[id] đang được gọi, ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền truy cập
    if (!session) {
      console.log('Không có quyền truy cập: Chưa đăng nhập');
      return NextResponse.json(
        { error: "Bạn cần đăng nhập để thực hiện thao tác này" },
        { status: 401 }
      );
    }
    
    // Chỉ admin hoặc chính người dùng đó mới có quyền cập nhật thông tin
    const isAdmin = session.user.role === "ADMIN";
    const isSelf = session.user.id === params.id;
    
    if (!isAdmin && !isSelf) {
      console.log('Không có quyền truy cập:', session.user);
      return NextResponse.json(
        { error: "Không có quyền cập nhật thông tin người dùng này" },
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
    const validationResult = userUpdateSchema.safeParse(data);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    const { name, email, password, roleId, image } = validationResult.data;
    
    // Kiểm tra xem user có tồn tại không
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        role: true,
      }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      );
    }
    
    // Nếu không phải admin, không được phép thay đổi vai trò
    if (!isAdmin && roleId && roleId !== existingUser.roleId) {
      return NextResponse.json(
        { error: "Bạn không có quyền thay đổi vai trò của người dùng" },
        { status: 403 }
      );
    }
    
    // Kiểm tra xem email đã tồn tại chưa (nếu thay đổi email)
    if (email && email !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email },
      });
      
      if (duplicateEmail) {
        return NextResponse.json(
          { error: "Email này đã được sử dụng" },
          { status: 400 }
        );
      }
    }
    
    // Kiểm tra xem vai trò có tồn tại không
    if (roleId && roleId !== existingUser.roleId) {
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
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (image !== undefined) updateData.image = image;
    
    // Chỉ Admin mới có thể cập nhật vai trò
    if (isAdmin && roleId !== undefined) {
      updateData.roleId = roleId;
    }
    
    // Mã hóa mật khẩu nếu có thay đổi
    if (password) {
      updateData.password = await hash(password, 10);
    }
    
    // Cập nhật thông tin người dùng
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
          }
        },
      }
    });
    
    return NextResponse.json({
      message: "Đã cập nhật thông tin người dùng thành công",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Lỗi khi cập nhật thông tin người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật thông tin người dùng" },
      { status: 500 }
    );
  }
}

// Xóa người dùng
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('API DELETE /api/users/[id] đang được gọi, ID:', params.id);
  
  try {
    const session = await getServerSession(authOptions);
    
    // Chỉ Admin mới có quyền xóa người dùng
    if (!session || session.user.role !== "ADMIN") {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền xóa người dùng" },
        { status: 403 }
      );
    }
    
    // Kiểm tra xem người dùng có tồn tại không
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            orders: true,
          }
        }
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      );
    }
    
    // Kiểm tra xem người dùng có liên quan đến dữ liệu khác không
    if (user._count.orders > 0) {
      return NextResponse.json(
        { 
          error: "Không thể xóa người dùng này vì có dữ liệu liên quan", 
          details: `Người dùng có ${user._count.orders} đơn hàng`
        },
        { status: 400 }
      );
    }
    
    // Xóa người dùng
    await prisma.user.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({
      message: "Đã xóa người dùng thành công"
    });
  } catch (error) {
    console.error("Lỗi khi xóa người dùng:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa người dùng" },
      { status: 500 }
    );
  }
} 
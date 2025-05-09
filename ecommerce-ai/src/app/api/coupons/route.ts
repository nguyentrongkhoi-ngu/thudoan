import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema xác thực coupon
const couponSchema = z.object({
  code: z.string().min(3, "Mã giảm giá phải có ít nhất 3 ký tự").max(50),
  description: z.string().optional(),
  discountPercent: z.number().optional(),
  discountAmount: z.number().optional(),
  minOrderAmount: z.number().optional(),
  maxDiscount: z.number().optional(),
  isActive: z.boolean().default(true),
  startDate: z.string(),
  endDate: z.string(),
  usageLimit: z.number().int().optional(),
}).refine(data => data.discountPercent !== undefined || data.discountAmount !== undefined, {
  message: "Phải có ít nhất một loại giảm giá (phần trăm hoặc số tiền cố định)",
  path: ['discountType'],
});

// Lấy danh sách mã giảm giá
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền admin (chỉ admin mới có thể xem tất cả)
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    
    let where = {};
    if (isActive === 'true') {
      where = {
        isActive: true,
        endDate: { gte: new Date() }
      };
    } else if (isActive === 'false') {
      where = { isActive: false };
    }
    
    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(coupons);
  } catch (error) {
    console.error("Lỗi khi lấy danh sách mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy danh sách mã giảm giá" },
      { status: 500 }
    );
  }
}

// Tạo mã giảm giá mới
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền admin
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    
    const data = await req.json();
    
    // Validate dữ liệu
    const validationResult = couponSchema.safeParse(data);
    
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Dữ liệu không hợp lệ", details: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Chuyển đổi string date thành Date object
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    // Kiểm tra startDate < endDate
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "Ngày bắt đầu phải nhỏ hơn ngày kết thúc" },
        { status: 400 }
      );
    }
    
    // Kiểm tra mã giảm giá đã tồn tại chưa
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() }
    });
    
    if (existingCoupon) {
      return NextResponse.json(
        { error: "Mã giảm giá đã tồn tại" },
        { status: 400 }
      );
    }
    
    // Tạo mã giảm giá mới
    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        code: data.code.toUpperCase(), // Mã giảm giá in hoa
        startDate,
        endDate
      }
    });
    
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("Lỗi khi tạo mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tạo mã giảm giá" },
      { status: 500 }
    );
  }
}

// Cập nhật mã giảm giá
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền admin
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    
    const data = await req.json();
    const { id, ...updateData } = data;
    
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID mã giảm giá" }, { status: 400 });
    }
    
    // Chuyển đổi string date thành Date object nếu có
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }
    
    // Kiểm tra mã giảm giá có tồn tại không
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });
    
    if (!existingCoupon) {
      return NextResponse.json({ error: "Mã giảm giá không tồn tại" }, { status: 404 });
    }
    
    // Cập nhật mã giảm giá
    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData
    });
    
    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Lỗi khi cập nhật mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi cập nhật mã giảm giá" },
      { status: 500 }
    );
  }
}

// Xóa mã giảm giá
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra quyền admin
    if (session?.user?.role !== 'admin') {
      return NextResponse.json({ error: "Không có quyền truy cập" }, { status: 403 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID mã giảm giá" }, { status: 400 });
    }
    
    // Kiểm tra mã giảm giá có tồn tại không
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id }
    });
    
    if (!existingCoupon) {
      return NextResponse.json({ error: "Mã giảm giá không tồn tại" }, { status: 404 });
    }
    
    // Xóa mã giảm giá
    await prisma.coupon.delete({
      where: { id }
    });
    
    return NextResponse.json({ message: "Đã xóa mã giảm giá thành công" });
  } catch (error) {
    console.error("Lỗi khi xóa mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa mã giảm giá" },
      { status: 500 }
    );
  }
} 
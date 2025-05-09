import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withPermission } from "@/lib/permissions";
import { z } from "zod";

// Schema validate dữ liệu mã giảm giá
const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3, { message: "Mã giảm giá phải có ít nhất 3 ký tự" }),
  description: z.string().nullable().optional(),
  discountPercent: z.number().nullable().optional(),
  discountAmount: z.number().nullable().optional(),
  minOrderAmount: z.number().nullable().optional(),
  maxDiscount: z.number().nullable().optional(),
  isActive: z.boolean().default(true),
  startDate: z.string(),
  endDate: z.string(),
  usageLimit: z.number().nullable().optional(),
  usageCount: z.number().optional(),
});

// Kiểm tra ít nhất một loại giảm giá: phần trăm hoặc số tiền cố định
const validateCouponDiscount = (data: any) => {
  if (!data.discountPercent && !data.discountAmount) {
    throw new Error("Phải có ít nhất một loại giảm giá (phần trăm hoặc số tiền cố định)");
  }
  return data;
};

// Lấy danh sách mã giảm giá (admin only)
async function getCoupons(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isActive = searchParams.get('isActive');
    
    // Tìm các mã giảm giá theo filter (nếu có)
    const whereClause = isActive 
      ? { isActive: isActive === 'true' } 
      : {};
      
    const coupons = await prisma.coupon.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc',
      },
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

// Tạo mã giảm giá mới (admin only)
async function createCoupon(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("Request body for createCoupon:", JSON.stringify(body, null, 2));
    
    // Chuẩn hóa mã giảm giá thành chữ hoa
    if (body.code) {
      body.code = body.code.trim().toUpperCase();
    }
    
    // Xác thực dữ liệu
    const validationResult = couponSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Xác thực logic giảm giá
    try {
      validateCouponDiscount(body);
    } catch (err) {
      console.error("Discount validation error:", err);
      return NextResponse.json(
        { error: (err as Error).message },
        { status: 400 }
      );
    }
    
    // Kiểm tra mã đã tồn tại chưa
    const existingCoupon = await prisma.coupon.findFirst({
      where: {
        code: body.code,
      },
    });
    
    if (existingCoupon) {
      return NextResponse.json(
        { error: "Mã giảm giá này đã tồn tại" },
        { status: 400 }
      );
    }
    
    // Xử lý ngày tháng với cách rõ ràng hơn
    let startDate, endDate;
    try {
      startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { error: "Ngày bắt đầu không hợp lệ" },
          { status: 400 }
        );
      }
      
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: "Ngày kết thúc không hợp lệ" },
          { status: 400 }
        );
      }
      
      console.log("Parsed dates:", { startDate, endDate });
    } catch (err) {
      console.error("Date parsing error:", err);
      return NextResponse.json(
        { error: "Lỗi khi xử lý ngày tháng" },
        { status: 400 }
      );
    }
    
    // Tạo mã giảm giá mới
    try {
      const newCoupon = await prisma.coupon.create({
        data: {
          code: body.code,
          description: body.description || null,
          discountPercent: body.discountPercent || null,
          discountAmount: body.discountAmount || null,
          minOrderAmount: body.minOrderAmount || null,
          maxDiscount: body.maxDiscount || null,
          isActive: body.isActive !== undefined ? body.isActive : true,
          startDate,
          endDate,
          usageLimit: body.usageLimit || null,
          usageCount: 0,
        },
      });
      
      console.log("Created coupon:", newCoupon);
      return NextResponse.json(newCoupon, { status: 201 });
    } catch (createError) {
      console.error("Prisma create error:", createError);
      return NextResponse.json(
        { error: `Lỗi khi tạo mã giảm giá: ${(createError as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Tổng quan lỗi khi tạo mã giảm giá:", error);
    return NextResponse.json(
      { error: `Đã xảy ra lỗi khi tạo mã giảm giá: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Cập nhật mã giảm giá (admin only)
async function updateCoupon(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log("Request body for updateCoupon:", JSON.stringify(body, null, 2));
    
    // Chuẩn hóa mã giảm giá thành chữ hoa
    if (body.code) {
      body.code = body.code.trim().toUpperCase();
    }
    
    if (!body.id) {
      return NextResponse.json(
        { error: "ID mã giảm giá là bắt buộc" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const validationResult = couponSchema.safeParse(body);
    if (!validationResult.success) {
      console.error("Validation error:", validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      );
    }
    
    // Xác thực logic giảm giá nếu đang cập nhật giá trị giảm giá
    if (body.discountPercent !== undefined || body.discountAmount !== undefined) {
      try {
        validateCouponDiscount(body);
      } catch (err) {
        console.error("Discount validation error:", err);
        return NextResponse.json(
          { error: (err as Error).message },
          { status: 400 }
        );
      }
    }
    
    // Kiểm tra mã đã tồn tại với mã khác chưa
    if (body.code) {
      const existingCoupon = await prisma.coupon.findFirst({
        where: {
          code: body.code,
          id: {
            not: body.id,
          },
        },
      });
      
      if (existingCoupon) {
        return NextResponse.json(
          { error: "Mã giảm giá này đã tồn tại" },
          { status: 400 }
        );
      }
    }
    
    // Xử lý ngày tháng
    let startDate, endDate;
    
    if (body.startDate) {
      try {
        startDate = new Date(body.startDate);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json(
            { error: "Ngày bắt đầu không hợp lệ" },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("Start date parsing error:", err);
        return NextResponse.json(
          { error: "Lỗi khi xử lý ngày bắt đầu" },
          { status: 400 }
        );
      }
    }
    
    if (body.endDate) {
      try {
        endDate = new Date(body.endDate);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json(
            { error: "Ngày kết thúc không hợp lệ" },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("End date parsing error:", err);
        return NextResponse.json(
          { error: "Lỗi khi xử lý ngày kết thúc" },
          { status: 400 }
        );
      }
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData: any = {
      code: body.code,
      description: body.description,
      discountPercent: body.discountPercent,
      discountAmount: body.discountAmount,
      minOrderAmount: body.minOrderAmount,
      maxDiscount: body.maxDiscount,
      isActive: body.isActive !== undefined ? body.isActive : undefined,
      usageLimit: body.usageLimit,
    };
    
    // Chỉ thêm ngày nếu được cung cấp
    if (startDate) {
      updateData.startDate = startDate;
    }
    
    if (endDate) {
      updateData.endDate = endDate;
    }
    
    // Cập nhật mã giảm giá
    try {
      const updatedCoupon = await prisma.coupon.update({
        where: { id: body.id },
        data: updateData,
      });
      
      console.log("Updated coupon:", updatedCoupon);
      return NextResponse.json(updatedCoupon);
    } catch (updateError) {
      console.error("Prisma update error:", updateError);
      
      if ((updateError as any).code === 'P2025') {
        return NextResponse.json(
          { error: "Không tìm thấy mã giảm giá" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: `Đã xảy ra lỗi khi cập nhật mã giảm giá: ${(updateError as Error).message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Tổng quan lỗi khi cập nhật mã giảm giá:", error);
    
    return NextResponse.json(
      { error: `Đã xảy ra lỗi khi cập nhật mã giảm giá: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

// Export các handlers với permission admin
export const GET = withPermission(getCoupons, "ADMIN");
export const POST = withPermission(createCoupon, "ADMIN");
export const PUT = withPermission(updateCoupon, "ADMIN"); 
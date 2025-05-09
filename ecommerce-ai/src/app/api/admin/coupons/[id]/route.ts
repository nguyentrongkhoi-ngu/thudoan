import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { withPermission } from "@/lib/permissions";

// Lấy chi tiết mã giảm giá theo ID (Admin only)
async function getCouponById(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const couponId = params.id;
    
    if (!couponId) {
      return NextResponse.json(
        { error: "Thiếu ID mã giảm giá" },
        { status: 400 }
      );
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });
    
    if (!coupon) {
      return NextResponse.json(
        { error: "Mã giảm giá không tồn tại" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(coupon);
  } catch (error) {
    console.error("Lỗi khi lấy chi tiết mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi lấy chi tiết mã giảm giá" },
      { status: 500 }
    );
  }
}

// Xóa mã giảm giá (Admin only)
async function deleteCoupon(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const couponId = params.id;
    
    // Kiểm tra mã giảm giá tồn tại
    const existingCoupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });
    
    if (!existingCoupon) {
      return NextResponse.json(
        { error: "Mã giảm giá không tồn tại" },
        { status: 404 }
      );
    }
    
    // Xóa mã giảm giá
    await prisma.coupon.delete({
      where: { id: couponId },
    });
    
    return NextResponse.json(
      { message: "Đã xóa mã giảm giá thành công" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Lỗi khi xóa mã giảm giá:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xóa mã giảm giá" },
      { status: 500 }
    );
  }
}

// Export handlers với permission admin
export const GET = withPermission(getCouponById, "ADMIN");
export const DELETE = withPermission(deleteCoupon, "ADMIN"); 
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// DELETE /api/cart/clear
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Kiểm tra xác thực
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Xóa tất cả các mục trong giỏ hàng của người dùng
    await prisma.cartItem.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: "Cart cleared successfully",
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { error: "An error occurred while clearing the cart" },
      { status: 500 }
    );
  }
} 
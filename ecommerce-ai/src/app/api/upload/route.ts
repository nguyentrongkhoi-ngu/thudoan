import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { writeFile } from "fs/promises";
import { join } from "path";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      console.log('Unauthorized upload attempt:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "Không tìm thấy file" },
        { status: 400 }
      );
    }
    
    // Kiểm tra loại file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Chỉ chấp nhận file hình ảnh" },
        { status: 400 }
      );
    }
    
    // Đọc file như một ArrayBuffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Tạo tên file duy nhất
    const fileExt = file.name.split(".").pop();
    const fileName = `${nanoid()}.${fileExt}`;
    
    // Đường dẫn lưu file
    const path = join(process.cwd(), "public/uploads", fileName);
    
    // Lưu file
    await writeFile(path, buffer);
    
    // Tạo URL công khai
    const url = `/uploads/${fileName}`;
    
    console.log(`File uploaded: ${url}`);
    
    return NextResponse.json({ 
      message: "Tải lên thành công",
      url
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi tải lên file" },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Schema xác thực danh mục
const categoryImportSchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  sortOrder: z.number().optional().default(0),
  parentId: z.string().optional().nullable(),
  parentName: z.string().optional().nullable(),
  externalId: z.string().optional().nullable(),
});

// API nhập danh mục từ JSON
export async function POST(req: NextRequest) {
  console.log('API POST /api/categories/import đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực
    if (!session || session.user.role !== "ADMIN") {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền nhập dữ liệu danh mục" },
        { status: 403 }
      );
    }
    
    // Parse dữ liệu gửi lên
    let data;
    try {
      data = await req.json();
      console.log('Nhận được dữ liệu nhập:', typeof data, Array.isArray(data) ? data.length : 'non-array');
    } catch (parseError) {
      console.error('Lỗi khi parse request body:', parseError);
      return NextResponse.json(
        { error: "Lỗi định dạng dữ liệu gửi lên" },
        { status: 400 }
      );
    }
    
    // Đảm bảo dữ liệu là một mảng
    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "Dữ liệu nhập phải là một mảng các danh mục" },
        { status: 400 }
      );
    }
    
    // Xác thực dữ liệu
    const categories = [];
    const errors = [];
    
    for (let i = 0; i < data.length; i++) {
      const category = data[i];
      const validationResult = categoryImportSchema.safeParse(category);
      
      if (!validationResult.success) {
        errors.push({
          index: i,
          item: category,
          errors: validationResult.error.errors
        });
      } else {
        categories.push(validationResult.data);
      }
    }
    
    // Nếu có lỗi, trả về danh sách lỗi
    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: "Dữ liệu không hợp lệ",
          details: errors 
        },
        { status: 400 }
      );
    }
    
    // Bắt đầu quá trình nhập danh mục
    const stats = {
      total: categories.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      errorDetails: []
    };
    
    // Danh sách ánh xạ danh mục cha theo tên
    const parentMap = {};
    
    // Lấy tất cả danh mục hiện có để kiểm tra trùng lặp
    const existingCategories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
      }
    });
    
    // Tạo map tên -> id
    const nameToIdMap = {};
    existingCategories.forEach(cat => {
      nameToIdMap[cat.name.toLowerCase()] = cat.id;
    });
    
    // Xử lý từng danh mục
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      try {
        // Kiểm tra danh mục đã tồn tại chưa
        const existingId = nameToIdMap[category.name.toLowerCase()];
        
        // Xác định parentId dựa trên parentName hoặc parentId
        let parentId = category.parentId;
        
        if (!parentId && category.parentName) {
          // Nếu có parentName, tìm ID tương ứng
          const parentNameLower = category.parentName.toLowerCase();
          
          // Kiểm tra trong map tên -> id đã có
          if (nameToIdMap[parentNameLower]) {
            parentId = nameToIdMap[parentNameLower];
          } else if (parentMap[parentNameLower]) {
            // Hoặc trong danh sách đã tạo mới
            parentId = parentMap[parentNameLower];
          } else {
            // Không tìm thấy danh mục cha
            console.log(`Không tìm thấy danh mục cha "${category.parentName}" cho "${category.name}"`);
          }
        }
        
        if (existingId) {
          // Cập nhật danh mục hiện có
          await prisma.category.update({
            where: { id: existingId },
            data: {
              description: category.description,
              imageUrl: category.imageUrl,
              sortOrder: category.sortOrder,
              parentId: parentId,
            }
          });
          
          stats.updated++;
        } else {
          // Tạo danh mục mới
          const created = await prisma.category.create({
            data: {
              name: category.name,
              description: category.description,
              imageUrl: category.imageUrl,
              sortOrder: category.sortOrder,
              parentId: parentId,
            }
          });
          
          // Lưu ID mới để có thể tham chiếu làm cha cho các danh mục sau
          nameToIdMap[category.name.toLowerCase()] = created.id;
          parentMap[category.name.toLowerCase()] = created.id;
          
          stats.created++;
        }
      } catch (error) {
        console.error(`Lỗi khi xử lý danh mục thứ ${i}:`, error);
        stats.errors++;
        stats.errorDetails.push({
          index: i,
          category: category.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      message: "Đã nhập danh mục thành công",
      stats
    });
  } catch (error) {
    console.error("Lỗi khi nhập danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi nhập danh mục",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 
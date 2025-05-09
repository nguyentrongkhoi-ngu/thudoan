import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { z } from "zod";

// Dữ liệu mẫu cho danh mục
const mockCategories = [
  { name: 'Điện thoại', description: 'Điện thoại thông minh và phụ kiện', imageUrl: null, parentId: null, sortOrder: 1 },
  { name: 'Laptop', description: 'Laptop và máy tính xách tay', imageUrl: null, parentId: null, sortOrder: 2 },
  { name: 'Máy tính bảng', description: 'Máy tính bảng các loại', imageUrl: null, parentId: null, sortOrder: 3 },
  { name: 'Thiết bị đeo', description: 'Đồng hồ thông minh và thiết bị đeo', imageUrl: null, parentId: null, sortOrder: 4 },
  { name: 'Âm thanh', description: 'Thiết bị âm thanh', imageUrl: null, parentId: null, sortOrder: 5 },
  { name: 'Máy ảnh', description: 'Máy ảnh và thiết bị quay phim', imageUrl: null, parentId: null, sortOrder: 6 },
  { name: 'Gaming', description: 'Thiết bị và phụ kiện gaming', imageUrl: null, parentId: null, sortOrder: 7 },
];

// Dữ liệu mẫu cho hiển thị khi không kết nối được database
const mockCategoriesDisplay = [
  { id: 'mock-smartphone', name: 'Điện thoại', description: 'Điện thoại thông minh và phụ kiện', imageUrl: null, parentId: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-laptop', name: 'Laptop', description: 'Laptop và máy tính xách tay', imageUrl: null, parentId: null, sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-tablet', name: 'Máy tính bảng', description: 'Máy tính bảng các loại', imageUrl: null, parentId: null, sortOrder: 3, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-wearable', name: 'Thiết bị đeo', description: 'Đồng hồ thông minh và thiết bị đeo', imageUrl: null, parentId: null, sortOrder: 4, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-audio', name: 'Âm thanh', description: 'Thiết bị âm thanh', imageUrl: null, parentId: null, sortOrder: 5, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-camera', name: 'Máy ảnh', description: 'Máy ảnh và thiết bị quay phim', imageUrl: null, parentId: null, sortOrder: 6, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-gaming', name: 'Gaming', description: 'Thiết bị và phụ kiện gaming', imageUrl: null, parentId: null, sortOrder: 7, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-smartphone-apple', name: 'iPhone', description: 'Điện thoại Apple iPhone', imageUrl: null, parentId: 'mock-smartphone', sortOrder: 1, createdAt: new Date(), updatedAt: new Date() },
  { id: 'mock-smartphone-samsung', name: 'Samsung', description: 'Điện thoại Samsung Galaxy', imageUrl: null, parentId: 'mock-smartphone', sortOrder: 2, createdAt: new Date(), updatedAt: new Date() },
];

// Schema xác thực danh mục
const categorySchema = z.object({
  name: z.string().min(1, "Tên danh mục là bắt buộc"),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().optional(),
});

// Hàm khởi tạo dữ liệu mẫu
async function seedCategories() {
  console.log('Đang khởi tạo dữ liệu mẫu cho danh mục...');
  
  try {
    // Tạo các danh mục chính
    const mainCategories = await Promise.all(
      mockCategories.map(async (category) => {
        return await prisma.category.create({
          data: category
        });
      })
    );
    
    console.log('Đã tạo xong các danh mục chính');
    
    // Tạo danh mục con sau khi đã tạo xong danh mục chính
    const smartphone = mainCategories.find(cat => cat.name === 'Điện thoại');
    
    if (smartphone) {
      // Tạo các danh mục con cho điện thoại
      await Promise.all([
        prisma.category.create({
          data: {
            name: 'iPhone',
            description: 'Điện thoại Apple iPhone',
            imageUrl: null,
            parentId: smartphone.id,
            sortOrder: 1
          }
        }),
        prisma.category.create({
          data: {
            name: 'Samsung',
            description: 'Điện thoại Samsung Galaxy',
            imageUrl: null,
            parentId: smartphone.id,
            sortOrder: 2
          }
        }),
        prisma.category.create({
          data: {
            name: 'Xiaomi',
            description: 'Điện thoại Xiaomi',
            imageUrl: null,
            parentId: smartphone.id,
            sortOrder: 3
          }
        })
      ]);
      
      console.log('Đã tạo xong các danh mục con');
    }
    
    return true;
  } catch (error) {
    console.error('Lỗi khi khởi tạo dữ liệu mẫu:', error);
    return false;
  }
}

// Lấy tất cả danh mục
export async function GET(req: NextRequest) {
  console.log('API GET /api/category đang được gọi');
  
  try {
    // Kiểm tra kết nối đến database
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful');
    } catch (connError) {
      console.error('Database connection error:', connError);
      console.log('Returning mock categories due to database connection error');
      return NextResponse.json(mockCategoriesDisplay, { 
        headers: { 'X-Mock-Data': 'true' } 
      });
    }
    
    try {
      // Lấy danh sách danh mục
      let categories = await prisma.category.findMany({
        include: {
          parentCategory: {
            select: {
              id: true,
              name: true,
            }
          },
          _count: {
            select: {
              products: true,
            }
          }
        },
        orderBy: {
          sortOrder: "asc",
        },
      });
      
      console.log('Loaded categories:', categories.length);
      
      // Nếu không có danh mục nào, tự động khởi tạo dữ liệu mẫu
      if (categories.length === 0) {
        console.log('No categories found, seeding mock data');
        const isSeeded = await seedCategories();
        
        if (isSeeded) {
          // Lấy lại danh sách danh mục sau khi khởi tạo
          categories = await prisma.category.findMany({
            include: {
              parentCategory: {
                select: {
                  id: true,
                  name: true,
                }
              },
              _count: {
                select: {
                  products: true,
                }
              }
            },
            orderBy: {
              sortOrder: "asc",
            },
          });
          
          return NextResponse.json(categories, {
            headers: { 'X-Data-Seeded': 'true' }
          });
        } else {
          // Nếu khởi tạo thất bại, trả về dữ liệu mẫu
          return NextResponse.json(mockCategoriesDisplay, { 
            headers: { 'X-Mock-Data': 'true' } 
          });
        }
      }
      
      return NextResponse.json(categories);
    } catch (queryError) {
      console.error("Query error:", queryError);
      console.log('Returning mock categories due to query error');
      return NextResponse.json(mockCategoriesDisplay, { 
        headers: { 'X-Mock-Data': 'true' } 
      });
    }
  } catch (error) {
    console.error("Error loading categories:", error);
    console.log('Returning mock categories due to general error');
    return NextResponse.json(mockCategoriesDisplay, { 
      headers: { 'X-Mock-Data': 'true' } 
    });
  }
}

// Thêm danh mục mới
export async function POST(req: NextRequest) {
  console.log('API POST /api/category đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực và quyền admin
    if (!session || session.user.role !== "ADMIN") {
      console.log('Unauthorized:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền truy cập" },
        { status: 403 }
      );
    }
    
    const data = await req.json();
    console.log('Received data:', data);
    
    // Xác thực dữ liệu
    const validationResult = categorySchema.safeParse(data);
    if (!validationResult.success) {
      console.log('Validation error:', validationResult.error.errors);
      return NextResponse.json(
        { error: validationResult.error.errors },
        { status: 400 }
      );
    }
    
    // Kiểm tra kết nối đến database
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (connError) {
      console.error('Database connection error:', connError);
      return NextResponse.json(
        { 
          error: "Không thể kết nối đến cơ sở dữ liệu",
          details: connError instanceof Error ? connError.message : String(connError),
          category: null
        },
        { status: 500 }
      );
    }
    
    // Kiểm tra xem danh mục đã tồn tại chưa
    const existingCategory = await prisma.category.findUnique({
      where: { name: data.name },
    });
    
    if (existingCategory) {
      console.log('Category already exists:', existingCategory);
      return NextResponse.json(
        { error: "Danh mục đã tồn tại" },
        { status: 400 }
      );
    }
    
    // Kiểm tra parentId nếu có
    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
      });
      
      if (!parentCategory) {
        console.log('Parent category does not exist:', data.parentId);
        return NextResponse.json(
          { error: "Danh mục cha không tồn tại" },
          { status: 400 }
        );
      }
    }
    
    // Tìm sortOrder lớn nhất hiện tại
    const maxSortOrder = await prisma.category.findFirst({
      orderBy: {
        sortOrder: 'desc',
      },
      select: {
        sortOrder: true,
      },
    });
    
    const nextSortOrder = (maxSortOrder?.sortOrder || 0) + 1;
    console.log('Next sortOrder:', nextSortOrder);
    
    // Tạo danh mục mới
    const category = await prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null,
        sortOrder: data.sortOrder || nextSortOrder,
      },
    });
    
    console.log('Created category:', category);
    
    return NextResponse.json({
      category,
      message: "Đã tạo danh mục thành công"
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi tạo danh mục",
        details: error instanceof Error ? error.message : String(error),
        category: null
      },
      { status: 500 }
    );
  }
} 
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { parseISO, format } from "date-fns";
import { createObjectCsvStringifier } from "csv-writer";

// API xuất danh mục ra định dạng CSV hoặc JSON
export async function GET(req: NextRequest) {
  console.log('API GET /api/categories/export đang được gọi');
  
  try {
    const session = await getServerSession(authOptions);
    
    // Kiểm tra xác thực (quyền admin hoặc quyền được cấp phép)
    if (!session || (session.user.role !== "ADMIN" && session.user.permissions?.indexOf('EXPORT_CATEGORIES') === -1)) {
      console.log('Không có quyền truy cập:', session?.user);
      return NextResponse.json(
        { error: "Không có quyền xuất dữ liệu danh mục" },
        { status: 403 }
      );
    }
    
    // Lấy kiểu format từ query parameters (mặc định là JSON)
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format')?.toLowerCase() || 'json';
    const withProducts = searchParams.get('withProducts') === 'true';
    
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { error: "Định dạng không hợp lệ. Chỉ hỗ trợ 'json' hoặc 'csv'" },
        { status: 400 }
      );
    }
    
    // Lấy tất cả danh mục từ database
    const categories = await prisma.category.findMany({
      orderBy: {
        sortOrder: 'asc',
      },
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
            subCategories: true,
          }
        },
        ...(withProducts ? {
          products: {
            select: {
              id: true,
              name: true,
              price: true,
              status: true
            }
          }
        } : {})
      },
    });
    
    console.log(`Đã tìm thấy ${categories.length} danh mục để xuất`);
    
    // Xử lý dữ liệu để xuất ra định dạng phù hợp
    if (format === 'json') {
      // Thêm timestamp vào tên file để tránh lưu cache
      const timestamp = new Date().getTime();
      const filename = `categories_export_${timestamp}.json`;
      
      // Format dữ liệu JSON trả về
      const formattedData = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description,
        imageUrl: category.imageUrl,
        sortOrder: category.sortOrder,
        parentId: category.parentId,
        parentName: category.parentCategory?.name || null,
        productsCount: category._count?.products || 0,
        subCategoriesCount: category._count?.subCategories || 0,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        ...(withProducts ? {
          products: category.products
        } : {})
      }));
      
      // Trả về file JSON
      return new NextResponse(JSON.stringify(formattedData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    } else if (format === 'csv') {
      // Thêm timestamp vào tên file để tránh lưu cache
      const timestamp = new Date().getTime();
      const filename = `categories_export_${timestamp}.csv`;
      
      // Định dạng cho CSV
      const header = [
        { id: 'id', title: 'ID' },
        { id: 'name', title: 'Tên danh mục' },
        { id: 'description', title: 'Mô tả' },
        { id: 'imageUrl', title: 'URL hình ảnh' },
        { id: 'sortOrder', title: 'Thứ tự hiển thị' },
        { id: 'parentId', title: 'ID danh mục cha' },
        { id: 'parentName', title: 'Tên danh mục cha' },
        { id: 'productsCount', title: 'Số lượng sản phẩm' },
        { id: 'subCategoriesCount', title: 'Số lượng danh mục con' },
        { id: 'createdAt', title: 'Ngày tạo' },
        { id: 'updatedAt', title: 'Ngày cập nhật' }
      ];
      
      // Tạo CSV stringifier
      const csvStringifier = createObjectCsvStringifier({
        header: header
      });
      
      // Format dữ liệu để xuất ra CSV
      const csvData = categories.map(category => ({
        id: category.id,
        name: category.name,
        description: category.description || '',
        imageUrl: category.imageUrl || '',
        sortOrder: category.sortOrder.toString(),
        parentId: category.parentId || '',
        parentName: category.parentCategory?.name || '',
        productsCount: (category._count?.products || 0).toString(),
        subCategoriesCount: (category._count?.subCategories || 0).toString(),
        createdAt: format(new Date(category.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        updatedAt: format(new Date(category.updatedAt), 'yyyy-MM-dd HH:mm:ss')
      }));
      
      // Tạo chuỗi CSV
      const csv = csvStringifier.getHeaderString() + csvStringifier.stringifyRecords(csvData);
      
      // Trả về file CSV
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
    
    // Trường hợp không rơi vào các định dạng hỗ trợ (không cần thiết vì đã kiểm tra ở trên)
    return NextResponse.json(
      { error: "Định dạng không được hỗ trợ" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Lỗi khi xuất danh mục:", error);
    return NextResponse.json(
      { 
        error: "Đã xảy ra lỗi khi xuất danh mục",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 
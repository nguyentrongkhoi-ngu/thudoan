const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Bắt đầu seed sản phẩm công nghệ...');
    
    // Tạo các danh mục
    const categories = [
      { id: "smartphone", name: "Điện thoại" },
      { id: "laptop", name: "Laptop" },
      { id: "tablet", name: "Máy tính bảng" },
      { id: "wearable", name: "Thiết bị đeo" },
      { id: "audio", name: "Âm thanh" },
      { id: "camera", name: "Máy ảnh & Quay phim" },
      { id: "gaming", name: "Gaming" },
    ];
    
    // Lưu ID của các danh mục để sử dụng sau
    const categoryMap = {};
    
    for (const category of categories) {
      const result = await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: {
          id: category.id,
          name: category.name,
          createdAt: new Date(),
          updatedAt: new Date()
        },
      });
      categoryMap[category.name] = result.id;
    }
    console.log('Đã tạo/cập nhật danh mục thành công!');
    
    // Danh sách sản phẩm với tên sản phẩm làm khóa duy nhất
    const techProducts = [
      {
        name: "iPhone 15 Pro Max 256GB",
        description: "Smartphone cao cấp từ Apple với chip A17 Pro, màn hình Super Retina XDR 6.7 inch và hệ thống camera chuyên nghiệp.",
        price: 34990000,
        stock: 50,
        imageUrl: "https://images.unsplash.com/photo-1695048133142-1a20484428d1?q=80&w=2070&auto=format&fit=crop",
        categoryName: "Điện thoại",
      },
      {
        name: "Samsung Galaxy S24 Ultra 512GB",
        description: "Flagship của Samsung với bút S-Pen tích hợp, màn hình Dynamic AMOLED 2X và khả năng zoom quang học 10x.",
        price: 31990000,
        stock: 45,
        imageUrl: "https://images.unsplash.com/photo-1707412911484-7b0440f2830a?q=80&w=2070&auto=format&fit=crop",
        categoryName: "Điện thoại",
      },
      {
        name: "MacBook Pro 16 inch M3 Max 32GB RAM",
        description: "Laptop chuyên dụng cho sáng tạo nội dung với chip M3 Max, màn hình Liquid Retina XDR và thời lượng pin lên đến 22 giờ.",
        price: 75990000,
        stock: 20,
        imageUrl: "https://images.unsplash.com/photo-1628556270448-4d4e4769a38c?q=80&w=2071&auto=format&fit=crop",
        categoryName: "Laptop",
      },
      {
        name: "Dell XPS 15 9530 Core i9",
        description: "Laptop cao cấp với màn hình OLED 4K, chip Intel Core i9 và card đồ họa NVIDIA RTX 4070.",
        price: 52990000,
        stock: 15,
        imageUrl: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=2069&auto=format&fit=crop",
        categoryName: "Laptop",
      },
      {
        name: "Apple Watch Series 9 GPS + Cellular",
        description: "Đồng hồ thông minh với màn hình luôn hiển thị, tính năng đo điện tâm đồ và theo dõi sức khỏe tiên tiến.",
        price: 11990000,
        stock: 60,
        imageUrl: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?q=80&w=2064&auto=format&fit=crop",
        categoryName: "Thiết bị đeo",
      },
      {
        name: "Sony WH-1000XM5 Noise Cancelling",
        description: "Tai nghe chống ồn chủ động cao cấp với chất lượng âm thanh Hi-Res và thời lượng pin 30 giờ.",
        price: 8990000,
        stock: 40,
        imageUrl: "https://images.unsplash.com/photo-1618066346137-23e4135702ab?q=80&w=2013&auto=format&fit=crop",
        categoryName: "Âm thanh",
      },
      {
        name: "iPad Pro M2 12.9 inch WiFi + Cellular",
        description: "Máy tính bảng mạnh mẽ với chip M2, màn hình Liquid Retina XDR và khả năng hỗ trợ Apple Pencil thế hệ mới.",
        price: 29990000,
        stock: 30,
        imageUrl: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?q=80&w=2033&auto=format&fit=crop",
        categoryName: "Máy tính bảng",
      },
      {
        name: "Bose QuietComfort Ultra Headphones",
        description: "Loa di động với chất lượng âm thanh vòm không gian và khả năng chống nước IPX4.",
        price: 9990000,
        stock: 25,
        imageUrl: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?q=80&w=2069&auto=format&fit=crop",
        categoryName: "Âm thanh",
      },
      {
        name: "DJI Mavic 3 Pro Cine Premium Combo",
        description: "Drone cao cấp với camera Hasselblad, khả năng quay video 5.1K và thời gian bay lên đến 43 phút.",
        price: 42990000,
        stock: 10,
        imageUrl: "https://images.unsplash.com/photo-1473968512647-3e447244af8f?q=80&w=2070&auto=format&fit=crop",
        categoryName: "Máy ảnh & Quay phim",
      },
      {
        name: "Nintendo Switch OLED Model White Set",
        description: "Máy chơi game cầm tay với màn hình OLED 7 inch, bộ nhớ 64GB và đế cắm có cổng LAN có dây.",
        price: 8490000,
        stock: 35,
        imageUrl: "https://images.unsplash.com/photo-1578303512578-cd4960e4c08f?q=80&w=2070&auto=format&fit=crop",
        categoryName: "Gaming",
      }
    ];
    
    // Thêm các sản phẩm
    let addedProducts = 0;
    for (const product of techProducts) {
      try {
        await prisma.product.upsert({
          where: { name: product.name },
          update: {
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl,
            categoryId: categoryMap[product.categoryName],
            updatedAt: new Date(),
          },
          create: {
            name: product.name,
            description: product.description,
            price: product.price,
            stock: product.stock,
            imageUrl: product.imageUrl,
            categoryId: categoryMap[product.categoryName],
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
        addedProducts++;
      } catch (error) {
        console.error(`Lỗi khi thêm sản phẩm ${product.name}:`, error);
      }
    }
    
    console.log(`Đã seed thành công ${addedProducts}/10 sản phẩm công nghệ!`);
  } catch (error) {
    console.error('Lỗi khi seed sản phẩm:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main(); 
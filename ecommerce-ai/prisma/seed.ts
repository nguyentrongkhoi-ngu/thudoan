import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Bắt đầu seed dữ liệu mẫu...');

    // Tạo tài khoản quản trị
    const adminPassword = await hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    console.log('Tạo tài khoản admin thành công:', admin.email);

    // Tạo tài khoản người dùng
    const userPassword = await hash('user123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        name: 'Người dùng',
        password: userPassword,
        role: 'USER',
      },
    });
    console.log('Tạo tài khoản người dùng thành công:', user.email);

    // Tạo các danh mục sản phẩm
    const categories = [
      { id: 'smartphone', name: 'Điện thoại' },
      { id: 'laptop', name: 'Laptop' },
      { id: 'tablet', name: 'Máy tính bảng' },
      { id: 'wearable', name: 'Thiết bị đeo' },
      { id: 'audio', name: 'Âm thanh' },
      { id: 'camera', name: 'Máy ảnh' },
      { id: 'gaming', name: 'Gaming' },
    ];

    // Create categories if they don't exist
    for (const category of categories) {
      const existingCategory = await prisma.category.findUnique({
        where: { id: category.id },
      });

      if (!existingCategory) {
        await prisma.category.create({
          data: category,
        });
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Category ${category.name} already exists`);
      }
    }

    // Tạo sản phẩm mẫu
    const products = [
      // Điện thoại
      {
        name: 'iPhone 15 Pro Max',
        description: 'Điện thoại cao cấp nhất của Apple với camera chuyên nghiệp và chip A17 Pro mạnh mẽ. Tính năng Dynamic Island, màn hình Super Retina XDR ProMotion 6.7 inch và khả năng quay video 4K Dolby Vision.',
        price: 29990000,
        stock: 50,
        imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484428d1?auto=format&fit=crop&q=80&w=800',
        categoryId: 'smartphone',
      },
      {
        name: 'Samsung Galaxy S24 Ultra',
        description: 'Flagship của Samsung với bút S-Pen, camera 200MP và khả năng AI tiên tiến. Màn hình Dynamic AMOLED 2X 6.8 inch, chip Snapdragon 8 Gen 3 và khả năng zoom quang học 10x.',
        price: 28990000,
        stock: 40,
        imageUrl: 'https://images.unsplash.com/photo-1707412911484-7b0440f2830a?auto=format&fit=crop&q=80&w=800',
        categoryId: 'smartphone',
      },
      {
        name: 'Xiaomi 14 Ultra',
        description: 'Điện thoại cao cấp của Xiaomi với hệ thống camera Leica, màn hình LTPO AMOLED 120Hz và sạc nhanh 90W. Chống nước IP68 và cấu hình mạnh mẽ với chip Snapdragon 8 Gen 3.',
        price: 18990000,
        stock: 60,
        imageUrl: 'https://images.unsplash.com/photo-1671920090611-9a40303b52cb?auto=format&fit=crop&q=80&w=800',
        categoryId: 'smartphone',
      },
      // Laptop
      {
        name: 'MacBook Pro 16 inch M3',
        description: 'Laptop cao cấp của Apple với chip M3 Max, màn hình Liquid Retina XDR 16 inch và thời lượng pin lên đến 22 giờ. Trang bị 32GB RAM và SSD 1TB siêu nhanh, lý tưởng cho các nhà sáng tạo nội dung.',
        price: 65990000,
        stock: 20,
        imageUrl: 'https://images.unsplash.com/photo-1628556270448-4d4e4769a38c?auto=format&fit=crop&q=80&w=800',
        categoryId: 'laptop',
      },
      {
        name: 'Dell XPS 15 9530',
        description: 'Laptop mỏng nhẹ với màn hình OLED 4K cảm ứng, chip Intel Core i9 thế hệ 13 và card đồ họa NVIDIA RTX 4070. Vỏ máy bằng nhôm cao cấp, bàn phím backlit và touchpad kích thước lớn.',
        price: 45990000,
        stock: 15,
        imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&q=80&w=800',
        categoryId: 'laptop',
      },
      {
        name: 'Asus ROG Zephyrus G14',
        description: 'Laptop gaming mỏng nhẹ, mạnh mẽ với CPU AMD Ryzen 9 và GPU NVIDIA RTX.',
        price: 38990000,
        stock: 25,
        imageUrl: 'https://placehold.co/600x400?text=Asus+ROG',
        categoryId: 'laptop',
      },
      // Máy tính bảng
      {
        name: 'iPad Pro M2',
        description: 'Máy tính bảng mạnh mẽ với chip M2, màn hình Liquid Retina XDR và Apple Pencil 2.',
        price: 23990000,
        stock: 30,
        imageUrl: 'https://placehold.co/600x400?text=iPad+Pro',
        categoryId: 'tablet',
      },
      {
        name: 'Samsung Galaxy Tab S9 Ultra',
        description: 'Máy tính bảng Android cao cấp với màn hình AMOLED lớn và bút S-Pen.',
        price: 22990000,
        stock: 25,
        imageUrl: 'https://placehold.co/600x400?text=Galaxy+Tab+S9',
        categoryId: 'tablet',
      },
      // Thiết bị đeo
      {
        name: 'Apple Watch Series 9',
        description: 'Đồng hồ thông minh cao cấp với tính năng theo dõi sức khỏe và tích hợp với hệ sinh thái Apple.',
        price: 10990000,
        stock: 45,
        imageUrl: 'https://placehold.co/600x400?text=Apple+Watch',
        categoryId: 'wearable',
      },
      {
        name: 'Samsung Galaxy Watch 6',
        description: 'Đồng hồ thông minh với tính năng theo dõi sức khỏe toàn diện và thiết kế sang trọng.',
        price: 7990000,
        stock: 70,
        imageUrl: 'https://placehold.co/600x400?text=Galaxy+Watch',
        categoryId: 'wearable',
      },
      // Âm thanh
      {
        name: 'Apple AirPods Pro 2',
        description: 'Tai nghe không dây cao cấp với tính năng chống ồn chủ động và âm thanh không gian.',
        price: 5990000,
        stock: 100,
        imageUrl: 'https://placehold.co/600x400?text=AirPods+Pro',
        categoryId: 'audio',
      },
      {
        name: 'Sony WH-1000XM5',
        description: 'Tai nghe chụp tai chống ồn hàng đầu với chất lượng âm thanh vượt trội và thời lượng pin dài.',
        price: 8990000,
        stock: 55,
        imageUrl: 'https://placehold.co/600x400?text=Sony+WH1000XM5',
        categoryId: 'audio',
      }
    ];

    // Check if we already have products
    const productCount = await prisma.product.count();
    
    if (productCount === 0) {
      // Create products
      for (const product of products) {
        await prisma.product.create({
          data: product,
        });
        console.log(`Created product: ${product.name}`);
      }
    } else {
      console.log(`Skipping product creation, ${productCount} products already exist`);
    }

    // Thêm dữ liệu hành vi người dùng mẫu
    // Tạo dữ liệu xem sản phẩm cho người dùng
    const productsInDB = await prisma.product.findMany({
      select: { id: true },
      take: 5, // Chỉ lấy 5 sản phẩm đầu tiên
    });

    for (const product of productsInDB) {
      await prisma.productView.upsert({
        where: {
          userId_productId: {
            userId: user.id,
            productId: product.id,
          },
        },
        update: {
          viewCount: { increment: 3 },
          duration: { increment: 120 },
        },
        create: {
          userId: user.id,
          productId: product.id,
          viewCount: 3,
          duration: 120,
        },
      });
    }
    console.log('Tạo dữ liệu hành vi người dùng thành công');

    // Tạo mã giảm giá mẫu
    console.log('Tạo mã giảm giá mẫu...');
    const now = new Date();
    
    // Tạo các mốc thời gian
    const oneMonthLater = new Date();
    oneMonthLater.setDate(oneMonthLater.getDate() + 30);
    
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
    
    const coupons = [
      {
        code: 'WELCOME10',
        description: 'Giảm 10% cho đơn hàng đầu tiên',
        discountPercent: 10,
        minOrderAmount: 500000, // 500,000 VND
        maxDiscount: 200000, // 200,000 VND
        isActive: true,
        startDate: now,
        endDate: oneMonthLater,
        usageLimit: 100,
        usageCount: 0
      },
      {
        code: 'SALE20',
        description: 'Giảm 20% cho tất cả sản phẩm - Ưu đãi đặc biệt tháng này',
        discountPercent: 20,
        minOrderAmount: 1000000, // 1,000,000 VND
        maxDiscount: 500000, // 500,000 VND
        isActive: true,
        startDate: now,
        endDate: twoWeeksLater,
        usageLimit: 50,
        usageCount: 0
      },
      {
        code: 'FIXED100K',
        description: 'Giảm 100,000 VND cho đơn hàng từ 500,000 VND - Áp dụng cho mọi sản phẩm',
        discountAmount: 100000, // 100,000 VND
        minOrderAmount: 500000, // 500,000 VND
        isActive: true,
        startDate: now,
        endDate: oneMonthLater,
        usageLimit: 200,
        usageCount: 0
      },
      {
        code: 'APPLE15',
        description: 'Giảm 15% cho các sản phẩm Apple - Chỉ áp dụng với đơn hàng từ 10 triệu',
        discountPercent: 15,
        minOrderAmount: 10000000, // 10,000,000 VND
        maxDiscount: 2000000, // 2,000,000 VND
        isActive: true,
        startDate: now,
        endDate: oneWeekLater,
        usageLimit: 30,
        usageCount: 0
      },
      {
        code: 'SUMMER25',
        description: 'Giảm 25% - Ưu đãi mùa hè cho mọi sản phẩm',
        discountPercent: 25,
        minOrderAmount: 2000000, // 2,000,000 VND
        maxDiscount: 1000000, // 1,000,000 VND
        isActive: true,
        startDate: now,
        endDate: oneMonthLater,
        usageLimit: 100,
        usageCount: 0
      },
      {
        code: 'NEWUSER200K',
        description: 'Giảm 200,000 VND cho người dùng mới',
        discountAmount: 200000, // 200,000 VND
        minOrderAmount: 1500000, // 1,500,000 VND
        isActive: true,
        startDate: now,
        endDate: oneMonthLater,
        usageLimit: 1000,
        usageCount: 0
      },
      {
        code: 'EXPIRED25',
        description: 'Mã giảm giá đã hết hạn - Giảm 25% cho tất cả sản phẩm',
        discountPercent: 25,
        isActive: true,
        startDate: oneMonthAgo,
        endDate: now,
        usageLimit: 100,
        usageCount: 100
      },
      {
        code: 'INACTIVE15',
        description: 'Mã giảm giá không hoạt động - Đã bị vô hiệu hóa bởi admin',
        discountPercent: 15,
        isActive: false,
        startDate: now,
        endDate: oneMonthLater,
        usageLimit: 100,
        usageCount: 0
      }
    ];
    
    // Kiểm tra và tạo mã giảm giá
    for (const coupon of coupons) {
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: coupon.code }
      });
      
      if (!existingCoupon) {
        await prisma.coupon.create({
          data: coupon
        });
        console.log(`Đã tạo mã giảm giá: ${coupon.code}`);
      } else {
        console.log(`Mã giảm giá ${coupon.code} đã tồn tại`);
      }
    }
    
    console.log('Hoàn thành seed dữ liệu!');
  } catch (error) {
    console.error('Lỗi trong quá trình seed dữ liệu:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 
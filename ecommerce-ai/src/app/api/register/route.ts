import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { z } from 'zod';

// Schema validation cho dữ liệu đăng ký
const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

export async function POST(request: NextRequest) {
  try {
    // Lấy dữ liệu từ request body
    const body = await request.json();
    
    // Validate dữ liệu đầu vào
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { message: 'Invalid input', details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    
    const { name, email, password } = result.data;
    
    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return NextResponse.json(
        { message: 'Email đã được sử dụng' },
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Tạo người dùng mới
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    
    // Trả về thông tin người dùng (không bao gồm password)
    return NextResponse.json(
      { 
        message: 'Đăng ký thành công',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
        }
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { 
        message: 'Đã xảy ra lỗi khi đăng ký', 
        error: error.message 
      },
      { status: 500 }
    );
  }
} 
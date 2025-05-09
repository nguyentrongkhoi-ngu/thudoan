import { PrismaClient } from '@prisma/client';

// Ngăn việc tạo nhiều phiên bản PrismaClient trong quá trình phát triển
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma; 
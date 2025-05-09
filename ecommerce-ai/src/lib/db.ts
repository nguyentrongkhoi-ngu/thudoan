import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    return user;
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

export async function createUser({ name, email, password }: { name: string; email: string; password: string }) {
  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password
      }
    });
    return user;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

export default prisma; 
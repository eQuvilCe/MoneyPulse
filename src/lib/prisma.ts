import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;
  try {
    return (
      globalForPrisma.prisma ??
      (globalForPrisma.prisma = new PrismaClient({
        log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
      }))
    );
  } catch {
    return null;
  }
}

export const prismaEnabled = () => Boolean(process.env.DATABASE_URL);

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

/**
 * Prisma 7 requires a driver adapter. `DATABASE_URL` must be set in production;
 * a localhost fallback exists only so `next build` can import this module when env is missing locally.
 */
const connectionString =
  process.env.DATABASE_URL?.trim() ?? "postgresql://127.0.0.1:5432/postgres";

const pool = globalForPrisma.pool ?? new Pool({ connectionString });
if (process.env.NODE_ENV !== "production") globalForPrisma.pool = pool;

const adapter = new PrismaPg(pool);

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

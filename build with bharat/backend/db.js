import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/nidusclean?schema=public';
const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 5000 });

// Log pool errors
pool.on('error', (err) => {
  console.warn('[BioTrace Database Pool Warning]:', err.message);
});

const adapter = new PrismaPg(pool);

const globalForPrisma = global;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  adapter,
  log: process.env.NODE_ENV === 'development' && process.env.PRISMA_LOG ? ['warn', 'error'] : []
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

let dbOnline = false;
let dbTested = false;

export async function testDbConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[BioTrace Database] Connected to PostgreSQL successfully.');
    dbOnline = true;
    dbTested = true;
    return true;
  } catch (error) {
    console.warn(`[BioTrace Database] PostgreSQL connection warning: ${error.message}`);
    dbOnline = false;
    dbTested = true;
    return false;
  }
}

export function isDbConnected() {
  return dbOnline === true;
}

export default prisma;

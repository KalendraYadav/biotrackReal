import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { ensurePostgresRunning } from './services/pgService.js';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  console.log('\n======================================================');
  console.log('   BioTrace PostgreSQL Database Initialization');
  console.log('======================================================\n');

  // 1. Ensure PostgreSQL engine is running
  await ensurePostgresRunning();

  // 2. Connect to nidusclean database
  const client = new pg.Client({
    connectionString: 'postgresql://postgres:password@localhost:5432/nidusclean'
  });

  await client.connect();
  console.log('[Init DB] Connected to PostgreSQL on port 5432.');

  try {
    // 3. Create schema, types, and tables
    const ddl = `
      CREATE SCHEMA IF NOT EXISTS "public";

      DO $$ BEGIN
        CREATE TYPE "Role" AS ENUM ('HOSPITAL_AUTHORITY', 'COLLECTION_OFFICER', 'TRANSPORT_OFFICER', 'TREATMENT_FACILITY', 'GOVERNMENT_AUTHORITY', 'COMPLIANCE_INSPECTOR');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CBWTF');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "BatchStatus" AS ENUM ('GENERATED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'TREATED', 'DISPOSED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "CustodyStage" AS ENUM ('GENERATION', 'COLLECTION', 'TRANSPORT_PICKUP', 'TRANSPORT_DROPOFF', 'TREATMENT', 'DISPOSAL');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "CaseStatus" AS ENUM ('ASSIGNED', 'UNDER_INVESTIGATION', 'RESOLVED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS "facilities" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" "FacilityType" NOT NULL,
        "city" TEXT NOT NULL,
        "address" TEXT NOT NULL,
        "lat" DOUBLE PRECISION NOT NULL,
        "lng" DOUBLE PRECISION NOT NULL,
        "bed_count" INTEGER,
        "cpcb_registration_no" TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS "users" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL UNIQUE,
        "password_hash" TEXT NOT NULL,
        "role" "Role" NOT NULL,
        "facility_id" TEXT REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "verification_status" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
        "phone_number" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "waste_batches" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "batch_code" TEXT NOT NULL UNIQUE,
        "hospital_id" TEXT NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "generating_department" TEXT NOT NULL,
        "cpcb_waste_category" TEXT NOT NULL,
        "cpcb_waste_type" TEXT NOT NULL,
        "quantity_kg" DOUBLE PRECISION NOT NULL,
        "unit" TEXT NOT NULL DEFAULT 'kg',
        "qr_code_value" TEXT NOT NULL UNIQUE,
        "status" "BatchStatus" NOT NULL DEFAULT 'GENERATED',
        "assigned_cbwtf_id" TEXT REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "compliance_deadline_at" TIMESTAMP(3) NOT NULL,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "custody_events" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "batch_id" TEXT NOT NULL REFERENCES "waste_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "stage" "CustodyStage" NOT NULL,
        "performed_by_user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "verified_by_scan" BOOLEAN NOT NULL DEFAULT false,
        "photo_url" TEXT,
        "latitude" DOUBLE PRECISION NOT NULL,
        "longitude" DOUBLE PRECISION NOT NULL,
        "geofence_valid" BOOLEAN NOT NULL DEFAULT true,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "quantity_at_stage_kg" DOUBLE PRECISION NOT NULL,
        "notes" TEXT
      );

      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "plate_no" TEXT NOT NULL UNIQUE,
        "transport_officer_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "driver_phone" TEXT,
        "phone_number" TEXT,
        "current_lat" DOUBLE PRECISION,
        "current_lng" DOUBLE PRECISION,
        "last_ping_at" TIMESTAMP(3)
      );

      CREATE TABLE IF NOT EXISTS "hospital_activity_logs" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "hospital_id" TEXT NOT NULL REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
        "date" TIMESTAMP(3) NOT NULL,
        "bed_occupancy" INTEGER NOT NULL,
        "surgeries_count" INTEGER NOT NULL,
        "ops_count" INTEGER NOT NULL,
        "expected_waste_kg" DOUBLE PRECISION NOT NULL
      );

      CREATE TABLE IF NOT EXISTS "risk_cases" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "batch_id" TEXT NOT NULL REFERENCES "waste_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "case_code" TEXT NOT NULL UNIQUE,
        "risk_score" INTEGER NOT NULL,
        "triggers" JSONB NOT NULL,
        "status" "CaseStatus" NOT NULL DEFAULT 'ASSIGNED',
        "assigned_inspector_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "resolved_at" TIMESTAMP(3)
      );

      CREATE TABLE IF NOT EXISTS "audit_log" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "actor_user_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        "action" TEXT NOT NULL,
        "entity" TEXT NOT NULL,
        "entity_id" TEXT NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('[Init DB] Executing DDL table definitions...');
    await client.query(ddl);
    console.log('[Init DB] Tables, relations, and ENUM types synchronized successfully.');
  } finally {
    await client.end();
  }

  // 4. Generate Prisma Client
  console.log('[Init DB] Generating Prisma Client bindings...');
  try {
    execSync('npx prisma generate', {
      cwd: __dirname,
      stdio: 'inherit'
    });
  } catch (err) {
    console.warn('[Init DB] Prisma generate notice:', err.message);
  }

  // 5. Seed Database
  console.log('[Init DB] Running database seeder...');
  try {
    execSync('node ../seed/index.js', {
      cwd: __dirname,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:password@localhost:5432/nidusclean?schema=public'
      }
    });
  } catch (err) {
    console.error('[Init DB] Seeding error:', err.message);
    throw err;
  }

  console.log('\n✔ PostgreSQL Database is online, schema created, and fully seeded with demo data!\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  initializeDatabase().catch(err => {
    console.error('Database initialization failed:', err);
    process.exit(1);
  });
}

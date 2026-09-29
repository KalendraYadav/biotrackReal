-- CreateEnum
CREATE TYPE "Role" AS ENUM ('HOSPITAL_AUTHORITY', 'COLLECTION_OFFICER', 'TRANSPORT_OFFICER', 'TREATMENT_FACILITY', 'GOVERNMENT_AUTHORITY', 'COMPLIANCE_INSPECTOR');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('HOSPITAL', 'CBWTF');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('GENERATED', 'COLLECTED', 'IN_TRANSIT', 'RECEIVED', 'TREATED', 'DISPOSED');

-- CreateEnum
CREATE TYPE "CustodyStage" AS ENUM ('GENERATION', 'COLLECTION', 'TRANSPORT_PICKUP', 'TRANSPORT_DROPOFF', 'TREATMENT', 'DISPOSAL');

-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('ASSIGNED', 'UNDER_INVESTIGATION', 'RESOLVED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "facility_id" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'VERIFIED',
    "phone_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facilities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "bed_count" INTEGER,
    "cpcb_registration_no" TEXT NOT NULL,

    CONSTRAINT "facilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waste_batches" (
    "id" TEXT NOT NULL,
    "batch_code" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "generating_department" TEXT NOT NULL,
    "cpcb_waste_category" TEXT NOT NULL,
    "cpcb_waste_type" TEXT NOT NULL,
    "quantity_kg" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "qr_code_value" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'GENERATED',
    "assigned_cbwtf_id" TEXT,
    "compliance_deadline_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waste_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custody_events" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "stage" "CustodyStage" NOT NULL,
    "performed_by_user_id" TEXT NOT NULL,
    "verified_by_scan" BOOLEAN NOT NULL DEFAULT false,
    "photo_url" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geofence_valid" BOOLEAN NOT NULL DEFAULT true,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantity_at_stage_kg" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,

    CONSTRAINT "custody_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "plate_no" TEXT NOT NULL,
    "transport_officer_id" TEXT,
    "driver_phone" TEXT,
    "phone_number" TEXT,
    "current_lat" DOUBLE PRECISION,
    "current_lng" DOUBLE PRECISION,
    "last_ping_at" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_activity_logs" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "bed_occupancy" INTEGER NOT NULL,
    "surgeries_count" INTEGER NOT NULL,
    "ops_count" INTEGER NOT NULL,
    "expected_waste_kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "hospital_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_cases" (
    "id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "case_code" TEXT NOT NULL,
    "risk_score" INTEGER NOT NULL,
    "triggers" JSONB NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assigned_inspector_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "risk_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "facilities_cpcb_registration_no_key" ON "facilities"("cpcb_registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "waste_batches_batch_code_key" ON "waste_batches"("batch_code");

-- CreateIndex
CREATE UNIQUE INDEX "waste_batches_qr_code_value_key" ON "waste_batches"("qr_code_value");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_plate_no_key" ON "vehicles"("plate_no");

-- CreateIndex
CREATE UNIQUE INDEX "risk_cases_case_code_key" ON "risk_cases"("case_code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_batches" ADD CONSTRAINT "waste_batches_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waste_batches" ADD CONSTRAINT "waste_batches_assigned_cbwtf_id_fkey" FOREIGN KEY ("assigned_cbwtf_id") REFERENCES "facilities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "waste_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custody_events" ADD CONSTRAINT "custody_events_performed_by_user_id_fkey" FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_transport_officer_id_fkey" FOREIGN KEY ("transport_officer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_activity_logs" ADD CONSTRAINT "hospital_activity_logs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_cases" ADD CONSTRAINT "risk_cases_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "waste_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "risk_cases" ADD CONSTRAINT "risk_cases_assigned_inspector_id_fkey" FOREIGN KEY ("assigned_inspector_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

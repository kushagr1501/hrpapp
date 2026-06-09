-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('nurse', 'doctor', 'admin', 'superadmin', 'patient');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('registered', 'screened', 'normal', 'high_risk', 'delivered', 'post_delivery', 'closed');

-- CreateEnum
CREATE TYPE "RiskSeverity" AS ENUM ('none', 'moderate', 'high', 'critical');

-- CreateEnum
CREATE TYPE "VisitType" AS ENUM ('registration', 'anc_2', 'anc_3', 'anc_4', 'followup', 'referral', 'delivery', 'post_delivery');

-- CreateEnum
CREATE TYPE "ReferralStatus" AS ENUM ('pending', 'in_transit', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('active', 'acknowledged', 'resolved', 'expired');

-- CreateEnum
CREATE TYPE "FacilityType" AS ENUM ('uphc', 'esi', 'fru', 'cemoc', 'district_hospital');

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "FacilityType" NOT NULL,
    "ward" TEXT,
    "address" TEXT,
    "lat" DECIMAL(10,8),
    "lng" DECIMAL(11,8),
    "contactPhone" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authId" TEXT,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "facilityId" TEXT,
    "ward" TEXT,
    "languagePref" TEXT NOT NULL DEFAULT 'en',
    "expoPushToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "authId" TEXT,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "age" INTEGER,
    "phone" TEXT,
    "husbandName" TEXT,
    "address" TEXT,
    "ward" TEXT,
    "slumName" TEXT,
    "lmp" TIMESTAMP(3),
    "edd" TIMESTAMP(3),
    "gravida" INTEGER,
    "para" INTEGER,
    "status" "PatientStatus" NOT NULL DEFAULT 'registered',
    "riskSeverity" "RiskSeverity" NOT NULL DEFAULT 'none',
    "isHrp" BOOLEAN NOT NULL DEFAULT false,
    "hrpFlaggedAt" TIMESTAMP(3),
    "assignedNurse" TEXT,
    "facilityId" TEXT,
    "mcpCardNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitType" "VisitType" NOT NULL,
    "visitNumber" INTEGER,
    "windowStart" TIMESTAMP(3),
    "windowEnd" TIMESTAMP(3),
    "scheduledDate" TIMESTAMP(3),
    "actualDate" TIMESTAMP(3),
    "wasAccompanied" BOOLEAN NOT NULL DEFAULT false,
    "conductedBy" TEXT,
    "facilityId" TEXT,
    "notes" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vitals" (
    "id" TEXT NOT NULL,
    "visitId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "recordedBy" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bpSystolic" INTEGER,
    "bpDiastolic" INTEGER,
    "weightKg" DECIMAL(5,2),
    "hemoglobin" DECIMAL(4,1),
    "bloodSugar" DECIMAL(5,1),
    "urineProtein" TEXT,
    "fundalHeight" DECIMAL(4,1),
    "fetalHeartRate" INTEGER,
    "fetalPresentation" TEXT,
    "fetalMovement" TEXT,
    "isMultipleGestation" BOOLEAN NOT NULL DEFAULT false,
    "numberOfFetuses" INTEGER NOT NULL DEFAULT 1,
    "usgDone" BOOLEAN NOT NULL DEFAULT false,
    "usgFindings" TEXT,
    "iugrSuspected" BOOLEAN NOT NULL DEFAULT false,
    "abdominalExamDone" BOOLEAN NOT NULL DEFAULT false,
    "abdominalExamNotes" TEXT,

    CONSTRAINT "Vitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObstetricHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pregnancyNumber" INTEGER,
    "year" INTEGER,
    "outcome" TEXT,
    "deliveryMode" TEXT,
    "complications" TEXT,
    "birthWeight" DECIMAL(4,2),
    "babyStatus" TEXT,

    CONSTRAINT "ObstetricHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comorbidity" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "diagnosedDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,

    CONSTRAINT "Comorbidity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "ruleDefinition" JSONB NOT NULL,
    "severity" "RiskSeverity" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskAssessment" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "assessedBy" TEXT,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallSeverity" "RiskSeverity" NOT NULL,
    "isHrp" BOOLEAN NOT NULL,
    "triggeredRules" JSONB NOT NULL,

    CONSTRAINT "RiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Referral" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "referredFrom" TEXT,
    "referredTo" TEXT,
    "referredBy" TEXT,
    "reason" TEXT NOT NULL,
    "clinicalFindings" TEXT,
    "treatmentGiven" TEXT,
    "status" "ReferralStatus" NOT NULL DEFAULT 'pending',
    "outcome" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Referral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BirthPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "plannedFacility" TEXT,
    "plannedDeliveryMode" TEXT,
    "transportArranged" BOOLEAN NOT NULL DEFAULT false,
    "transportType" TEXT,
    "bloodDonorArranged" BOOLEAN NOT NULL DEFAULT false,
    "companionName" TEXT,
    "companionPhone" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "jsyEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "jsskEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BirthPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "assignedTo" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "expectedVisitType" "VisitType",
    "expectedByDate" TIMESTAMP(3),
    "daysOverdue" INTEGER,
    "status" "AlertStatus" NOT NULL DEFAULT 'active',
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "patientId" TEXT,
    "channel" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KickCount" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "startedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KickCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authId_key" ON "User"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_authId_key" ON "Patient"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "Patient_status_idx" ON "Patient"("status");

-- CreateIndex
CREATE INDEX "Patient_assignedNurse_idx" ON "Patient"("assignedNurse");

-- CreateIndex
CREATE INDEX "Patient_facilityId_idx" ON "Patient"("facilityId");

-- CreateIndex
CREATE INDEX "Patient_edd_idx" ON "Patient"("edd");

-- CreateIndex
CREATE INDEX "Patient_phone_idx" ON "Patient"("phone");

-- CreateIndex
CREATE INDEX "Patient_isHrp_idx" ON "Patient"("isHrp");

-- CreateIndex
CREATE INDEX "Visit_patientId_idx" ON "Visit"("patientId");

-- CreateIndex
CREATE INDEX "Visit_visitType_idx" ON "Visit"("visitType");

-- CreateIndex
CREATE INDEX "Vitals_patientId_idx" ON "Vitals"("patientId");

-- CreateIndex
CREATE INDEX "Vitals_visitId_idx" ON "Vitals"("visitId");

-- CreateIndex
CREATE UNIQUE INDEX "BirthPlan_patientId_key" ON "BirthPlan"("patientId");

-- CreateIndex
CREATE INDEX "Alert_patientId_idx" ON "Alert"("patientId");

-- CreateIndex
CREATE INDEX "Alert_assignedTo_status_idx" ON "Alert"("assignedTo", "status");

-- CreateIndex
CREATE UNIQUE INDEX "KickCount_patientId_date_key" ON "KickCount"("patientId", "date");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_assignedNurse_fkey" FOREIGN KEY ("assignedNurse") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_conductedBy_fkey" FOREIGN KEY ("conductedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ObstetricHistory" ADD CONSTRAINT "ObstetricHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comorbidity" ADD CONSTRAINT "Comorbidity_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskAssessment" ADD CONSTRAINT "RiskAssessment_assessedBy_fkey" FOREIGN KEY ("assessedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredFrom_fkey" FOREIGN KEY ("referredFrom") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredTo_fkey" FOREIGN KEY ("referredTo") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referredBy_fkey" FOREIGN KEY ("referredBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthPlan" ADD CONSTRAINT "BirthPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BirthPlan" ADD CONSTRAINT "BirthPlan_plannedFacility_fkey" FOREIGN KEY ("plannedFacility") REFERENCES "Facility"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KickCount" ADD CONSTRAINT "KickCount_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

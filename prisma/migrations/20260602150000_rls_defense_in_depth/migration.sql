-- Defense-in-depth for accidental browser/mobile Supabase table access.
-- The Express API remains the primary security boundary for medical data.

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Patient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Visit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vitals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ObstetricHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comorbidity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RiskAssessment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Referral" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BirthPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Alert" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "KickCount" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_profile" ON "User"
  FOR SELECT TO authenticated
  USING ("authId" = auth.uid()::text);

CREATE POLICY "patients_select_own_or_care_team" ON "Patient"
  FOR SELECT TO authenticated
  USING (
    "authId" = auth.uid()::text
    OR "userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
    OR "assignedNurse" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text AND "role" = 'nurse')
    OR EXISTS (
      SELECT 1
      FROM "User"
      WHERE "authId" = auth.uid()::text
        AND "role" IN ('doctor', 'admin', 'superadmin')
    )
  );

CREATE POLICY "visits_select_own_or_care_team" ON "Visit"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "Visit"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
          OR "Patient"."assignedNurse" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text AND "role" = 'nurse')
          OR EXISTS (
            SELECT 1
            FROM "User"
            WHERE "authId" = auth.uid()::text
              AND "role" IN ('doctor', 'admin', 'superadmin')
          )
        )
    )
  );

CREATE POLICY "vitals_select_own_or_care_team" ON "Vitals"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "Vitals"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
          OR "Patient"."assignedNurse" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text AND "role" = 'nurse')
          OR EXISTS (
            SELECT 1
            FROM "User"
            WHERE "authId" = auth.uid()::text
              AND "role" IN ('doctor', 'admin', 'superadmin')
          )
        )
    )
  );

CREATE POLICY "risk_assessments_select_own_or_care_team" ON "RiskAssessment"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "RiskAssessment"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
          OR "Patient"."assignedNurse" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text AND "role" = 'nurse')
          OR EXISTS (
            SELECT 1
            FROM "User"
            WHERE "authId" = auth.uid()::text
              AND "role" IN ('doctor', 'admin', 'superadmin')
          )
        )
    )
  );

CREATE POLICY "birth_plans_select_own_or_care_team" ON "BirthPlan"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "BirthPlan"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
          OR "Patient"."assignedNurse" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text AND "role" = 'nurse')
          OR EXISTS (
            SELECT 1
            FROM "User"
            WHERE "authId" = auth.uid()::text
              AND "role" IN ('doctor', 'admin', 'superadmin')
          )
        )
    )
  );

CREATE POLICY "kick_counts_select_own_patient" ON "KickCount"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "KickCount"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
        )
    )
  );

CREATE POLICY "kick_counts_insert_own_patient" ON "KickCount"
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "KickCount"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
        )
    )
  );

CREATE POLICY "kick_counts_update_own_patient" ON "KickCount"
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "KickCount"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "Patient"
      WHERE "Patient"."id" = "KickCount"."patientId"
        AND (
          "Patient"."authId" = auth.uid()::text
          OR "Patient"."userId" IN (SELECT "id" FROM "User" WHERE "authId" = auth.uid()::text)
        )
    )
  );

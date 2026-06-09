import { describe, expect, it } from "vitest";
import { upsertBirthPlanSchema } from "../src/modules/birth-plan/birth-plan.validation.js";

describe("birth plan validation", () => {
  it("accepts a complete birth plan payload", () => {
    const result = upsertBirthPlanSchema.safeParse({
      plannedDeliveryMode: "facility_delivery",
      transportArranged: true,
      transportType: "ambulance_108",
      bloodDonorArranged: true,
      companionName: "Ravi",
      companionPhone: "+919876543210",
      emergencyContactName: "Demo Nurse",
      emergencyContactPhone: "+910000000000",
      jsyEnrolled: true,
      jsskEnrolled: true,
      notes: "Keep referral documents ready"
    });

    expect(result.success).toBe(true);
  });

  it("allows partial upserts", () => {
    const result = upsertBirthPlanSchema.safeParse({
      transportArranged: false
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid planned facility id", () => {
    const result = upsertBirthPlanSchema.safeParse({
      plannedFacility: "fac-001"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.plannedFacility).toBeDefined();
  });
});

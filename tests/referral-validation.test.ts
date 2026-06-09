import { describe, expect, it } from "vitest";
import { createReferralSchema, updateReferralSchema } from "../src/modules/referrals/referrals.validation.js";

describe("referral validation", () => {
  it("accepts a valid referral payload", () => {
    const result = createReferralSchema.safeParse({
      reason: "Severe anemia requiring higher facility review",
      clinicalFindings: "Hb 6.8 g/dL",
      treatmentGiven: "Iron counseling and urgent referral",
      status: "pending"
    });

    expect(result.success).toBe(true);
  });

  it("requires a reason when creating a referral", () => {
    const result = createReferralSchema.safeParse({
      clinicalFindings: "BP 160/110"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.reason).toBeDefined();
  });

  it("allows status-only referral updates", () => {
    const result = updateReferralSchema.safeParse({
      status: "completed",
      outcome: "Reviewed by doctor"
    });

    expect(result.success).toBe(true);
  });
});

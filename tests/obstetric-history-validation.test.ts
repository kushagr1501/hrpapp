import { describe, expect, it } from "vitest";
import {
  createObstetricHistorySchema,
  updateObstetricHistorySchema
} from "../src/modules/obstetric-history/obstetric-history.validation.js";

describe("obstetric history validation", () => {
  it("accepts a valid previous pregnancy history entry", () => {
    const result = createObstetricHistorySchema.safeParse({
      pregnancyNumber: 1,
      year: 2024,
      outcome: "live_birth",
      deliveryMode: "c_section",
      complications: "pph",
      birthWeight: 2.8,
      babyStatus: "alive"
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsupported clinical vocabulary", () => {
    const result = createObstetricHistorySchema.safeParse({
      outcome: "unknown_outcome",
      deliveryMode: "random_mode",
      complications: "unknown_complication"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.outcome).toBeDefined();
    expect(result.error?.flatten().fieldErrors.deliveryMode).toBeDefined();
    expect(result.error?.flatten().fieldErrors.complications).toBeDefined();
  });

  it("rejects impossible pregnancy numbers, years, and birth weights", () => {
    const result = createObstetricHistorySchema.safeParse({
      pregnancyNumber: 0,
      year: 1940,
      birthWeight: 9
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.pregnancyNumber).toBeDefined();
    expect(result.error?.flatten().fieldErrors.year).toBeDefined();
    expect(result.error?.flatten().fieldErrors.birthWeight).toBeDefined();
  });

  it("allows partial updates", () => {
    const result = updateObstetricHistorySchema.safeParse({
      complications: "eclampsia"
    });

    expect(result.success).toBe(true);
  });
});

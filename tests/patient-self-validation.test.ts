import { describe, expect, it } from "vitest";
import { kickCountQuerySchema, kickCountSchema } from "../src/modules/patient-self/patient-self.validation.js";

describe("patient self-service validation", () => {
  it("accepts a valid kick count payload", () => {
    const result = kickCountSchema.safeParse({
      date: "2026-06-02",
      count: 10,
      durationMinutes: 60,
      startedAt: "2026-06-02T08:00:00.000Z",
      notes: "Normal movement"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid dates and impossible counts", () => {
    const result = kickCountSchema.safeParse({
      date: "02-06-2026",
      count: -1,
      durationMinutes: 0
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.date).toBeDefined();
    expect(result.error?.flatten().fieldErrors.count).toBeDefined();
    expect(result.error?.flatten().fieldErrors.durationMinutes).toBeDefined();
  });

  it("accepts optional kick count history filters", () => {
    const result = kickCountQuerySchema.safeParse({
      from: "2026-06-01",
      to: "2026-06-30"
    });

    expect(result.success).toBe(true);
  });
});

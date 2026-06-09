import { describe, expect, it } from "vitest";
import { createVisitSchema, upcomingVisitsQuerySchema, updateVisitSchema } from "../src/modules/visit/visit.validation.js";

describe("visit validation", () => {
  it("accepts a valid scheduled follow-up visit", () => {
    const result = createVisitSchema.safeParse({
      visitType: "followup",
      visitNumber: 1,
      windowStart: "2026-06-10",
      windowEnd: "2026-06-12",
      scheduledDate: "2026-06-11",
      notes: "Routine HRP follow-up"
    });

    expect(result.success).toBe(true);
  });

  it("rejects a window that ends before it starts", () => {
    const result = createVisitSchema.safeParse({
      visitType: "followup",
      windowStart: "2026-06-12",
      windowEnd: "2026-06-10",
      scheduledDate: "2026-06-11"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.windowEnd).toContain("windowEnd must be on or after windowStart");
  });

  it("rejects a scheduled date outside the visit window", () => {
    const result = createVisitSchema.safeParse({
      visitType: "anc_2",
      windowStart: "2026-06-10",
      windowEnd: "2026-06-12",
      scheduledDate: "2026-06-13"
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.scheduledDate).toContain("scheduledDate must be on or before windowEnd");
  });

  it("allows partial update payloads with the same date-window guard", () => {
    const validResult = updateVisitSchema.safeParse({
      isCompleted: true,
      wasAccompanied: true
    });
    const invalidResult = updateVisitSchema.safeParse({
      windowStart: "2026-06-12",
      windowEnd: "2026-06-10"
    });

    expect(validResult.success).toBe(true);
    expect(invalidResult.success).toBe(false);
  });

  it("coerces upcoming visit query parameters", () => {
    const result = upcomingVisitsQuerySchema.parse({
      days: "14",
      includeOverdue: "true"
    });
    const falseResult = upcomingVisitsQuerySchema.parse({
      days: "14",
      includeOverdue: "false"
    });

    expect(result).toEqual({
      days: 14,
      includeOverdue: true
    });
    expect(falseResult).toEqual({
      days: 14,
      includeOverdue: false
    });
  });
});

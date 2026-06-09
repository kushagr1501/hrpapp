import { z } from "zod";

export const reportSummaryQuerySchema = z.object({
  facilityId: z.string().uuid().optional()
});

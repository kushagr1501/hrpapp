import { AlertStatus } from "@prisma/client";
import { z } from "zod";

export const alertParamsSchema = z.object({
  id: z.string().uuid()
});

export const alertListQuerySchema = z.object({
  status: z.nativeEnum(AlertStatus).optional()
});

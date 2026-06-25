import type { UserRole } from "@prisma/client";

export type AuthUser = {
  id: string;
  authId: string | null;
  role: UserRole | "patient";
  phone: string;
  facilityId: string | null;
};

import type { Prisma } from "@prisma/client";

export type PatientListFilters = {
  search?: string;
  status?: "registered" | "screened" | "normal" | "high_risk" | "delivered" | "post_delivery" | "closed";
  ward?: string;
  facilityId?: string;
  isHrp?: boolean;
};

export type PatientWithRelations = Prisma.PatientGetPayload<{
  include: {
    facility: true;
    assignedNurseUser: true;
  };
}>;

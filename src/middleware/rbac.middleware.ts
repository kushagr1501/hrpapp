import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { UserRole } from "@prisma/client";

/**
 * requireRole — allows only users whose role is in the allowedRoles list.
 * Patients use "patient" (string) not a Prisma UserRole, so the cast is intentional.
 */
export function requireRole(allowedRoles: (UserRole | "patient")[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(request.user.role as UserRole | "patient")) {
      return next(createHttpError(403, "You do not have permission to perform this action"));
    }

    return next();
  };
}

/**
 * requireFacilityScope — ensures the requesting user is assigned to a facility.
 * SuperAdmins are unscoped and bypass this check unconditionally.
 * All other staff (admin, nurse) must have a facilityId or they receive a 403.
 *
 * Downstream services should use `request.user.facilityId` to scope queries when
 * the caller is not a superadmin.
 */
export function requireFacilityScope(
  request: Request,
  _response: Response,
  next: NextFunction
) {
  if (!request.user) {
    return next(createHttpError(401, "Authentication required"));
  }

  // SuperAdmin has global visibility — no facility restriction
  if (request.user.role === "superadmin") {
    return next();
  }

  // Patients are scoped differently (by patient ID, not facilityId) — skip this check
  if (request.user.role === "patient") {
    return next();
  }

  // Admin and nurse must be assigned to a facility
  if (!request.user.facilityId) {
    return next(
      createHttpError(
        403,
        "Your account is not assigned to a facility. Please contact your administrator."
      )
    );
  }

  return next();
}

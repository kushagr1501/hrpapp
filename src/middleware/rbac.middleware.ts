import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import type { UserRole } from "@prisma/client";

export function requireRole(allowedRoles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(createHttpError(401, "Authentication required"));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return next(createHttpError(403, "You do not have permission to perform this action"));
    }

    return next();
  };
}

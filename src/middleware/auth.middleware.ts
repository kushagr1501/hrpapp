import type { NextFunction, Request, Response } from "express";
import createHttpError from "http-errors";
import { env } from "../config/env.js";
import { supabaseAdmin } from "../config/supabase.js";
import { prisma } from "../config/prisma.js";

async function tryDevelopmentAuth(request: Request) {
  if (env.NODE_ENV === "production" || !env.DEV_AUTH_ENABLED) {
    return false;
  }

  const devAuthKey = request.headers["x-dev-auth-key"];
  const devUserPhone = request.headers["x-dev-user-phone"];

  if (typeof devAuthKey !== "string" || typeof devUserPhone !== "string") {
    return false;
  }

  if (!env.DEV_AUTH_KEY || devAuthKey !== env.DEV_AUTH_KEY) {
    throw createHttpError(401, "Invalid development auth key");
  }

  const appUser = await prisma.user.findFirst({
    where: {
      phone: devUserPhone,
      isActive: true
    }
  });

  if (!appUser) {
    throw createHttpError(403, "Development user is not provisioned in HRP");
  }

  request.user = {
    id: appUser.id,
    authId: appUser.authId,
    role: appUser.role,
    phone: appUser.phone,
    facilityId: appUser.facilityId
  };

  return true;
}

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    const wasDevAuthed = await tryDevelopmentAuth(request);
    if (wasDevAuthed) {
      return next();
    }
    return next(createHttpError(401, "Missing bearer token"));
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    return next(createHttpError(401, "Invalid or expired token"));
  }

  const appUser = await prisma.user.findFirst({
    where: {
      authId: data.user.id,
      isActive: true
    }
  });

  if (!appUser) {
    const patientUser = await prisma.patient.findFirst({
      where: {
        authId: data.user.id
      }
    });

    if (!patientUser) {
      return next(createHttpError(403, "User is not provisioned in HRP"));
    }

    request.user = {
      id: patientUser.id,
      authId: data.user.id,
      role: "patient" as any,
      phone: patientUser.phone ?? "",
      facilityId: patientUser.facilityId
    };

    return next();
  }

  request.user = {
    id: appUser.id,
    authId: data.user.id,
    role: appUser.role,
    phone: appUser.phone,
    facilityId: appUser.facilityId
  };

  return next();
}

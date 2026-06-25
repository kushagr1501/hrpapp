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

import jwt from "jsonwebtoken";

export async function requireAuth(request: Request, _response: Response, next: NextFunction) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    const wasDevAuthed = await tryDevelopmentAuth(request);
    if (wasDevAuthed) {
      return next();
    }
    return next(createHttpError(401, "Missing bearer token"));
  }

  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // Try custom JWT first for staff
  try {
    const jwtSecret = env.JWT_SECRET || "fallback-secret-for-dev";
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (decoded && decoded.type === "custom-staff-auth") {
      const appUser = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!appUser || !appUser.isActive) {
        return next(createHttpError(403, "User is disabled or not found."));
      }
      
      request.user = {
        id: appUser.id,
        authId: appUser.authId,
        role: appUser.role,
        phone: appUser.phone,
        facilityId: appUser.facilityId
      };
      return next();
    }
  } catch (err) {
    // Not a valid custom JWT, fall back to Supabase auth for patients/existing users
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    console.error("[Auth Middleware] Supabase getUser error:", error);
    console.error("[Auth Middleware] Extracted Token (first 20 chars):", token.substring(0, 20));
    return next(createHttpError(401, "Invalid or expired token"));
  }

  // If the email ends with @patient.hrp.local, this is a patient login.
  // Check Patient table FIRST to avoid accidentally matching a nurse.
  const isPatientEmail = data.user.email?.endsWith("@patient.hrp.local");

  if (isPatientEmail) {
    const patientUser = await prisma.patient.findFirst({
      where: { authId: data.user.id }
    });

    if (!patientUser) {
      return next(createHttpError(403, "Patient is not provisioned in HRP."));
    }

    request.user = {
      id: patientUser.id,
      authId: data.user.id,
      role: "patient",
      phone: patientUser.phone ?? "",
      facilityId: patientUser.facilityId
    };

    return next();
  }

  // Staff/nurse lookup — only reached for non-patient emails.
  // Requires authId to be set during registration (no email fallback to prevent account hijacking).
  const appUser = await prisma.user.findFirst({
    where: {
      authId: data.user.id,
      isActive: true
    }
  });

  if (!appUser) {
    // Fallback: check Patient table for non-patient-email users too (e.g. manual signups)
    const patientUser = await prisma.patient.findFirst({
      where: {
        authId: data.user.id
      }
    });

    if (!patientUser) {
      return next(createHttpError(403, "User is not provisioned in HRP. Please sign up first."));
    }

    request.user = {
      id: patientUser.id,
      authId: data.user.id,
      role: "patient",
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

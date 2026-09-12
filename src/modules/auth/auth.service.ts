import { prisma } from "../../config/prisma.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { UserRole } from "@prisma/client";
import createHttpError from "http-errors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export const authService = {
  async loginWithEmail(email: string) {
    // Note: Supabase handles password verification natively. 
    // We just return a success response or we can let the client call Supabase directly.
    // However, since the current API proxies requests to Supabase, we can use signInWithPassword.
    // Wait, the client should send the password too.
  },

  // But we will implement the proxy:
  async proxyLogin(email: string, password: string) {
    // Reject patient credentials at the proxy level — patients authenticate
    // via the Supabase SDK directly on the mobile app, not through this endpoint.
    if (email.endsWith("@patient.hrp.local")) {
      throw new Error("Patients must log in using the patient app, not the staff login endpoint.");
    }

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      throw createHttpError(401, error?.message ?? "Login failed");
    }

    const appUser = await prisma.user.findFirst({
      where: {
        email,
        isActive: true
      },
      include: {
        facility: true
      }
    });

    if (!appUser) {
      return null;
    }

    // Update authId if not set
    const updatedUser = appUser.authId === data.user.id
      ? appUser
      : await prisma.user.update({
          where: { id: appUser.id },
          data: {
            authId: data.user.id
          },
          include: {
            facility: true
          }
        });

    return {
      session: data.session,
      user: updatedUser
    };
  },

  async registerStaff(
    fullName: string,
    phone: string,
    pin: string,
    role: UserRole,
    facilityId?: string,
    callerRole?: string,
    callerFacilityId?: string | null
  ) {
    // ── Role-creation enforcement ──────────────────────────────────────────────
    // Nurses cannot create any staff accounts
    if (callerRole === "nurse") {
      throw createHttpError(403, "Nurses are not permitted to register staff accounts.");
    }

    // Admins can only create nurses, auto-scoped to their own facility
    if (callerRole === "admin") {
      if (role !== "nurse") {
        throw createHttpError(403, "Admins can only register nurse accounts.");
      }
      // Force the new nurse into the admin's facility — ignore any facilityId in the body
      facilityId = callerFacilityId ?? undefined;
    }

    // Superadmin can create anyone — facilityId comes from request body
    // (already set above for admin case; for superadmin, use provided facilityId)
    // ──────────────────────────────────────────────────────────────────────────

    const pinHash = await bcrypt.hash(pin, 10);
    
    try {
      const user = await prisma.user.create({
        data: {
          fullName,
          phone,
          pinHash,
          role,
          facilityId
        }
      });
      return user;
    } catch (dbError: any) {
      if (dbError.code === 'P2002') {
        throw createHttpError(409, "Staff with this phone number already exists.");
      }
      throw dbError;
    }
  },

  async registerPatient(email: string | undefined, password: string | undefined, patientData: any) {
    let authId = null;
    
    if (email && password) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

    if (error || !data.user) {
      if (error?.message?.includes("already registered")) {
        throw createHttpError(409, "User with this email already exists.");
      }
      throw createHttpError(400, error?.message ?? "Failed to create Supabase user for patient");
    }
    authId = data.user.id;
    }

    try {
      const patient = await prisma.patient.create({
        data: {
          ...patientData,
          authId,
          email
        }
      });
      return patient;
    } catch (dbError: any) {
      if (authId) {
        await supabaseAdmin.auth.admin.deleteUser(authId);
      }
      if (dbError.code === 'P2002') {
        throw createHttpError(409, "User with this email or phone number already exists.");
      }
      throw dbError;
    }
  },

  async refresh(refreshToken: string) {
    const { data, error } = await supabaseAdmin.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (error || !data.session) {
      throw new Error(error?.message ?? "Refresh token is invalid");
    }

    return data.session;
  },

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        facility: true
      }
    });

    if (user) return user;

    const patient = await prisma.patient.findUnique({
      where: { id: userId },
      include: {
        facility: true,
        assignedNurseUser: true
      }
    });

    if (patient) {
      return {
        ...patient,
        role: "patient"
      };
    }

    return null;
  },

  async updatePushToken(userId: string, expoPushToken: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        expoPushToken
      },
      include: {
        facility: true
      }
    });
  },

  async loginWithPin(phone: string, pin: string) {
    const jwtSecret = env.JWT_SECRET || "fallback-secret-for-dev";

    // 1. Try staff (User table) first
    const staffUser = await prisma.user.findUnique({ where: { phone }, include: { facility: true } });

    if (staffUser) {
      if (!staffUser.pinHash) throw createHttpError(400, "PIN not set up for this user. Please contact admin for recovery.");

      if (staffUser.lockedUntil && new Date() < staffUser.lockedUntil) {
        throw createHttpError(429, "Account is temporarily locked. Please try again later.");
      }

      const isValid = await bcrypt.compare(pin, staffUser.pinHash);
      if (!isValid) {
        const attempts = staffUser.failedLoginAttempts + 1;
        const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await prisma.user.update({
          where: { id: staffUser.id },
          data: { failedLoginAttempts: attempts, lockedUntil }
        });
        if (lockedUntil) throw createHttpError(429, "Too many failed attempts. Account locked for 15 minutes.");
        throw createHttpError(401, "Invalid PIN");
      }

      await prisma.user.update({
        where: { id: staffUser.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });

      const token = jwt.sign(
        { id: staffUser.id, role: staffUser.role, type: "custom-staff-auth" },
        jwtSecret,
        { expiresIn: '30d' }
      );
      return { token, user: staffUser };
    }

    // 2. Fall back to Patient table
    const patient = await prisma.patient.findFirst({
      where: { phone },
      include: { facility: true, assignedNurseUser: true }
    });

    if (!patient) throw createHttpError(404, "No account found for this phone number.");
    if (!patient.pinHash) throw createHttpError(400, "PIN not set up for this patient. Please contact the clinic.");

    const isValid = await bcrypt.compare(pin, patient.pinHash);
    if (!isValid) throw createHttpError(401, "Invalid PIN");

    const token = jwt.sign(
      { id: patient.id, role: "patient", type: "custom-patient-auth" },
      jwtSecret,
      { expiresIn: '30d' }
    );
    return { token, user: { ...patient, role: "patient" as const } };
  },

  async generateRecoveryKey(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createHttpError(404, "User not found");
    
    const rawKey = Math.random().toString(36).substring(2, 10).toUpperCase();
    const hashedKey = await bcrypt.hash(rawKey, 10);
    
    await prisma.user.update({
      where: { id: user.id },
      data: { securityKeyHash: hashedKey }
    });
    return rawKey;
  },

  async resetPin(phone: string, securityKey: string, newPin: string) {
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) throw createHttpError(404, "User not found");
    if (!user.securityKeyHash) throw createHttpError(400, "No active recovery request");
    
    const isValid = await bcrypt.compare(securityKey, user.securityKeyHash);
    if (!isValid) throw createHttpError(401, "Invalid security key");
    
    const pinHash = await bcrypt.hash(newPin, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash, securityKeyHash: null, failedLoginAttempts: 0, lockedUntil: null }
    });
    return true;
  }
};

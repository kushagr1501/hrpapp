import { prisma } from "../../config/prisma.js";
import { supabaseAdmin } from "../../config/supabase.js";
import { UserRole } from "@prisma/client";
import createHttpError from "http-errors";

export const authService = {
  async loginWithEmail(email: string) {
    // Note: Supabase handles password verification natively. 
    // We just return a success response or we can let the client call Supabase directly.
    // However, since the current API proxies requests to Supabase, we can use signInWithPassword.
    // Wait, the client should send the password too.
  },

  // But we will implement the proxy:
  async proxyLogin(email: string, password: string) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });

    if (error || !data.user || !data.session) {
      throw new Error(error?.message ?? "Login failed");
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

  async registerStaff(email: string, password: string, role: UserRole, facilityId: string, fullName: string, phone: string) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error || !data.user) {
      if (error?.message?.includes("already registered")) {
        throw createHttpError(409, "User with this email already exists.");
      }
      throw createHttpError(400, error?.message ?? "Failed to create Supabase user");
    }

    try {
      const user = await prisma.user.create({
        data: {
          authId: data.user.id,
          email,
          fullName,
          phone,
          role,
          facilityId
        }
      });
      return user;
    } catch (dbError: any) {
      // Rollback Supabase auth user
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      if (dbError.code === 'P2002') {
        throw createHttpError(409, "Staff with this email or phone number already exists.");
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
        facility: true
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
  }
};

import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { patientService } from "./patient.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const patientController = {
  async list(request: Request, response: Response) {
    const nurseScopedUserId = request.user?.role === "nurse" ? request.user.id : undefined;
    const patients = await patientService.list(request.query, nurseScopedUserId);

    response.json({
      success: true,
      data: patients
    });
  },

  async create(request: Request, response: Response) {
    const parsedLmp = request.body.lmp ? new Date(request.body.lmp) : undefined;
    
    let generatedPin: string | undefined;
    let dummyEmail: string | undefined;
    let authId: string | undefined;

    // Generate credentials if phone is provided
    if (request.body.phone) {
      const phoneStr = String(request.body.phone).replace(/\D/g, '');
      generatedPin = phoneStr.length >= 4 ? phoneStr.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
      dummyEmail = `${phoneStr}@patient.hrp.local`;

      const { supabaseAdmin } = await import("../../config/supabase.js");
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: dummyEmail,
        password: generatedPin,
        email_confirm: true
      });

      if (error || !data.user) {
        console.error("Supabase auth error:", error);
        if (!error?.message?.includes("already registered")) {
          throw createHttpError(400, error?.message ?? "Failed to create Supabase user for patient");
        }
      } else {
        authId = data.user.id;
      }
    } else {
      // No phone provided — patient will need to be assigned credentials manually
    }

    try {
      const patient = await patientService.createWithInitialVisits({
        patient: {
          fullName: request.body.fullName,
          age: request.body.age,
          phone: request.body.phone,
          husbandName: request.body.husbandName,
          address: request.body.address,
          ward: request.body.ward,
          slumName: request.body.slumName,
          lmp: parsedLmp,
          gravida: request.body.gravida,
          para: request.body.para,
          mcpCardNumber: request.body.mcpCardNumber,
          status: "registered",
          authId: authId,
          email: dummyEmail,
          assignedNurseUser: request.body.assignedNurse
            ? { connect: { id: request.body.assignedNurse } }
            : request.user
              ? { connect: { id: request.user.id } }
              : undefined,
          facility: request.body.facilityId
            ? { connect: { id: request.body.facilityId } }
            : request.user?.facilityId
              ? { connect: { id: request.user.facilityId } }
              : undefined
        },
        lmp: parsedLmp,
        conductedBy: request.user?.id,
        facilityId: request.body.facilityId ?? request.user?.facilityId ?? undefined
      });

      // Credentials are returned to the nurse — do NOT log the PIN to avoid
      // exposing patient credentials in server logs / log aggregators.
      response.status(201).json({
        success: true,
        data: {
          ...patient,
          credentials: generatedPin && dummyEmail ? { email: dummyEmail, pin: generatedPin } : undefined
        }
      });
    } catch (error: any) {
      if (authId) {
        const { supabaseAdmin } = await import("../../config/supabase.js");
        // Best-effort rollback — if deleteUser fails (e.g. network timeout), log but don't
        // mask the original DB error. The orphaned Supabase user will need manual cleanup.
        await supabaseAdmin.auth.admin.deleteUser(authId).catch((deleteErr: unknown) => {
          console.error("[patient.create] Failed to rollback Supabase user after DB error:", deleteErr);
        });
      }
      if (error.code === 'P2002') {
        throw createHttpError(409, "User with this phone number already exists.");
      }
      throw error;
    }
  },

  async getById(request: Request, response: Response) {
    const patient = await patientService.getById(getRouteParam(request.params.id), request.user);

    if (!patient) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: patient
    });
  },

  async update(request: Request, response: Response) {
    const patient = await patientService.update(getRouteParam(request.params.id), {
      ...request.body,
      lmp: request.body.lmp ? new Date(request.body.lmp) : undefined
    }, request.user);

    if (!patient) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: patient
    });
  }
};

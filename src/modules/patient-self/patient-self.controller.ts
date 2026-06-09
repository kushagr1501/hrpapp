import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { patientSelfService } from "./patient-self.service.js";

function requireRequestUser(request: Request) {
  if (!request.user) {
    throw createHttpError(401, "Authentication required");
  }

  return request.user;
}

export const patientSelfController = {
  async me(request: Request, response: Response) {
    const patient = await patientSelfService.resolvePatient(requireRequestUser(request));

    if (!patient) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.json({
      success: true,
      data: patient
    });
  },

  async visits(request: Request, response: Response) {
    const visits = await patientSelfService.getVisits(requireRequestUser(request));

    if (!visits) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.json({
      success: true,
      data: visits
    });
  },

  async vitals(request: Request, response: Response) {
    const vitals = await patientSelfService.getVitals(requireRequestUser(request));

    if (!vitals) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.json({
      success: true,
      data: vitals
    });
  },

  async birthPlan(request: Request, response: Response) {
    const birthPlan = await patientSelfService.getBirthPlan(requireRequestUser(request));

    if (birthPlan === null) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.json({
      success: true,
      data: birthPlan
    });
  },

  async listKickCounts(request: Request, response: Response) {
    const kickCounts = await patientSelfService.listKickCounts(requireRequestUser(request), request.query);

    if (!kickCounts) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.json({
      success: true,
      data: kickCounts
    });
  },

  async upsertKickCount(request: Request, response: Response) {
    const kickCount = await patientSelfService.upsertKickCount(requireRequestUser(request), request.body);

    if (!kickCount) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    response.status(201).json({
      success: true,
      data: kickCount
    });
  }
};

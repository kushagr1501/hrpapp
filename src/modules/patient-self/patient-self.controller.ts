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
    const actor = requireRequestUser(request);
    const patient = await patientSelfService.resolvePatient(actor);

    if (!patient) {
      throw createHttpError(404, "Patient profile not found for current user");
    }

    const birthPlan = await patientSelfService.getBirthPlan(actor);

    // birthPlan being null just means it hasn't been created yet — return 200 with null
    // so the mobile app can show an "Add Birth Plan" empty state.
    response.json({
      success: true,
      data: birthPlan ?? null
    });
  },

};

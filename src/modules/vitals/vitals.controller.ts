import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { vitalsService } from "./vitals.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const vitalsController = {
  async record(request: Request, response: Response) {
    if (!request.user) {
      throw createHttpError(401, "Authentication required");
    }

    const result = await vitalsService.recordVisitVitals(getRouteParam(request.params.id), request.body, request.user);

    response.status(201).json({
      success: true,
      data: result
    });
  },

  async listByPatient(request: Request, response: Response) {
    const vitals = await vitalsService.listPatientVitals(getRouteParam(request.params.id), request.user);

    if (!vitals) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: vitals
    });
  }
};

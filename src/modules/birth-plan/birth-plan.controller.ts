import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { birthPlanService } from "./birth-plan.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const birthPlanController = {
  async getForPatient(request: Request, response: Response) {
    const birthPlan = await birthPlanService.getForPatient(getRouteParam(request.params.id), request.user);

    if (birthPlan === undefined) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: birthPlan
    });
  },

  async upsertForPatient(request: Request, response: Response) {
    const birthPlan = await birthPlanService.upsertForPatient(getRouteParam(request.params.id), request.body, request.user);

    if (birthPlan === undefined) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: birthPlan
    });
  }
};

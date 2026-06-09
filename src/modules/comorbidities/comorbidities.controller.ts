import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { comorbiditiesService } from "./comorbidities.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const comorbiditiesController = {
  async listForPatient(request: Request, response: Response) {
    const comorbidities = await comorbiditiesService.listForPatient(getRouteParam(request.params.id), request.user);

    if (!comorbidities) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: comorbidities
    });
  },

  async createForPatient(request: Request, response: Response) {
    const comorbidity = await comorbiditiesService.createForPatient(getRouteParam(request.params.id), request.body, request.user);

    if (!comorbidity) {
      throw createHttpError(404, "Patient not found");
    }

    response.status(201).json({
      success: true,
      data: comorbidity
    });
  },

  async update(request: Request, response: Response) {
    const comorbidity = await comorbiditiesService.update(getRouteParam(request.params.id), request.body, request.user);

    if (!comorbidity) {
      throw createHttpError(404, "Comorbidity not found");
    }

    response.json({
      success: true,
      data: comorbidity
    });
  },

  async delete(request: Request, response: Response) {
    const comorbidity = await comorbiditiesService.delete(getRouteParam(request.params.id), request.user);

    if (!comorbidity) {
      throw createHttpError(404, "Comorbidity not found");
    }

    response.json({
      success: true,
      data: {
        id: comorbidity.id
      }
    });
  }
};

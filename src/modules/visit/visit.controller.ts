import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { visitService } from "./visit.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const visitController = {
  async listForPatient(request: Request, response: Response) {
    const visits = await visitService.listForPatient(getRouteParam(request.params.id), request.user);

    if (!visits) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: visits
    });
  },

  async createForPatient(request: Request, response: Response) {
    if (!request.user) {
      throw createHttpError(401, "Authentication required");
    }

    const visit = await visitService.createForPatient(getRouteParam(request.params.id), request.body, request.user);

    if (!visit) {
      throw createHttpError(404, "Patient not found");
    }

    response.status(201).json({
      success: true,
      data: visit
    });
  },

  async update(request: Request, response: Response) {
    if (!request.user) {
      throw createHttpError(401, "Authentication required");
    }

    const visit = await visitService.update(getRouteParam(request.params.id), request.body, request.user);

    if (!visit) {
      throw createHttpError(404, "Visit not found");
    }

    response.json({
      success: true,
      data: visit
    });
  },

  async listOverdue(request: Request, response: Response) {
    const visits = await visitService.listOverdue(request.user);

    response.json({
      success: true,
      data: visits
    });
  },

  async listUpcoming(request: Request, response: Response) {
    const visits = await visitService.listUpcoming(
      request.query as unknown as { days: number; includeOverdue: boolean },
      request.user
    );

    response.json({
      success: true,
      data: visits
    });
  }
};

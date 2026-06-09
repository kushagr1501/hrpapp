import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { obstetricHistoryService } from "./obstetric-history.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const obstetricHistoryController = {
  async listForPatient(request: Request, response: Response) {
    const history = await obstetricHistoryService.listForPatient(getRouteParam(request.params.id), request.user);

    if (!history) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: history
    });
  },

  async createForPatient(request: Request, response: Response) {
    const history = await obstetricHistoryService.createForPatient(
      getRouteParam(request.params.id),
      request.body,
      request.user
    );

    if (!history) {
      throw createHttpError(404, "Patient not found");
    }

    response.status(201).json({
      success: true,
      data: history
    });
  },

  async update(request: Request, response: Response) {
    const history = await obstetricHistoryService.update(getRouteParam(request.params.id), request.body, request.user);

    if (!history) {
      throw createHttpError(404, "Obstetric history not found");
    }

    response.json({
      success: true,
      data: history
    });
  },

  async delete(request: Request, response: Response) {
    const history = await obstetricHistoryService.delete(getRouteParam(request.params.id), request.user);

    if (!history) {
      throw createHttpError(404, "Obstetric history not found");
    }

    response.json({
      success: true,
      data: {
        id: history.id
      }
    });
  }
};

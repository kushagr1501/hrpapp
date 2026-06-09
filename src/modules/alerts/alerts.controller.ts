import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { alertsService } from "./alerts.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const alertsController = {
  async list(request: Request, response: Response) {
    const alerts = await alertsService.list(request.query, request.user);

    response.json({
      success: true,
      data: alerts
    });
  },

  async acknowledge(request: Request, response: Response) {
    const alert = await alertsService.acknowledge(getRouteParam(request.params.id), request.user);

    if (!alert) {
      throw createHttpError(404, "Alert not found");
    }

    response.json({
      success: true,
      data: alert
    });
  },

  async resolve(request: Request, response: Response) {
    const alert = await alertsService.resolve(getRouteParam(request.params.id), request.user);

    if (!alert) {
      throw createHttpError(404, "Alert not found");
    }

    response.json({
      success: true,
      data: alert
    });
  }
};

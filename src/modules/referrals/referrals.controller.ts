import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { referralsService } from "./referrals.service.js";

function getRouteParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export const referralsController = {
  async listAll(request: Request, response: Response) {
    const referrals = await referralsService.listAll(request.query, request.user);

    response.json({
      success: true,
      data: referrals
    });
  },

  async listForPatient(request: Request, response: Response) {
    const referrals = await referralsService.listForPatient(getRouteParam(request.params.id), request.user);

    if (!referrals) {
      throw createHttpError(404, "Patient not found");
    }

    response.json({
      success: true,
      data: referrals
    });
  },

  async createForPatient(request: Request, response: Response) {
    const referral = await referralsService.createForPatient(getRouteParam(request.params.id), request.body, request.user);

    if (!referral) {
      throw createHttpError(404, "Patient not found");
    }

    response.status(201).json({
      success: true,
      data: referral
    });
  },

  async update(request: Request, response: Response) {
    const referral = await referralsService.update(getRouteParam(request.params.id), request.body, request.user);

    if (!referral) {
      throw createHttpError(404, "Referral not found");
    }

    response.json({
      success: true,
      data: referral
    });
  }
};

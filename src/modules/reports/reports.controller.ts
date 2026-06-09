import type { Request, Response } from "express";
import { reportsService } from "./reports.service.js";

export const reportsController = {
  async summary(request: Request, response: Response) {
    const summary = await reportsService.getSummary(request.query, request.user);

    response.json({
      success: true,
      data: summary
    });
  },

  async dashboard(request: Request, response: Response) {
    const dashboardData = await reportsService.getDashboardData(request.query, request.user);

    response.json({
      success: true,
      data: dashboardData
    });
  }
};

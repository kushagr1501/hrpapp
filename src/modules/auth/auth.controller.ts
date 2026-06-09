import type { Request, Response } from "express";
import createHttpError from "http-errors";
import { authService } from "./auth.service.js";

export const authController = {
  async login(request: Request, response: Response) {
    const { email, password } = request.body;
    const result = await authService.proxyLogin(email, password);

    if (!result) {
      throw createHttpError(403, "User is not provisioned in HRP");
    }

    response.json({
      success: true,
      message: "Login successful",
      data: {
        token: result.session.access_token,
        user: result.user
      }
    });
  },

  async registerStaff(request: Request, response: Response) {
    const { email, password, role, facilityId, fullName, phone } = request.body;
    const user = await authService.registerStaff(email, password, role, facilityId, fullName, phone);
    
    response.status(201).json({
      success: true,
      message: "Staff registered successfully",
      data: user
    });
  },

  async registerPatient(request: Request, response: Response) {
    const { email, password, ...patientData } = request.body;
    const patient = await authService.registerPatient(email, password, patientData);
    
    response.status(201).json({
      success: true,
      message: "Patient registered successfully",
      data: patient
    });
  },

  async refresh(request: Request, response: Response) {
    const session = await authService.refresh(request.body.refreshToken);

    response.json({
      success: true,
      data: {
        session
      }
    });
  },

  async me(request: Request, response: Response) {
    if (!request.user) {
      throw createHttpError(401, "Authentication required");
    }

    const user = await authService.getCurrentUser(request.user.id);
    response.json({
      success: true,
      data: user
    });
  },

  async registerPushToken(request: Request, response: Response) {
    if (!request.user) {
      throw createHttpError(401, "Authentication required");
    }

    const updatedUser = await authService.updatePushToken(request.user.id, request.body.expoPushToken);
    response.json({
      success: true,
      message: "Push token registered",
      data: {
        user: updatedUser,
        expoPushToken: request.body.expoPushToken
      }
    });
  }
};
